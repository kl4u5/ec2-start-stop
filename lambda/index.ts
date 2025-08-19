import { EC2Client, DescribeInstancesCommand, StartInstancesCommand, StopInstancesCommand, Instance } from '@aws-sdk/client-ec2';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

interface Schedule {
  name: string;
  enabled: boolean;
  timezone: string;
  mo?: string;
  tu?: string;
  we?: string;
  th?: string;
  fr?: string;
  sa?: string;
  su?: string;
  default?: string;
}

interface SchedulesConfig {
  schedules: Schedule[];
  maintainers: string[];
}

interface TimeAction {
  time: string;
  action: 'start' | 'stop';
}

const ec2Client = new EC2Client({});
const ssmClient = new SSMClient({});

const SCHEDULES_PARAMETER_NAME = process.env.SCHEDULES_PARAMETER_NAME || '/ec2-start-stop/schedules';
const TOLERANCE_MINUTES = 2;

export const handler = async (event: any): Promise<void> => {
  console.log('Starting EC2 start/stop scheduler...');
  
  try {
    // Get schedules configuration from Parameter Store
    const schedulesConfig = await getSchedulesConfig();
    console.log(`Found ${schedulesConfig.schedules.length} schedule(s)`);

    // Get all EC2 instances with the start-stop-schedule tag
    const instances = await getTaggedInstances();
    console.log(`Found ${instances.length} tagged instance(s)`);

    if (instances.length === 0) {
      console.log('No instances found with start-stop-schedule tag');
      return;
    }

    // Process each instance
    for (const instance of instances) {
      await processInstance(instance, schedulesConfig);
    }

    console.log('EC2 start/stop scheduler completed successfully');
  } catch (error) {
    console.error('Error in EC2 start/stop scheduler:', error);
    throw error;
  }
};

async function getSchedulesConfig(): Promise<SchedulesConfig> {
  const command = new GetParameterCommand({
    Name: SCHEDULES_PARAMETER_NAME,
  });

  const response = await ssmClient.send(command);
  
  if (!response.Parameter?.Value) {
    throw new Error('Schedules configuration not found in Parameter Store');
  }

  return JSON.parse(response.Parameter.Value);
}

async function getTaggedInstances(): Promise<Instance[]> {
  const command = new DescribeInstancesCommand({
    Filters: [
      {
        Name: 'tag-key',
        Values: ['start-stop-schedule'],
      },
    ],
  });

  const response = await ec2Client.send(command);
  const instances: Instance[] = [];

  if (response.Reservations) {
    for (const reservation of response.Reservations) {
      if (reservation.Instances) {
        instances.push(...reservation.Instances);
      }
    }
  }

  return instances;
}

async function processInstance(instance: Instance, schedulesConfig: SchedulesConfig): Promise<void> {
  if (!instance.InstanceId || !instance.Tags) {
    console.log('Instance missing ID or tags, skipping');
    return;
  }

  // Find the schedule tag value
  const scheduleTag = instance.Tags.find(tag => tag.Key === 'start-stop-schedule');
  if (!scheduleTag?.Value) {
    console.log(`Instance ${instance.InstanceId} has no schedule tag value, skipping`);
    return;
  }

  // Find matching schedule (case insensitive, trimmed)
  const scheduleName = scheduleTag.Value.trim().toLowerCase();
  const schedule = schedulesConfig.schedules.find(s => s.name.toLowerCase() === scheduleName);

  if (!schedule) {
    console.log(`Instance ${instance.InstanceId} references unknown schedule '${scheduleTag.Value}', skipping`);
    return;
  }

  if (!schedule.enabled) {
    console.log(`Instance ${instance.InstanceId} schedule '${schedule.name}' is disabled, skipping`);
    return;
  }

  console.log(`Processing instance ${instance.InstanceId} with schedule '${schedule.name}'`);

  // Get current time in the schedule's timezone
  const now = new Date();
  const timeInTimezone = new Date(now.toLocaleString('en-US', { timeZone: schedule.timezone }));
  
  // Get current weekday (0 = Sunday, 1 = Monday, etc.)
  const weekday = timeInTimezone.getDay();
  const weekdayKeys = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'];
  const weekdayKey = weekdayKeys[weekday] as keyof Schedule;

  // Get the schedule for today
  let daySchedule = schedule[weekdayKey] as string | undefined;
  if (!daySchedule && schedule.default) {
    daySchedule = schedule.default;
  }

  if (!daySchedule) {
    console.log(`Instance ${instance.InstanceId} has no schedule for ${weekdayKey}, skipping`);
    return;
  }

  // Parse the day schedule (format: "start;stop" or "never;stop" or "start;never")
  const timeActions = parseDaySchedule(daySchedule);
  
  // Check if any action should be triggered now
  const currentTime = `${timeInTimezone.getHours().toString().padStart(2, '0')}:${timeInTimezone.getMinutes().toString().padStart(2, '0')}`;
  
  for (const timeAction of timeActions) {
    if (shouldTriggerAction(currentTime, timeAction.time)) {
      await executeAction(instance, timeAction.action);
    }
  }
}

function parseDaySchedule(schedule: string): TimeAction[] {
  const actions: TimeAction[] = [];
  
  // Handle different separators (, or ;)
  const parts = schedule.includes(';') ? schedule.split(';') : schedule.split(',');
  
  if (parts.length === 2) {
    const [startTime, stopTime] = parts.map(p => p.trim());
    
    if (startTime !== 'never' && startTime) {
      actions.push({ time: startTime, action: 'start' });
    }
    
    if (stopTime !== 'never' && stopTime) {
      actions.push({ time: stopTime, action: 'stop' });
    }
  }

  return actions;
}

function shouldTriggerAction(currentTime: string, scheduledTime: string): boolean {
  const [currentHour, currentMinute] = currentTime.split(':').map(Number);
  const [scheduledHour, scheduledMinute] = scheduledTime.split(':').map(Number);

  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const scheduledTotalMinutes = scheduledHour * 60 + scheduledMinute;

  const diff = Math.abs(currentTotalMinutes - scheduledTotalMinutes);
  
  return diff <= TOLERANCE_MINUTES;
}

async function executeAction(instance: Instance, action: 'start' | 'stop'): Promise<void> {
  if (!instance.InstanceId) {
    return;
  }

  const instanceState = instance.State?.Name;
  console.log(`Instance ${instance.InstanceId} current state: ${instanceState}, requested action: ${action}`);

  if (action === 'start' && (instanceState === 'stopped' || instanceState === 'stopping')) {
    console.log(`Starting instance ${instance.InstanceId}`);
    
    const command = new StartInstancesCommand({
      InstanceIds: [instance.InstanceId],
    });
    
    try {
      await ec2Client.send(command);
      console.log(`Successfully started instance ${instance.InstanceId}`);
    } catch (error) {
      console.error(`Failed to start instance ${instance.InstanceId}:`, error);
    }
  } else if (action === 'stop' && (instanceState === 'running' || instanceState === 'pending')) {
    console.log(`Stopping instance ${instance.InstanceId}`);
    
    const command = new StopInstancesCommand({
      InstanceIds: [instance.InstanceId],
    });
    
    try {
      await ec2Client.send(command);
      console.log(`Successfully stopped instance ${instance.InstanceId}`);
    } catch (error) {
      console.error(`Failed to stop instance ${instance.InstanceId}:`, error);
    }
  } else {
    console.log(`Instance ${instance.InstanceId} already in correct state for action ${action} (current: ${instanceState})`);
  }
}
