import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from '../lambda/src/index';
import { TAG_NAMES } from '../lambda/src/constants';
import type { EC2Client } from '@aws-sdk/client-ec2';
import type { SSMClient } from '@aws-sdk/client-ssm';

describe('EC2 Start/Stop Lambda Handler', () => {
  let mockEC2Client: Partial<EC2Client>;
  let mockSSMClient: Partial<SSMClient>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up environment variables
    process.env.SCHEDULES_PARAMETER_NAME = '/test/schedules';
    process.env.AWS_REGION = 'us-east-1';
    
    // Create mock clients with send methods
    mockSSMClient = {
      send: vi.fn()
    };
    
    mockEC2Client = {
      send: vi.fn()
    };
  });

  it('should handle empty event', async () => {
    // Mock SSM response with proper format
    (mockSSMClient.send as any).mockResolvedValue({
      Parameter: {
        Value: JSON.stringify({
          schedules: [],
          maintainers: []
        })
      }
    });

    // Mock EC2 response with no instances
    (mockEC2Client.send as any).mockResolvedValue({
      Reservations: []
    });

    await expect(handler({}, undefined, {
      ec2Client: mockEC2Client as EC2Client,
      ssmClient: mockSSMClient as SSMClient
    })).resolves.toBeUndefined();
    
    expect(mockSSMClient.send).toHaveBeenCalledTimes(1);
    expect(mockEC2Client.send).toHaveBeenCalledTimes(1);
  });

  it('should process instances with matching schedules', async () => {
    const mockSchedule = {
      schedules: [
        {
          name: 'test-schedule',
          enabled: true,
          timezone: 'UTC',
          mo: '08:00;18:00',
          default: '08:00;18:00'
        }
      ],
      maintainers: ['test@example.com']
    };

    const mockInstances = {
      Reservations: [
        {
          Instances: [
            {
              InstanceId: 'i-123456789',
              State: { Name: 'stopped' },
              Tags: [
                { Key: TAG_NAMES.START_STOP_SCHEDULE, Value: 'test-schedule' }
              ]
            }
          ]
        }
      ]
    };

    (mockSSMClient.send as any).mockResolvedValue({
      Parameter: { Value: JSON.stringify(mockSchedule) }
    });

    (mockEC2Client.send as any)
      .mockResolvedValueOnce(mockInstances) // DescribeInstances
      .mockResolvedValueOnce({}); // StartInstances or StopInstances

    await expect(handler({}, undefined, {
      ec2Client: mockEC2Client as EC2Client,
      ssmClient: mockSSMClient as SSMClient
    })).resolves.toBeUndefined();
    
    // Should call SSM once and EC2 at least once (describe)
    expect(mockSSMClient.send).toHaveBeenCalledTimes(1);
    expect(mockEC2Client.send).toHaveBeenCalledWith(expect.any(Object));
  });

  it('should handle timezone conversions correctly', async () => {
    // Create a schedule with a specific timezone
    const mockSchedule = {
      schedules: [
        {
          name: 'ny-schedule',
          enabled: true,
          timezone: 'America/New_York', // EST/EDT timezone
          mo: '09:00;17:00',
          default: '09:00;17:00'
        }
      ],
      maintainers: ['test@example.com']
    };

    const mockInstances = {
      Reservations: [
        {
          Instances: [
            {
              InstanceId: 'i-timezone-test',
              State: { Name: 'stopped' },
              Tags: [
                { Key: TAG_NAMES.START_STOP_SCHEDULE, Value: 'ny-schedule' }
              ]
            }
          ]
        }
      ]
    };

    (mockSSMClient.send as any).mockResolvedValue({
      Parameter: { Value: JSON.stringify(mockSchedule) }
    });

    (mockEC2Client.send as any)
      .mockResolvedValueOnce(mockInstances) // DescribeInstances
      .mockResolvedValueOnce({}); // Potential action

    await expect(handler({}, undefined, {
      ec2Client: mockEC2Client as EC2Client,
      ssmClient: mockSSMClient as SSMClient
    })).resolves.toBeUndefined();
    
    // Verify the handler processes the timezone correctly (no errors thrown)
    expect(mockSSMClient.send).toHaveBeenCalledTimes(1);
    expect(mockEC2Client.send).toHaveBeenCalledWith(expect.any(Object));
  });

  it('should handle invalid timezone gracefully', async () => {
    const mockSchedule = {
      schedules: [
        {
          name: 'invalid-schedule',
          enabled: true,
          timezone: 'Invalid/Timezone',
          mo: '09:00;17:00',
          default: '09:00;17:00'
        }
      ],
      maintainers: ['test@example.com']
    };

    const mockInstances = {
      Reservations: [
        {
          Instances: [
            {
              InstanceId: 'i-invalid-tz',
              State: { Name: 'stopped' },
              Tags: [
                { Key: TAG_NAMES.START_STOP_SCHEDULE, Value: 'invalid-schedule' }
              ]
            }
          ]
        }
      ]
    };

    (mockSSMClient.send as any).mockResolvedValue({
      Parameter: { Value: JSON.stringify(mockSchedule) }
    });

    (mockEC2Client.send as any).mockResolvedValueOnce(mockInstances); // DescribeInstances

    await expect(handler({}, undefined, {
      ec2Client: mockEC2Client as EC2Client,
      ssmClient: mockSSMClient as SSMClient
    })).resolves.toBeUndefined();
    
    // Should not call EC2 start/stop commands due to invalid timezone
    expect(mockSSMClient.send).toHaveBeenCalledTimes(1);
    expect(mockEC2Client.send).toHaveBeenCalledTimes(1); // Only DescribeInstances
  });
});
