/**
 * Default configuration for EC2 start/stop schedules
 * This file contains the default schedule configuration that will be stored in AWS Parameter Store
 */

import { DEFAULTS } from './constants';
import type { SchedulesConfiguration } from './types';

/**
 * Detailed documentation for the EC2 start/stop automation system
 */
export const DEFAULT_DOCUMENTATION = `EC2 Start/Stop Automation Configuration

The ${DEFAULTS.SCHEDULES_PARAMETER_NAME} parameter defines configuration for automated start/stop schedules for EC2 instances based on tags.

How it works:
• EC2 instances are tagged with 'start-stop-schedule' containing a schedule name
• A Lambda function runs at 00, 15, 30, and 45 minutes past each hour to check schedules
• Each schedule supports timezone-aware start/stop times for each day of the week
• Time format: 'HH:MM;HH:MM' (start;stop) or 'never;never' to skip a day
• 'default' schedule applies to days not explicitly defined
• Note: Since it runs every 15 minutes, time schedules should be defined accordingly. So a time of 07:17 will not trigger any action before 07:30 and so on.

EC2 Instance Tagging:
To enable automation for an EC2 instance, add the following tag to it:
• Key: 'start-stop-schedule'
• Value: The name of a schedule defined in the configuration (e.g., 'sps-tid-server', 'test-environment')

Notes:
• Tag values are case-insensitive and whitespace is trimmed
• Only instances with this exact tag key will be processed
• Invalid or missing schedule names will be skipped with a log message
• Disabled schedules (enabled: false) will be ignored


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
• 'never;never' - No actions (effectively disabled for that day)

Configuration Structure:
{
  "description": "Brief description with reference to documentation parameter",
  "schedules": [...],
  "maintainers": [...]
}
`;

/**
 * Default schedules configuration
 */
export const DEFAULT_SCHEDULES_CONFIG: SchedulesConfiguration = {
  description: `EC2 Start/Stop Automation - see ${DEFAULTS.DOCUMENTATION_PARAMETER_NAME} for detailed documentation`,
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
      name: 'test-environment',
      enabled: true,
      timezone: 'America/New_York',
      sa: 'never;never',
      su: 'never;never',
      default: '09:00;17:00',
    },
    {
      name: 'example-servers',
      enabled: true,
      timezone: 'UTC',
      mo: '06:00;23:00',
      tu: '07:00;23:00',
      we: '08:00;23:00',
      th: '09:00;23:00',
      fr: '10:00;23:00',
      sa: '11:00;20:00',
      su: '12:00;18:00',
      default: '06:00;23:00',
    },
  ],
  maintainers: ['not-yet@todo.com'],
};
