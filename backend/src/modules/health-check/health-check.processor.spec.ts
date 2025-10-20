import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';

import { HealthCheckProcessor } from './health-check.processor';
import { Endpoint, EndpointStatus, HttpMethod } from '../endpoint/endpoint.entity';
import { CheckResult, CheckStatus } from './check-result.entity';
import { Incident } from '../incident/incident.entity';

describe('HealthCheckProcessor', () => {
  let processor: HealthCheckProcessor;
  let endpointRepository: Repository<Endpoint>;
  let checkResultRepository: Repository<CheckResult>;
  let incidentRepository: Repository<Incident>;
  let httpService: HttpService;

  // Mock 데이터
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthCheckProcessor,
        {
          provide: getRepositoryToken(Endpoint),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(CheckResult),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Incident),
          useClass: Repository,
        },
        {
          provide: HttpService,
          useValue: {
            axiosRef: {
              request: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    processor = module.get<HealthCheckProcessor>(HealthCheckProcessor);
    endpointRepository = module.get<Repository<Endpoint>>(
      getRepositoryToken(Endpoint),
    );
    checkResultRepository = module.get<Repository<CheckResult>>(
      getRepositoryToken(CheckResult),
    );
    incidentRepository = module.get<Repository<Incident>>(
      getRepositoryToken(Incident),
    );
    httpService = module.get<HttpService>(HttpService);
  });

  describe('handleHealthCheck', () => {
    it('should return null if endpoint is not active', async () => {
      const inactiveEndpoint = { ...mockEndpoint, isActive: false };

      jest
        .spyOn(endpointRepository, 'findOne')
        .mockResolvedValue(inactiveEndpoint);

      const job = {
        data: { endpointId: mockEndpoint.id },
      } as any;

      const result = await processor.handleHealthCheck(job);

      expect(result).toBeNull();
    });

    it('should throw error if endpoint not found', async () => {
      jest.spyOn(endpointRepository, 'findOne').mockResolvedValue(null);

      const job = {
        data: { endpointId: 'non-existent-id' },
      } as any;

      await expect(processor.handleHealthCheck(job)).rejects.toThrow(
        'Endpoint not found',
      );
    });

    it('should perform successful health check and save result', async () => {
      const mockCheckResult = {
        id: 'check-123',
        endpointId: mockEndpoint.id,
        status: CheckStatus.SUCCESS,
        responseTime: 150,
        statusCode: 200,
        errorMessage: null,
        checkedAt: new Date(),
      } as CheckResult;

      // Mock HTTP 성공 응답
      jest.spyOn(httpService.axiosRef, 'request').mockResolvedValue({
        status: 200,
        data: {},
      });

      jest
        .spyOn(endpointRepository, 'findOne')
        .mockResolvedValue(mockEndpoint);
      jest
        .spyOn(checkResultRepository, 'save')
        .mockResolvedValue(mockCheckResult);
      jest
        .spyOn(endpointRepository, 'save')
        .mockResolvedValue({
          ...mockEndpoint,
          currentStatus: EndpointStatus.UP,
          lastResponseTime: 150,
          lastCheckedAt: new Date(),
          consecutiveFailures: 0,
        });
      jest
        .spyOn(incidentRepository, 'findOne')
        .mockResolvedValue(null);

      const job = {
        data: { endpointId: mockEndpoint.id },
      } as any;

      const result = await processor.handleHealthCheck(job);

      expect(result).toBeDefined();
      expect(result?.status).toBe(CheckStatus.SUCCESS);
      expect(checkResultRepository.save).toHaveBeenCalled();
      expect(endpointRepository.save).toHaveBeenCalled();
    });

    it('should handle HTTP request timeout error', async () => {
      // Mock HTTP 타임아웃
      jest.spyOn(httpService.axiosRef, 'request').mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout of 5000 ms exceeded',
      });

      jest
        .spyOn(endpointRepository, 'findOne')
        .mockResolvedValue(mockEndpoint);
      jest
        .spyOn(checkResultRepository, 'save')
        .mockResolvedValue({
          status: CheckStatus.FAILURE,
          errorMessage: 'Timeout exceeded',
        } as any);
      jest
        .spyOn(endpointRepository, 'save')
        .mockResolvedValue({
          ...mockEndpoint,
          consecutiveFailures: 1,
        });
      jest
        .spyOn(incidentRepository, 'findOne')
        .mockResolvedValue(null);

      const job = {
        data: { endpointId: mockEndpoint.id },
      } as any;

      const result = await processor.handleHealthCheck(job);

      expect(result).toBeDefined();
      expect(result?.status).toBe(CheckStatus.FAILURE);
      expect(result?.errorMessage).toBe('Timeout exceeded');
    });

    it('should handle DNS resolution failure', async () => {
      // Mock DNS 실패
      jest.spyOn(httpService.axiosRef, 'request').mockRejectedValue({
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND api.example.com',
      });

      jest
        .spyOn(endpointRepository, 'findOne')
        .mockResolvedValue(mockEndpoint);
      jest
        .spyOn(checkResultRepository, 'save')
        .mockResolvedValue({
          status: CheckStatus.FAILURE,
          errorMessage: 'DNS resolution failed',
        } as any);
      jest
        .spyOn(endpointRepository, 'save')
        .mockResolvedValue({
          ...mockEndpoint,
          consecutiveFailures: 1,
        });
      jest
        .spyOn(incidentRepository, 'findOne')
        .mockResolvedValue(null);

      const job = {
        data: { endpointId: mockEndpoint.id },
      } as any;

      const result = await processor.handleHealthCheck(job);

      expect(result).toBeDefined();
      expect(result?.status).toBe(CheckStatus.FAILURE);
      expect(result?.errorMessage).toBe('DNS resolution failed');
    });

    it('should handle connection refused error', async () => {
      jest.spyOn(httpService.axiosRef, 'request').mockRejectedValue({
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      });

      jest
        .spyOn(endpointRepository, 'findOne')
        .mockResolvedValue(mockEndpoint);
      jest
        .spyOn(checkResultRepository, 'save')
        .mockResolvedValue({
          status: CheckStatus.FAILURE,
          errorMessage: 'Connection refused',
        } as any);
      jest
        .spyOn(endpointRepository, 'save')
        .mockResolvedValue({
          ...mockEndpoint,
          consecutiveFailures: 1,
        });
      jest
        .spyOn(incidentRepository, 'findOne')
        .mockResolvedValue(null);

      const job = {
        data: { endpointId: mockEndpoint.id },
      } as any;

      const result = await processor.handleHealthCheck(job);

      expect(result).toBeDefined();
      expect(result?.status).toBe(CheckStatus.FAILURE);
      expect(result?.errorMessage).toBe('Connection refused');
    });

    it('should save consecutive failures count', async () => {
      jest.spyOn(httpService.axiosRef, 'request').mockRejectedValue({
        code: 'ECONNREFUSED',
      });

      const failingEndpoint = { ...mockEndpoint, consecutiveFailures: 2 };

      jest
        .spyOn(endpointRepository, 'findOne')
        .mockResolvedValue(failingEndpoint);
      jest
        .spyOn(checkResultRepository, 'save')
        .mockResolvedValue({
          status: CheckStatus.FAILURE,
          errorMessage: 'Connection refused',
        } as any);

      const updatedEndpoint = {
        ...failingEndpoint,
        consecutiveFailures: 3,
      };

      jest
        .spyOn(endpointRepository, 'save')
        .mockResolvedValue(updatedEndpoint);
      jest
        .spyOn(incidentRepository, 'findOne')
        .mockResolvedValue(null);

      const job = {
        data: { endpointId: mockEndpoint.id },
      } as any;

      await processor.handleHealthCheck(job);

      const saveCall = (endpointRepository.save as jest.Mock).mock.calls[0][0];
      expect(saveCall.consecutiveFailures).toBe(3);
    });

    it('should reset consecutive failures on success', async () => {
      jest.spyOn(httpService.axiosRef, 'request').mockResolvedValue({
        status: 200,
        data: {},
      });

      const failingEndpoint = {
        ...mockEndpoint,
        consecutiveFailures: 2,
      };

      jest
        .spyOn(endpointRepository, 'findOne')
        .mockResolvedValue(failingEndpoint);
      jest
        .spyOn(checkResultRepository, 'save')
        .mockResolvedValue({
          status: CheckStatus.SUCCESS,
          responseTime: 100,
        } as any);

      jest
        .spyOn(endpointRepository, 'save')
        .mockResolvedValue({
          ...failingEndpoint,
          consecutiveFailures: 0,
        });
      jest
        .spyOn(incidentRepository, 'findOne')
        .mockResolvedValue(null);

      const job = {
        data: { endpointId: mockEndpoint.id },
      } as any;

      await processor.handleHealthCheck(job);

      const saveCall = (endpointRepository.save as jest.Mock).mock.calls[0][0];
      expect(saveCall.consecutiveFailures).toBe(0);
    });
  });
});
