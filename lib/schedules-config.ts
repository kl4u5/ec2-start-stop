/**
 * TypeScript interfaces and default configuration for EC2 start/stop schedules
 */

export interface Schedule {
  /** Unique name identifier for the schedule */
  name: string;
  /** Whether this schedule is enabled */
  enabled: boolean;
  /** IANA timezone name (e.g., 'Europe/Berlin', 'America/New_York') */
  timezone: string;
  /** Monday schedule in format 'HH:MM;HH:MM' or 'never;HH:MM' or 'HH:MM;never' */
  mo?: string;
  /** Tuesday schedule in format 'HH:MM;HH:MM' or 'never;HH:MM' or 'HH:MM;never' */
  tu?: string;
  /** Wednesday schedule in format 'HH:MM;HH:MM' or 'never;HH:MM' or 'HH:MM;never' */
  we?: string;
  /** Thursday schedule in format 'HH:MM;HH:MM' or 'never;HH:MM' or 'HH:MM;never' */
  th?: string;
  /** Friday schedule in format 'HH:MM;HH:MM' or 'never;HH:MM' or 'HH:MM;never' */
  fr?: string;
  /** Saturday schedule in format 'HH:MM;HH:MM' or 'never;HH:MM' or 'HH:MM;never' */
  sa?: string;
  /** Sunday schedule in format 'HH:MM;HH:MM' or 'never;HH:MM' or 'HH:MM;never' */
  su?: string;
  /** Default schedule used for days not explicitly defined */
  default?: string;
}

export interface SchedulesConfiguration {
  /** Array of schedule definitions */
  schedules: Schedule[];
  /** Email addresses of users who can manage schedules via web UI */
  maintainers: string[];
}

export interface TimeAction {
  /** Time in HH:MM format */
  time: string;
  /** Action to perform: start or stop */
  action: 'start' | 'stop';
}

/**
 * Default schedules configuration
 */
export const DEFAULT_SCHEDULES_CONFIG: SchedulesConfiguration = {
  schedules: [
    {
      name: 'dev-servers',
      enabled: true,
      timezone: 'Europe/Berlin',
      mo: '07:00;22:00',
      tu: '07:00;22:00',
      we: '07:00;22:00',
      th: '07:00;22:00',
      fr: '07:00;22:00',
      sa: 'never;never',
      su: 'never;never',
      default: '07:00;22:00'
    },
    {
      name: 'production-servers',
      enabled: true,
      timezone: 'UTC',
      mo: '06:00;23:00',
      tu: '06:00;23:00',
      we: '06:00;23:00',
      th: '06:00;23:00',
      fr: '06:00;23:00',
      sa: '08:00;20:00',
      su: '10:00;18:00',
      default: '06:00;23:00'
    },
    {
      name: 'test-environment',
      enabled: false,
      timezone: 'America/New_York',
      mo: '09:00;17:00',
      tu: '09:00;17:00',
      we: '09:00;17:00',
      th: '09:00;17:00',
      fr: '09:00;17:00',
      sa: 'never;never',
      su: 'never;never',
      default: '09:00;17:00'
    }
  ],
  maintainers: [
    'admin@example.com',
    'devops@example.com'
  ]
};

/**
 * Validates a schedule configuration
 */
export function validateScheduleConfig(config: any): config is SchedulesConfiguration {
  if (!config || typeof config !== 'object') {
    return false;
  }

  if (!Array.isArray(config.schedules)) {
    return false;
  }

  if (!Array.isArray(config.maintainers)) {
    return false;
  }

  // Validate each schedule
  for (const schedule of config.schedules) {
    if (!validateSchedule(schedule)) {
      return false;
    }
  }

  return true;
}

/**
 * Validates a single schedule
 */
export function validateSchedule(schedule: any): schedule is Schedule {
  if (!schedule || typeof schedule !== 'object') {
    return false;
  }

  if (typeof schedule.name !== 'string' || schedule.name.trim() === '') {
    return false;
  }

  if (typeof schedule.enabled !== 'boolean') {
    return false;
  }

  if (typeof schedule.timezone !== 'string' || schedule.timezone.trim() === '') {
    return false;
  }

  // Validate time format for each day if present
  const timeFields = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su', 'default'];
  for (const field of timeFields) {
    if (schedule[field] !== undefined) {
      if (!validateTimeFormat(schedule[field])) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Validates time format: 'HH:MM;HH:MM' or 'never;HH:MM' or 'HH:MM;never' or 'never;never'
 */
export function validateTimeFormat(timeString: string): boolean {
  if (typeof timeString !== 'string') {
    return false;
  }

  // Handle different separators (, or ;)
  const parts = timeString.includes(';') ? timeString.split(';') : timeString.split(',');
  
  if (parts.length !== 2) {
    return false;
  }

  const [startTime, stopTime] = parts.map(p => p.trim());

  return validateSingleTime(startTime) && validateSingleTime(stopTime);
}

/**
 * Validates a single time: 'HH:MM' or 'never'
 */
export function validateSingleTime(time: string): boolean {
  if (time === 'never') {
    return true;
  }

  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Helper function to create a schedule with all required fields
 */
export function createSchedule(config: Partial<Schedule> & Pick<Schedule, 'name' | 'enabled' | 'timezone'>): Schedule {
  return {
    name: config.name,
    enabled: config.enabled,
    timezone: config.timezone,
    mo: config.mo,
    tu: config.tu,
    we: config.we,
    th: config.th,
    fr: config.fr,
    sa: config.sa,
    su: config.su,
    default: config.default
  };
}
