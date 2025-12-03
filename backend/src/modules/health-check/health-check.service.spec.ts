import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { Repository } from 'typeorm';

import { HealthCheckService } from './health-check.service';
import { Endpoint, EndpointStatus, HttpMethod } from '../endpoint/endpoint.entity';
import { CheckResult, CheckStatus } from './check-result.entity';

describe('HealthCheckService', () => {
  let service: HealthCheckService;
  let endpointRepository: Repository<Endpoint>;

  const mockQueue = {
    add: jest.fn().mockResolvedValue({
      id: 1,
      data: {},
      finished: jest.fn().mockResolvedValue({}),
      returnvalue: {
        id: 'check-1',
        status: CheckStatus.SUCCESS,
        responseTime: 150,
      },
    }),
    getJobs: jest.fn().mockResolvedValue([]),
  };

  const mockEndpoint: Endpoint = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test API',
    url: 'https://api.example.com/health',
    method: HttpMethod.GET,
    headers: {},
    body: null,
    checkInterval: 60,
    expectedStatusCode: 200,
    timeoutThreshold: 5000,
    isActive: true,
    currentStatus: EndpointStatus.UNKNOWN,
    lastResponseTime: null,
    lastCheckedAt: null,
    consecutiveFailures: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    checkResults: [],
    incidents: [],
  };

  let checkResultRepository: Repository<CheckResult>;

  const mockCheckResult: CheckResult = {
    id: 'check-123',
    endpointId: mockEndpoint.id,
    status: CheckStatus.SUCCESS,
    responseTime: 150,
    statusCode: 200,
    errorMessage: null,
    checkedAt: new Date(),
    endpoint: mockEndpoint,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthCheckService,
        {
          provide: getQueueToken('HEALTH_CHECK_QUEUE'),
          useValue: mockQueue,
        },
        {
          provide: getRepositoryToken(Endpoint),
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockEndpoint),
            find: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CheckResult),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn().mockResolvedValue(mockCheckResult),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<HealthCheckService>(HealthCheckService);
    endpointRepository = module.get<Repository<Endpoint>>(
      getRepositoryToken(Endpoint),
    );
    checkResultRepository = module.get<Repository<CheckResult>>(
      getRepositoryToken(CheckResult),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('scheduleHealthCheck', () => {
    it('should schedule health check with correct interval', async () => {
      await service.scheduleHealthCheck(mockEndpoint);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'check',
        { endpointId: mockEndpoint.id },
        expect.objectContaining({
          jobId: `endpoint-${mockEndpoint.id}`,
          repeat: {
            every: 60000, // 60초 * 1000
          },
        }),
      );
    });

    it('should queue immediate health check after scheduling', async () => {
      await service.scheduleHealthCheck(mockEndpoint);

      // 두 번째 호출이 immediate check
      expect(mockQueue.add).toHaveBeenCalledTimes(2);
      expect(mockQueue.add).toHaveBeenNthCalledWith(
        2,
        'check',
        { endpointId: mockEndpoint.id, isImmediate: true },
        expect.objectContaining({
          priority: 1,
        }),
      );
    });

    it('should handle scheduling errors', async () => {
      const error = new Error('Queue error');
      (mockQueue.add as jest.Mock).mockRejectedValueOnce(error);

      await expect(service.scheduleHealthCheck(mockEndpoint)).rejects.toThrow('Queue error');
    });

    it('should set backoff strategy for retries', async () => {
      await service.scheduleHealthCheck(mockEndpoint);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'check',
        expect.any(Object),
        expect.objectContaining({
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }),
      );
    });

    it('should keep job history after completion', async () => {
      await service.scheduleHealthCheck(mockEndpoint);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'check',
        expect.any(Object),
        expect.objectContaining({
          removeOnComplete: false,
        }),
      );
    });
  });

  describe('rescheduleHealthCheck', () => {
    it('should unschedule and reschedule health check', async () => {
      const updatedEndpoint = { ...mockEndpoint, checkInterval: 120 };

      // unschedule과 reschedule을 위해 getJobs를 여러 번 호출
      (mockQueue.getJobs as jest.Mock).mockResolvedValue([]);

      await service.rescheduleHealthCheck(updatedEndpoint);

      // unschedule (getJobs 호출) + reschedule (add 호출 2번)
      expect(mockQueue.getJobs).toHaveBeenCalled();
      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('should handle rescheduling errors', async () => {
      const error = new Error('Reschedule failed');
      (mockQueue.getJobs as jest.Mock).mockRejectedValueOnce(error);

      await expect(service.rescheduleHealthCheck(mockEndpoint)).rejects.toThrow(
        'Reschedule failed',
      );
    });
  });

  describe('unscheduleHealthCheck', () => {
    it('should remove all jobs for endpoint', async () => {
      const mockJob = {
        data: { endpointId: mockEndpoint.id },
        remove: jest.fn().mockResolvedValue(undefined),
      };

      (mockQueue.getJobs as jest.Mock).mockResolvedValue([mockJob]);

      await service.unscheduleHealthCheck(mockEndpoint);

      expect(mockJob.remove).toHaveBeenCalled();
    });

    it('should skip jobs for other endpoints', async () => {
      const otherJob = {
        data: { endpointId: 'other-endpoint-id' },
        remove: jest.fn().mockResolvedValue(undefined),
      };

      (mockQueue.getJobs as jest.Mock).mockResolvedValue([otherJob]);

      await service.unscheduleHealthCheck(mockEndpoint);

      expect(otherJob.remove).not.toHaveBeenCalled();
    });

    it('should handle multiple jobs for same endpoint', async () => {
      const mockJob1 = {
        data: { endpointId: mockEndpoint.id },
        remove: jest.fn().mockResolvedValue(undefined),
      };

      const mockJob2 = {
        data: { endpointId: mockEndpoint.id },
        remove: jest.fn().mockResolvedValue(undefined),
      };

      (mockQueue.getJobs as jest.Mock).mockResolvedValue([mockJob1, mockJob2]);

      await service.unscheduleHealthCheck(mockEndpoint);

      expect(mockJob1.remove).toHaveBeenCalled();
      expect(mockJob2.remove).toHaveBeenCalled();
    });

    it('should handle jobs without data', async () => {
      const invalidJob = {
        data: null,
        remove: jest.fn().mockResolvedValue(undefined),
      };

      (mockQueue.getJobs as jest.Mock).mockResolvedValue([invalidJob]);

      // Should not throw error
      await expect(
        service.unscheduleHealthCheck(mockEndpoint),
      ).resolves.not.toThrow();

      expect(invalidJob.remove).not.toHaveBeenCalled();
    });

    it('should handle unscheduling errors', async () => {
      const error = new Error('Unschedule failed');
      (mockQueue.getJobs as jest.Mock).mockRejectedValueOnce(error);

      await expect(service.unscheduleHealthCheck(mockEndpoint)).rejects.toThrow(
        'Unschedule failed',
      );
    });
  });

  describe('performHealthCheckNow', () => {
    it('should queue manual health check with high priority', async () => {
      await service.performHealthCheckNow(mockEndpoint);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'check',
        { endpointId: mockEndpoint.id, isManual: true },
        expect.objectContaining({
          priority: 1,
          attempts: 1,
        }),
      );
    });

    it('should return check result when job completes', async () => {
      const result = await service.performHealthCheckNow(mockEndpoint);

      expect(result).toEqual(
        expect.objectContaining({
          status: CheckStatus.SUCCESS,
          responseTime: 150,
        }),
      );
    });

    it('should reject with error if job fails', async () => {
      const error = new Error('Job failed');
      const mockJobWithError = {
        id: 1,
        data: {},
        finished: jest.fn().mockRejectedValue(error),
        returnvalue: null,
      };

      (mockQueue.add as jest.Mock).mockResolvedValueOnce(mockJobWithError);

      await expect(service.performHealthCheckNow(mockEndpoint)).rejects.toThrow('Job failed');
    });

    it('should handle queueing errors', async () => {
      const error = new Error('Queue full');
      (mockQueue.add as jest.Mock).mockRejectedValueOnce(error);

      await expect(service.performHealthCheckNow(mockEndpoint)).rejects.toThrow('Queue full');
    });

    it('should return check result from database after job completion', async () => {
      const customResult: CheckResult = {
        id: 'check-custom',
        endpointId: mockEndpoint.id,
        status: CheckStatus.FAILURE,
        responseTime: 5000,
        statusCode: 500,
        errorMessage: 'Server error',
        checkedAt: new Date(),
        endpoint: mockEndpoint,
      };

      const mockJobWithCustomResult = {
        finished: jest.fn().mockResolvedValue({}),
        returnvalue: null,
      };

      (mockQueue.add as jest.Mock).mockResolvedValueOnce(mockJobWithCustomResult);
      (checkResultRepository.findOne as jest.Mock).mockResolvedValueOnce(customResult);

      const result = await service.performHealthCheckNow(mockEndpoint);

      expect(result).toEqual(customResult);
      expect(checkResultRepository.findOne).toHaveBeenCalledWith({
        where: { endpointId: mockEndpoint.id },
        order: { checkedAt: 'DESC' },
      });
    });
  });
});
