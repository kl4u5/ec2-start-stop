/**
 * Barrel exports for cleaner imports
 * Re-exports all interfaces and utilities from the modular files
 */

// Type definitions
export type { ResolvedNotifications, Schedule, SchedulesConfiguration, TimeAction } from './interfaces';

// Validation utilities
export {
  validateNotificationArrays,
  validateSchedule,
  validateScheduleConfig,
  validateSingleTime,
  validateTimeFormat,
} from './validation';

// Notification resolution
export { resolveInheritedNotifications } from './notification-resolver';

// Schedule creation utilities
export { createSchedule } from './schedule-factory';
