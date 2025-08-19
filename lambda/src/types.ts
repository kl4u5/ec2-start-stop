/**
 * TypeScript interfaces for EC2 start/stop schedules
 * This is a copy of the types from the main lib for Lambda compilation
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
