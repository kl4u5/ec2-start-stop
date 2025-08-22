/**
 * TypeScript interfaces for EC2 start/stop schedules
 * Pure type definitions without any implementation logic
 */

import { ACTIONS } from './constants';

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
  /**
   * Email addresses for notifications. Can include 'inherited' to merge with master emails.
   * Default: ['inherited']
   */
  emails?: string[];
  /**
   * Phone numbers for SMS notifications. Can include 'inherited' to merge with master phones.
   * Prefix with '!' for non-critical SMS notifications (e.g., '!+45XXXXXXXX').
   * Default: ['inherited']
   */
  phones?: string[];
}

export interface SchedulesConfiguration {
  /** Array of schedule definitions */
  schedules: Schedule[];
  /** Optional description of the configuration and its purpose */
  description?: string;
  /**
   * Master email addresses that can be inherited by schedules.
   * Default: [] (no notifications)
   */
  masterEmails?: string[];
  /**
   * Master phone numbers that can be inherited by schedules.
   * Prefix with '!' for non-critical SMS notifications.
   * Default: [] (no notifications)
   */
  masterPhones?: string[];
  /**
   * Log level for the Lambda function: 'DEBUG', 'INFO', 'WARN', 'ERROR'.
   * Default: 'INFO'
   */
  logLevel?: string;
}

export interface TimeAction {
  /** Time in HH:MM format */
  time: string;
  /** Action to perform: start or stop */
  action: typeof ACTIONS.START | typeof ACTIONS.STOP;
}

/**
 * Result of resolving inherited notifications for a schedule
 */
export interface ResolvedNotifications {
  /** Resolved email addresses (duplicates removed) */
  emails: string[];
  /** Resolved phone numbers (with ! prefix preserved, duplicates removed) */
  phones: string[];
}
