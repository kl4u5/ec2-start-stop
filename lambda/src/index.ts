/**
 * EC2 Start/Stop Automation Lambda Function
 *
 * Automatically starts and stops EC2 instances based on configurable schedules
 * stored in AWS Parameter Store with timezone-aware scheduling.
 *
 * @author Klaus Bjorn Jensen <kl4u5.j3n53n@gmail.com>
 * @created 2025-08-19
 * @license MIT
 */

import {
  DescribeInstancesCommand,
  EC2Client,
  Instance,
  StartInstancesCommand,
  StopInstancesCommand,
} from '@aws-sdk/client-ec2';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import { DateTime } from 'luxon';

// Import types and utilities from our types module
import type { Schedule, SchedulesConfiguration } from './types';
import { resolveInheritedNotifications, validateScheduleConfig } from './types';

// Import constants
import {
  ACTIONS,
  DEFAULTS,
  EMAIL_TYPES,
  ENV_VARS,
  INSTANCE_STATES,
  LOG_LEVELS,
  SCHEDULE_VALUES,
  SEPARATORS,
  TAG_NAMES,
  TIME_FORMATS,
  WEEKDAY_KEYS,
} from './constants';

// Default clients
const defaultEc2Client = new EC2Client({});
const defaultSsmClient = new SSMClient({});
const defaultSesClient = new SESClient({});
const defaultSnsClient = new SNSClient({});

const SCHEDULES_PARAMETER_NAME = process.env[ENV_VARS.SCHEDULES_PARAMETER_NAME] || DEFAULTS.SCHEDULES_PARAMETER_NAME;

// Simple logging utility with dynamic log level
let CURRENT_LOG_LEVEL: number = LOG_LEVELS.INFO; // Default until configuration is loaded

const logger = {
  setLogLevel: (logLevel: string) => {
    CURRENT_LOG_LEVEL = LOG_LEVELS[logLevel as keyof typeof LOG_LEVELS] ?? LOG_LEVELS.INFO;
  },
  debug: (message: string, ...args: unknown[]) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: unknown[]) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: unknown[]) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.ERROR) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },
};

// Interface for dependency injection
interface Clients {
  ec2Client?: EC2Client;
  ssmClient?: SSMClient;
  sesClient?: SESClient;
  snsClient?: SNSClient;
}

// Email notification function
async function sendEmailNotifications(
  type: keyof typeof EMAIL_TYPES,
  instanceId: string,
  emails: string[],
  errorMessage?: string,
  sesClient: SESClient = defaultSesClient
): Promise<void> {
  if (emails.length === 0) {
    logger.debug(`Skipping email notification for ${type}: ${instanceId} - no email addresses configured`);
    return;
  }

  for (const email of emails) {
    await sendSingleEmailNotification(type, instanceId, email, errorMessage, sesClient);
  }
}

// Single email notification function
async function sendSingleEmailNotification(
  type: keyof typeof EMAIL_TYPES,
  instanceId: string,
  email: string,
  errorMessage?: string,
  sesClient: SESClient = defaultSesClient
): Promise<void> {
  // Skip if email is not configured
  if (!email || email.trim() === '') {
    logger.debug(`Skipping email notification for ${type}: ${instanceId} - email not configured`);
    return;
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    logger.error(`Invalid email format '${email}' - skipping email notification for ${type}: ${instanceId}`);
    return;
  }

  try {
    const timestamp = DateTime.utc().toFormat('yyyy-MM-dd HH:mm:ss z');
    let subject = '';
    let bodyText = '';

    switch (type) {
      case EMAIL_TYPES.INSTANCE_STARTED:
        subject = `✅ EC2 Instance Started: ${instanceId}`;
        bodyText = `EC2 instance ${instanceId} was successfully started at ${timestamp}.`;
        break;
      case EMAIL_TYPES.INSTANCE_STOPPED:
        subject = `🛑 EC2 Instance Stopped: ${instanceId}`;
        bodyText = `EC2 instance ${instanceId} was successfully stopped at ${timestamp}.`;
        break;
      case EMAIL_TYPES.START_FAILED:
        subject = `❌ EC2 Instance Start Failed: ${instanceId}`;
        bodyText = `Failed to start EC2 instance ${instanceId} at ${timestamp}.\n\nError: ${errorMessage}`;
        break;
      case EMAIL_TYPES.STOP_FAILED:
        subject = `❌ EC2 Instance Stop Failed: ${instanceId}`;
        bodyText = `Failed to stop EC2 instance ${instanceId} at ${timestamp}.\n\nError: ${errorMessage}`;
        break;
      default:
        return;
    }

    const command = new SendEmailCommand({
      Source: email,
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: bodyText,
            Charset: 'UTF-8',
          },
        },
      },
    });

    await sesClient.send(command);
    logger.debug(`Email notification sent for ${type}: ${instanceId} to ${email}`);
  } catch (error) {
    logger.error(`Failed to send email notification for ${type}: ${instanceId} to ${email}`, error);
  }
}

