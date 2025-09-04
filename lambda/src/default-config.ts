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

Logging Configuration:
The Lambda function supports configurable log levels via the configuration:
• DEBUG: All debug information, processing details, and state checks
• INFO: Important actions (start/stop commands), schedule detection, and summary information (default)
• WARN: Warnings about configuration issues or unknown schedules
• ERROR: Only critical errors and failures

Set logLevel to 'DEBUG' for detailed troubleshooting or 'ERROR' for minimal logging.
Changes take effect immediately without redeployment.


Schedule options:
• name: Unique identifier referenced by EC2 instance tags
• enabled: Boolean to activate/deactivate a schedule
• timezone: IANA timezone (e.g., 'Europe/Berlin', 'America/New_York', 'UTC')
• mo-su: Day-specific schedules (Monday through Sunday)
• default: Fallback schedule for undefined days
• emails: Array of email addresses for notifications (supports 'inherited')
• phones: Array of phone numbers for SMS notifications (supports 'inherited' and '!' prefix)

Examples:
• '08:00;18:00' - Start at 8 AM, stop at 6 PM
• 'never;22:00' - No start action, stop at 10 PM
• '06:00;never' - Start at 6 AM, no stop action
• 'never;never' - No actions (effectively disabled for that day)

Notification Examples:
• emails: ['inherited'] - Use master email list
• emails: ['inherited', 'team@company.com'] - Inherit master + add specific email
• emails: ['specific@company.com'] - Override with specific email only
• phones: ['inherited'] - Use master phone list (critical failures only)
• phones: ['!+45XXXXXXXX'] - Receive all notifications (including non-critical)
• phones: ['+45XXXXXXXX'] - Receive critical failures only

Configuration Structure:
{
  "description": "Brief description with reference to documentation parameter",
  "logLevel": "INFO",
  "masterEmails": ["admin@company.com"],
  "masterPhones": ["!+45XXXXXXXX"],
  "schedules": [...]
}

Notification Configuration:
• emails: Array of email addresses, can include 'inherited'
• phones: Array of phone numbers, can include 'inherited'
• Master values: Set at config level, inherited by individual schedules
• Non-critical SMS: Prefix phone with '!' for all notifications (e.g., '!+45XXXXXXXX')
• Default behavior: All schedules inherit from master values
• Empty master arrays = no notifications by default
`;

/**
 * Default schedules configuration
 */
export const DEFAULT_SCHEDULES_CONFIG: SchedulesConfiguration = {
  description: `EC2 Start/Stop Automation - see ${DEFAULTS.DOCUMENTATION_PARAMETER_NAME} for detailed documentation`,
  masterEmails: ['kl4u5.j3n53n@gmail.com'],
  masterPhones: ['+4527147977'],
  logLevel: 'INFO', // Default log level
  schedules: [
    {
      name: '',
      enabled: true,
      timezone: 'Europe/Berlin',
      default: '06:00;22:00',
      emails: ['inherited'], // Default: inherit from master
      phones: ['inherited'], // Default: inherit from master
    },
    {
      name: 'test-environment',
      enabled: true,
      timezone: 'America/New_York',
      sa: 'never;never',
      su: 'never;never',
      default: '09:00;17:00',
      emails: ['inherited'],
      phones: ['inherited'],
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
      emails: ['inherited'],
      phones: ['inherited'],
    },
  ],
};
