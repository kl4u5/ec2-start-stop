/**
 * Schedule factory and creation utilities
 * Helper functions for creating schedule objects with proper defaults
 */

import type { Schedule } from './interfaces';

/**
 * Helper function to create a schedule with all required fields and proper defaults
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
    default: config.default,
    emails: config.emails || ['inherited'],
    phones: config.phones || ['inherited'],
  };
}