// SMS notification function
async function sendSmsNotifications(
  type: keyof typeof EMAIL_TYPES,
  instanceId: string,
  phones: string[],
  errorMessage?: string,
  snsClient: SNSClient = defaultSnsClient
): Promise<void> {
  if (phones.length === 0) {
    logger.debug(`Skipping SMS notification for ${type}: ${instanceId} - no phone numbers configured`);
    return;
  }

  // Check if we should send SMS for this notification type
  const isCriticalFailure = type === EMAIL_TYPES.START_FAILED || type === EMAIL_TYPES.STOP_FAILED;

  for (const phone of phones) {
    // Check if this specific phone should receive non-critical notifications
    const hasNonCriticalSms = phone.startsWith('!');

    // Skip non-critical notifications for phones without ! prefix
    if (!isCriticalFailure && !hasNonCriticalSms) {
      logger.debug(
        `Skipping SMS for ${type}: ${instanceId} to ${phone} - not a critical failure and phone not configured for non-critical SMS`
      );
      continue;
    }

    await sendSingleSmsNotification(type, instanceId, phone, errorMessage, snsClient);
  }
}

// Single SMS notification function
async function sendSingleSmsNotification(
  type: keyof typeof EMAIL_TYPES,
  instanceId: string,
  phone: string,
  errorMessage?: string,
  snsClient: SNSClient = defaultSnsClient
): Promise<void> {
  // Skip if phone is not configured
  if (!phone || phone.trim() === '') {
    logger.debug(`Skipping SMS notification for ${type}: ${instanceId} - phone not configured`);
    return;
  }

  // Clean the phone number (remove ! prefix for actual phone number use)
  const cleanPhone = phone.startsWith('!') ? phone.slice(1) : phone;

  // Basic phone number validation (international format)
  const phoneRegex = /^\+[1-9]\d{10,14}$/;
  if (!phoneRegex.test(cleanPhone)) {
    logger.error(
      `Invalid phone format '${cleanPhone}' - must be in format +45XXXXXXXX - skipping SMS notification for ${type}: ${instanceId}`
    );
    return;
  }

  try {
    const timestamp = DateTime.utc().toFormat('yyyy-MM-dd HH:mm:ss z');
    let message = '';

    switch (type) {
      case EMAIL_TYPES.START_FAILED:
        message = `🚨 CRITICAL: EC2 instance ${instanceId} failed to start at ${timestamp}. Error: ${errorMessage?.substring(0, 100)}${errorMessage && errorMessage.length > 100 ? '...' : ''}`;
        break;
      case EMAIL_TYPES.STOP_FAILED:
        message = `🚨 CRITICAL: EC2 instance ${instanceId} failed to stop at ${timestamp}. Error: ${errorMessage?.substring(0, 100)}${errorMessage && errorMessage.length > 100 ? '...' : ''}`;
        break;
      case EMAIL_TYPES.INSTANCE_STARTED:
        message = `✅ EC2 instance ${instanceId} started successfully at ${timestamp}`;
        break;
      case EMAIL_TYPES.INSTANCE_STOPPED:
        message = `⏹️ EC2 instance ${instanceId} stopped successfully at ${timestamp}`;
        break;
      default:
        return;
    }

    const command = new PublishCommand({
      PhoneNumber: cleanPhone,
      Message: message,
    });

    await snsClient.send(command);
    logger.debug(`SMS notification sent for ${type}: ${instanceId} to ${cleanPhone}`);
  } catch (error) {
    logger.error(`Failed to send SMS notification for ${type}: ${instanceId} to ${phone}`, error);
  }
}

