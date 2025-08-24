/**
 * Schedule validation utilities
 * Comprehensive validation for schedule configurations and individual components
 */

import { WEEKDAY_KEYS } from './constants';
import type { Schedule, SchedulesConfiguration } from './interfaces';

/**
 * Validates a complete schedule configuration
 */
export function validateScheduleConfig(config: unknown): config is SchedulesConfiguration {
  if (!config || typeof config !== 'object') {
    return false;
  }

  const obj = config as Record<string, unknown>;

  if (!Array.isArray(obj.schedules)) {
    return false;
  }

  // Validate master notification arrays
  if (obj.masterEmails !== undefined) {
    if (!Array.isArray(obj.masterEmails)) return false;
    for (const email of obj.masterEmails) {
      if (typeof email !== 'string' || !isValidEmail(email)) return false;
    }
  }

  if (obj.masterPhones !== undefined) {
    if (!Array.isArray(obj.masterPhones)) return false;
    for (const phone of obj.masterPhones) {
      if (typeof phone !== 'string' || !isValidPhone(phone)) return false;
    }
  }

  // Validate log level
  if (obj.logLevel !== undefined) {
    if (typeof obj.logLevel !== 'string') return false;
    const validLogLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    if (!validLogLevels.includes(obj.logLevel)) return false;
  }

  // Validate each schedule
  for (const schedule of obj.schedules) {
    if (!validateSchedule(schedule)) {
      return false;
    }
  }

  return true;
}

/**
 * Validates a single schedule
 */
export function validateSchedule(schedule: unknown): schedule is Schedule {
  if (!schedule || typeof schedule !== 'object') {
    return false;
  }

  const obj = schedule as Record<string, unknown>;

  if (typeof obj.name !== 'string' || (obj.name as string).trim() === '') {
    return false;
  }

  if (typeof obj.enabled !== 'boolean') {
    return false;
  }

  if (typeof obj.timezone !== 'string' || (obj.timezone as string).trim() === '') {
    return false;
  }

  // Validate time format for each day if present
  const timeFields = [...WEEKDAY_KEYS, 'default'];
  for (const field of timeFields) {
    if (obj[field] !== undefined) {
      if (!validateTimeFormat(obj[field] as string)) {
        return false;
      }
    }
  }

  // Validate notification arrays
  if (!validateNotificationArrays(obj as unknown as Schedule)) {
    return false;
  }

  return true;
}

/**
 * Validates notification arrays in a schedule
 */
export function validateNotificationArrays(schedule: Schedule): boolean {
  if (schedule.emails) {
    if (!Array.isArray(schedule.emails)) return false;
    for (const email of schedule.emails) {
      if (typeof email !== 'string') return false;
      if (email !== 'inherited' && !isValidEmail(email)) return false;
    }
  }

  if (schedule.phones) {
    if (!Array.isArray(schedule.phones)) return false;
    for (const phone of schedule.phones) {
      if (typeof phone !== 'string') return false;
      if (phone !== 'inherited' && !isValidPhone(phone)) return false;
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
 * Validates email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates phone format (supports '!' prefix for non-critical SMS)
 */
function isValidPhone(phone: string): boolean {
  // Regex allows optional '!' prefix, then +[1-9] followed by 9-14 more digits
  const phoneRegex = /^!?\+[1-9]\d{9,14}$/;
  return phoneRegex.test(phone);
}
