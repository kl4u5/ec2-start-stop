/**
 * Constants used throughout the EC2 start/stop Lambda function
 */

// Environment variable names
export const ENV_VARS = {
  SCHEDULES_PARAMETER_NAME: 'SCHEDULES_PARAMETER_NAME',
  DOCUMENTATION_PARAMETER_NAME: 'DOCUMENTATION_PARAMETER_NAME',
  SES_REGION: 'SES_REGION',
  SNS_REGION: 'SNS_REGION',
} as const;

// Default values
export const DEFAULTS = {
  SCHEDULES_PARAMETER_NAME: '/ec2-start-stop/schedules',
  DOCUMENTATION_PARAMETER_NAME: '/ec2-start-stop/documentation',
} as const;

// Log levels
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const;

// AWS tag names
export const TAG_NAMES = {
  START_STOP_SCHEDULE: 'start-stop-schedule',
} as const;

// Time format strings
export const TIME_FORMATS = {
  LOG_TIMESTAMP: 'yyyy-MM-dd HH:mm:ss z',
  SCHEDULE_TIME: 'HH:mm',
} as const;

// Schedule values
export const SCHEDULE_VALUES = {
  NEVER: 'never',
} as const;

// Separators
export const SEPARATORS = {
  SCHEDULE_PARTS: ';',
  SCHEDULE_PARTS_ALT: ',',
  TIME_PARTS: ':',
} as const;

// Instance states
export const INSTANCE_STATES = {
  RUNNING: 'running',
  STOPPED: 'stopped',
  PENDING: 'pending',
  STOPPING: 'stopping',
} as const;

// Email notification types
export const EMAIL_TYPES = {
  INSTANCE_STARTED: 'INSTANCE_STARTED',
  INSTANCE_STOPPED: 'INSTANCE_STOPPED',
  START_FAILED: 'START_FAILED',
  STOP_FAILED: 'STOP_FAILED',
} as const;

// Actions
export const ACTIONS = {
  START: 'start',
  STOP: 'stop',
} as const;

// Weekday keys (matching Schedule interface)
export const WEEKDAY_KEYS = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'] as const;