export const handler = async (event: unknown, context?: unknown, clients: Clients = {}): Promise<void> => {
  // Use injected clients or defaults
  const ec2Client = clients.ec2Client || defaultEc2Client;
  const ssmClient = clients.ssmClient || defaultSsmClient;
  const sesClient = clients.sesClient || defaultSesClient;
  const snsClient = clients.snsClient || defaultSnsClient;

  logger.info('Starting EC2 start/stop scheduler...');

  try {
    // Get schedules configuration from Parameter Store
    const schedulesConfig = await getSchedulesConfig(ssmClient);

    // Configure dynamic log level from Parameter Store
    if (schedulesConfig.logLevel) {
      logger.setLogLevel(schedulesConfig.logLevel);
      logger.debug(`Log level set to: ${schedulesConfig.logLevel}`);
    }

    logger.debug(`Found ${schedulesConfig.schedules.length} schedule(s)`);

    // Get all EC2 instances with the start-stop-schedule tag
    const instances = await getTaggedInstances(ec2Client);
    logger.debug(`Found ${instances.length} tagged instance(s)`);

    if (instances.length === 0) {
      logger.debug(`No instances found with ${TAG_NAMES.START_STOP_SCHEDULE} tag`);
      return;
    }

    // Process each instance
    for (const instance of instances) {
      await processInstance(instance, schedulesConfig, ec2Client, sesClient, snsClient);
    }

    logger.info('EC2 start/stop scheduler completed successfully');
  } catch (error) {
    logger.error('Error in EC2 start/stop scheduler:', error);
    throw error;
  }
};

async function getSchedulesConfig(ssmClient: SSMClient): Promise<SchedulesConfiguration> {
  const command = new GetParameterCommand({
    Name: SCHEDULES_PARAMETER_NAME,
  });

  const response = await ssmClient.send(command);

  if (!response.Parameter?.Value) {
    throw new Error('Schedules configuration not found in Parameter Store');
  }

  const config = JSON.parse(response.Parameter.Value);

  // Validate the configuration
  if (!validateScheduleConfig(config)) {
    throw new Error('Invalid schedules configuration format in Parameter Store');
  }

  return config;
}

