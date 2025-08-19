/**
 * Default configuration for EC2 start/stop schedules
 * This file contains the default schedule configuration that will be stored in AWS Parameter Store
 */

import type { SchedulesConfiguration } from './types';

/**
 * Default schedules configuration
 */
export const DEFAULT_SCHEDULES_CONFIG: SchedulesConfiguration = {
  description: `EC2 Start/Stop Automation Configuration

This configuration defines automated start/stop schedules for EC2 instances based on tags.

How it works:
• EC2 instances are tagged with 'start-stop-schedule' containing a schedule name
• The Lambda function runs every 15 minutes to check schedules
• Each schedule supports timezone-aware start/stop times for each day of the week
• Time format: 'HH:MM;HH:MM' (start;stop) or 'never;never' to skip a day
• 'default' schedule applies to days not explicitly defined

Schedule options:
• name: Unique identifier referenced by EC2 instance tags
• enabled: Boolean to activate/deactivate a schedule
• timezone: IANA timezone (e.g., 'Europe/Berlin', 'America/New_York', 'UTC')
• mo-su: Day-specific schedules (Monday through Sunday)
• default: Fallback schedule for undefined days

Examples:
• '08:00;18:00' - Start at 8 AM, stop at 6 PM
• 'never;22:00' - No start action, stop at 10 PM
• '06:00;never' - Start at 6 AM, no stop action
• 'never;never' - No actions (effectively disabled for that day)`,
  schedules: [
    {
      name: 'sps-tid-server',
      enabled: true,
      timezone: 'Europe/Berlin',
      default: '06:00;22:00',
      sa: '08:00;18:00',
      su: '08:00;22:00',
    },
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
      default: '07:00;22:00',
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
      default: '06:00;23:00',
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
      default: '09:00;17:00',
    },
  ],
  maintainers: ['not-yet@todo.com', 'todo@for-authed-ui.user'],
};
