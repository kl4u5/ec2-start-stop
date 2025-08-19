import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handler } from '../lambda/index';

// Mock AWS SDK
vi.mock('@aws-sdk/client-ec2');
vi.mock('@aws-sdk/client-ssm');

describe('EC2 Start/Stop Lambda Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up environment variables
    process.env.SCHEDULES_PARAMETER_NAME = '/test/schedules';
  });

  it('should handle empty event', async () => {
    // Mock SSM response
    const mockSSMSend = vi.fn().mockResolvedValue({
      Parameter: {
        Value: JSON.stringify({
          schedules: [],
          maintainers: []
        })
      }
    });

    // Mock EC2 response
    const mockEC2Send = vi.fn().mockResolvedValue({
      Reservations: []
    });

    const { SSMClient } = await import('@aws-sdk/client-ssm');
    const { EC2Client } = await import('@aws-sdk/client-ec2');

    vi.mocked(SSMClient).prototype.send = mockSSMSend;
    vi.mocked(EC2Client).prototype.send = mockEC2Send;

    await expect(handler({})).resolves.toBeUndefined();
    
    expect(mockSSMSend).toHaveBeenCalledTimes(1);
    expect(mockEC2Send).toHaveBeenCalledTimes(1);
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
                { Key: 'start-stop-schedule', Value: 'test-schedule' }
              ]
            }
          ]
        }
      ]
    };

    const mockSSMSend = vi.fn().mockResolvedValue({
      Parameter: { Value: JSON.stringify(mockSchedule) }
    });

    const mockEC2Send = vi.fn()
      .mockResolvedValueOnce(mockInstances) // DescribeInstances
      .mockResolvedValueOnce({}); // StartInstances

    const { SSMClient } = await import('@aws-sdk/client-ssm');
    const { EC2Client } = await import('@aws-sdk/client-ec2');

    vi.mocked(SSMClient).prototype.send = mockSSMSend;
    vi.mocked(EC2Client).prototype.send = mockEC2Send;

    await expect(handler({})).resolves.toBeUndefined();
  });
});