async function getTaggedInstances(ec2Client: EC2Client): Promise<Instance[]> {
  const command = new DescribeInstancesCommand({
    Filters: [
      {
        Name: 'tag-key',
        Values: [TAG_NAMES.START_STOP_SCHEDULE],
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

async function processInstance(
  instance: Instance,
  schedulesConfig: SchedulesConfiguration,
  ec2Client: EC2Client,
  sesClient: SESClient,
  snsClient: SNSClient
): Promise<void> {
  if (!instance.InstanceId || !instance.Tags) {
    logger.debug('Instance missing ID or tags, skipping');
    return;
  }

  // Find the schedule tag value
  const scheduleTag = instance.Tags.find(tag => tag.Key === TAG_NAMES.START_STOP_SCHEDULE);
  if (!scheduleTag?.Value) {
    logger.debug(`Instance ${instance.InstanceId} has no schedule tag value, skipping`);
    return;
  }

  // Find matching schedule (case insensitive, trimmed)
  const scheduleName = scheduleTag.Value.trim().toLowerCase();
  const schedule = schedulesConfig.schedules.find((s: Schedule) => s.name.toLowerCase() === scheduleName);

  if (!schedule) {
    logger.warn(`Instance ${instance.InstanceId} references unknown schedule '${scheduleTag.Value}', skipping`);
    return;
  }

  if (!schedule.enabled) {
    logger.debug(`Instance ${instance.InstanceId} schedule '${schedule.name}' is disabled, skipping`);
    return;
  }

  logger.debug(`Processing instance ${instance.InstanceId} with schedule '${schedule.name}'`);

  // Get current time in UTC (server should be running in UTC)
  // Using Luxon for reliable timezone conversion and DST handling
  const nowUtc = DateTime.utc();

  // Convert to the schedule's timezone
  const timeInTimezone = nowUtc.setZone(schedule.timezone);

  if (!timeInTimezone.isValid) {
    logger.error(`Instance ${instance.InstanceId} has invalid timezone '${schedule.timezone}', skipping`);
    return;
  }

  logger.debug(`Current time in ${schedule.timezone}: ${timeInTimezone.toFormat(TIME_FORMATS.LOG_TIMESTAMP)}`);

  // Get current weekday (1 = Monday, 7 = Sunday in Luxon)
  const weekday = timeInTimezone.weekday;
  const weekdayKey = WEEKDAY_KEYS[weekday - 1] as keyof Schedule;

  // Get the schedule for today
  let daySchedule = schedule[weekdayKey] as string | undefined;
  if (!daySchedule && schedule.default) {
    daySchedule = schedule.default;
  }

  if (!daySchedule) {
    logger.debug(`Instance ${instance.InstanceId} has no schedule for ${weekdayKey}, skipping`);
    return;
  }

  // Parse the day schedule (format: "start;stop" or "never;stop" or "start;never")
  const scheduleInfo = parseDaySchedule(daySchedule);

  // Check if any action should be triggered now
  const currentTime = timeInTimezone.toFormat(TIME_FORMATS.SCHEDULE_TIME);

  const shouldStart = shouldTriggerStartAction(currentTime, scheduleInfo.startTime, scheduleInfo.stopTime);
  const shouldStop = shouldTriggerStopAction(currentTime, scheduleInfo.startTime, scheduleInfo.stopTime);

  // Resolve notifications for this schedule
  const { emails, phones } = resolveInheritedNotifications(schedule, schedulesConfig);

  if (shouldStart) {
    logger.info(
      `Should START instance ${instance.InstanceId} at ${currentTime} (start: ${scheduleInfo.startTime}, stop: ${scheduleInfo.stopTime})`
    );
    await executeAction(instance, ACTIONS.START, emails, phones, ec2Client, sesClient, snsClient);
  } else if (shouldStop) {
    logger.info(
      `Should STOP instance ${instance.InstanceId} at ${currentTime} (start: ${scheduleInfo.startTime}, stop: ${scheduleInfo.stopTime})`
    );
    await executeAction(instance, ACTIONS.STOP, emails, phones, ec2Client, sesClient, snsClient);
  } else {
    logger.debug(
      `No action needed for instance ${instance.InstanceId}: current time ${currentTime}, schedule ${daySchedule}`
    );
  }
}

interface ScheduleInfo {
  startTime: string;
  stopTime: string;
}

function parseDaySchedule(schedule: string): ScheduleInfo {
  // Handle different separators (, or ;)
  const parts = schedule.includes(SEPARATORS.SCHEDULE_PARTS)
    ? schedule.split(SEPARATORS.SCHEDULE_PARTS)
    : schedule.split(SEPARATORS.SCHEDULE_PARTS_ALT);

  if (parts.length === 2) {
    const [startTime, stopTime] = parts.map(p => p.trim());
    return {
      startTime: startTime,
      stopTime: stopTime,
    };
  }

  return {
    startTime: SCHEDULE_VALUES.NEVER,
    stopTime: SCHEDULE_VALUES.NEVER,
  };
}

/**
 * Determines if an instance should be started based on the schedule and current time.
 * Start if: scheduledStartTime != never AND scheduledStartTime <= currentTime AND (scheduledStopTime > currentTime OR scheduledStopTime == never)
 */
function shouldTriggerStartAction(currentTime: string, scheduledStartTime: string, scheduledStopTime: string): boolean {
  // Don't start if start time is never
  if (scheduledStartTime === SCHEDULE_VALUES.NEVER) {
    return false;
  }

  // Don't start if current time is before start time
  if (currentTime < scheduledStartTime) {
    return false;
  }

  // Don't start if stop time is defined and current time is past stop time
  if (scheduledStopTime !== SCHEDULE_VALUES.NEVER && currentTime >= scheduledStopTime) {
    return false;
  }

  return true;
}

/**
 * Determines if an instance should be stopped based on the schedule and current time.
 * Stop if: scheduledStartTime == never OR (scheduledStopTime != never AND scheduledStopTime <= currentTime)
 */
function shouldTriggerStopAction(currentTime: string, scheduledStartTime: string, scheduledStopTime: string): boolean {
  // Stop if there's no start time (should always be stopped)
  if (scheduledStartTime === SCHEDULE_VALUES.NEVER) {
    return true;
  }

  // Stop if stop time is defined and current time is past stop time
  if (scheduledStopTime !== SCHEDULE_VALUES.NEVER && currentTime >= scheduledStopTime) {
    return true;
  }

  return false;
}

async function executeAction(
  instance: Instance,
  action: 'start' | 'stop',
  emails: string[],
  phones: string[],
  ec2Client: EC2Client,
  sesClient: SESClient,
  snsClient: SNSClient
): Promise<void> {
  if (!instance.InstanceId) {
    return;
  }

  const instanceState = instance.State?.Name;
  logger.debug(`Instance ${instance.InstanceId} current state: ${instanceState}, requested action: ${action}`);

  if (
    action === ACTIONS.START &&
    (instanceState === INSTANCE_STATES.STOPPED || instanceState === INSTANCE_STATES.STOPPING)
  ) {
    logger.info(`Starting instance ${instance.InstanceId}`);

    const command = new StartInstancesCommand({
      InstanceIds: [instance.InstanceId],
    });

    try {
      await ec2Client.send(command);
      logger.info(`Successfully started instance ${instance.InstanceId}`);
      await sendEmailNotifications(EMAIL_TYPES.INSTANCE_STARTED, instance.InstanceId, emails, undefined, sesClient);
      await sendSmsNotifications(EMAIL_TYPES.INSTANCE_STARTED, instance.InstanceId, phones, undefined, snsClient);
    } catch (error) {
      logger.error(`Failed to start instance ${instance.InstanceId}:`, error);
      await sendEmailNotifications(EMAIL_TYPES.START_FAILED, instance.InstanceId, emails, String(error), sesClient);
      await sendSmsNotifications(EMAIL_TYPES.START_FAILED, instance.InstanceId, phones, String(error), snsClient);
    }
  } else if (
    action === ACTIONS.STOP &&
    (instanceState === INSTANCE_STATES.RUNNING || instanceState === INSTANCE_STATES.PENDING)
  ) {
    logger.info(`Stopping instance ${instance.InstanceId}`);

    const command = new StopInstancesCommand({
      InstanceIds: [instance.InstanceId],
    });

    try {
      await ec2Client.send(command);
      logger.info(`Successfully stopped instance ${instance.InstanceId}`);
      await sendEmailNotifications(EMAIL_TYPES.INSTANCE_STOPPED, instance.InstanceId, emails, undefined, sesClient);
      await sendSmsNotifications(EMAIL_TYPES.INSTANCE_STOPPED, instance.InstanceId, phones, undefined, snsClient);
    } catch (error) {
      logger.error(`Failed to stop instance ${instance.InstanceId}:`, error);
      await sendEmailNotifications(EMAIL_TYPES.STOP_FAILED, instance.InstanceId, emails, String(error), sesClient);
      await sendSmsNotifications(EMAIL_TYPES.STOP_FAILED, instance.InstanceId, phones, String(error), snsClient);
    }
  } else {
    logger.debug(
      `Instance ${instance.InstanceId} already in correct state for action ${action} (current: ${instanceState})`
    );
  }
}
