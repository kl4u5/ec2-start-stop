/**
 * Notification inheritance resolver
 * Handles the complex logic of inheriting and merging notifications from master configuration
 */

import type { ResolvedNotifications, Schedule, SchedulesConfiguration } from './interfaces';

/**
 * Resolves inherited notifications for a schedule by merging with master values
 */
export function resolveInheritedNotifications(
  schedule: Schedule,
  config: SchedulesConfiguration
): ResolvedNotifications {
  const emails = resolveInheritedArray(schedule.emails || ['inherited'], config.masterEmails || []);
  const phones = resolveInheritedArray(schedule.phones || ['inherited'], config.masterPhones || []);

  return {
    emails: [...new Set(emails)], // Remove duplicates
    phones: [...new Set(phones)], // Remove duplicates but keep ! prefix intact
  };
}

/**
 * Resolves inheritance for an array, merging with master values and handling duplicates
 */
function resolveInheritedArray(localArray: string[], masterArray: string[]): string[] {
  if (!localArray.includes('inherited')) {
    return localArray;
  }

  // Remove 'inherited' and merge with master values
  const withoutInherited = localArray.filter(item => item !== 'inherited');
  const merged = [...masterArray, ...withoutInherited];

  // Handle '!' prefix priority - if both !+45XXX and +45XXX exist, keep !+45XXX
  const phoneMap = new Map<string, string>();
  merged.forEach(item => {
    if (item.startsWith('!')) {
      const cleanPhone = item.substring(1);
      phoneMap.set(cleanPhone, item); // '!' version wins
    } else if (!phoneMap.has(item)) {
      phoneMap.set(item, item);
    }
  });

  return Array.from(phoneMap.values());
}
