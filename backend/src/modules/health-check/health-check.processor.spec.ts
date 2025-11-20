import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';

import { HealthCheckProcessor } from './health-check.processor';
import { Endpoint, EndpointStatus, HttpMethod } from '../endpoint/endpoint.entity';
import { CheckResult, CheckStatus } from './check-result.entity';
import { Incident } from '../incident/incident.entity';
import { NotificationService } from '../notification/services/notification.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';

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
        {
          provide: NotificationService,
          useValue: {
            sendAlertOnStatusChange: jest.fn(),
          },
        },
        {
          provide: WebsocketGateway,
          useValue: {
            broadcastCheckCompleted: jest.fn(),
            broadcastStatusChange: jest.fn(),
            broadcastIncidentStarted: jest.fn(),
            broadcastIncidentResolved: jest.fn(),
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

    it('should handle network unreachable error (ENETUNREACH)', async () => {
      jest.spyOn(httpService.axiosRef, 'request').mockRejectedValue({
        code: 'ENETUNREACH',
        message: 'Network is unreachable',
      });

      jest
        .spyOn(endpointRepository, 'findOne')
        .mockResolvedValue(mockEndpoint);
      jest
        .spyOn(checkResultRepository, 'save')
        .mockResolvedValue({
          status: CheckStatus.FAILURE,
          errorMessage: 'Network is unreachable',
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
      jest
        .spyOn(incidentRepository, 'save')
        .mockResolvedValue({} as any);

      const job = {
        data: { endpointId: mockEndpoint.id },
      } as any;

      const result = await processor.handleHealthCheck(job);

      expect(result?.status).toBe(CheckStatus.FAILURE);
      expect(result?.errorMessage).toBe('Network is unreachable');
    });

    it('should handle host unreachable error (EHOSTUNREACH)', async () => {
      jest.spyOn(httpService.axiosRef, 'request').mockRejectedValue({
        code: 'EHOSTUNREACH',
        message: 'No route to host',
      });

      jest
        .spyOn(endpointRepository, 'findOne')
        .mockResolvedValue(mockEndpoint);
      jest
        .spyOn(checkResultRepository, 'save')
        .mockResolvedValue({
          status: CheckStatus.FAILURE,
          errorMessage: 'Host is unreachable',
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
      jest
        .spyOn(incidentRepository, 'save')
        .mockResolvedValue({} as any);

      const job = {
        data: { endpointId: mockEndpoint.id },
      } as any;

      const result = await processor.handleHealthCheck(job);

      expect(result?.status).toBe(CheckStatus.FAILURE);
      expect(result?.errorMessage).toBe('Host is unreachable');
    });

    it('should handle status code mismatch', async () => {
      jest.spyOn(httpService.axiosRef, 'request').mockResolvedValue({
        status: 500,
        data: { error: 'Server error' },
      });

      jest
        .spyOn(endpointRepository, 'findOne')
        .mockResolvedValue(mockEndpoint);
      jest
        .spyOn(checkResultRepository, 'save')
        .mockResolvedValue({
          endpointId: mockEndpoint.id,
          status: CheckStatus.FAILURE,
          statusCode: 500,
          responseTime: 100,
          errorMessage: 'Expected 200, got 500',
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
      jest
        .spyOn(incidentRepository, 'save')
        .mockResolvedValue({} as any);

      const job = {
        data: { endpointId: mockEndpoint.id },
      } as any;

      const result = await processor.handleHealthCheck(job);

      expect(result?.status).toBe(CheckStatus.FAILURE);
      expect(result?.errorMessage).toBe('Expected 200, got 500');
      expect(result?.statusCode).toBe(500);
    });

    it('should transition to DOWN status after 3 consecutive failures', async () => {
      jest.spyOn(httpService.axiosRef, 'request').mockRejectedValue({
        code: 'ECONNREFUSED',
      });

      const failingEndpoint = {
        ...mockEndpoint,
        consecutiveFailures: 2,
        currentStatus: EndpointStatus.UP,
      };

      jest
        .spyOn(endpointRepository, 'findOne')
        .mockResolvedValue(failingEndpoint);
      jest
        .spyOn(checkResultRepository, 'save')
        .mockResolvedValue({
          status: CheckStatus.FAILURE,
        } as any);

      jest
        .spyOn(endpointRepository, 'save')
        .mockResolvedValue(failingEndpoint);
      jest
        .spyOn(incidentRepository, 'findOne')
        .mockResolvedValue(null);
      jest
        .spyOn(incidentRepository, 'save')
        .mockResolvedValue({} as any);

      const job = {
        data: { endpointId: mockEndpoint.id },
      } as any;

      await processor.handleHealthCheck(job);

      // consecutiveFailures가 3이 되어야 함
      const saveCall = (endpointRepository.save as jest.Mock).mock.calls[0][0];
      expect(saveCall.consecutiveFailures).toBe(3);
    });

    it('should record slow response time when exceeding 80% of threshold', async () => {
      jest.spyOn(httpService.axiosRef, 'request').mockResolvedValue({
        status: 200,
        data: {},
      });

      const slowEndpoint = {
        ...mockEndpoint,
        timeoutThreshold: 5000,
        currentStatus: EndpointStatus.UP,
      };

      jest
        .spyOn(endpointRepository, 'findOne')
        .mockResolvedValue(slowEndpoint);
      jest
        .spyOn(checkResultRepository, 'save')
        .mockResolvedValue({
          status: CheckStatus.SUCCESS,
          responseTime: 4500,
        } as any);

      jest
        .spyOn(endpointRepository, 'save')
        .mockResolvedValue(slowEndpoint);
      jest
        .spyOn(incidentRepository, 'findOne')
        .mockResolvedValue(null);
      jest
        .spyOn(incidentRepository, 'save')
        .mockResolvedValue({} as any);

      const job = {
        data: { endpointId: mockEndpoint.id },
      } as any;

      const result = await processor.handleHealthCheck(job);

      // 응답 시간이 기록되어야 함
      expect(result?.responseTime).toBe(4500);
    });

    it('should remain UP when response time is below 80% of threshold', async () => {
      jest.spyOn(httpService.axiosRef, 'request').mockResolvedValue({
        status: 200,
        data: {},
      });

      const fastEndpoint = {
        ...mockEndpoint,
        timeoutThreshold: 5000,
        currentStatus: EndpointStatus.UP,
      };

      jest
        .spyOn(endpointRepository, 'findOne')
        .mockResolvedValue(fastEndpoint);
      jest
        .spyOn(checkResultRepository, 'save')
        .mockResolvedValue({
          status: CheckStatus.SUCCESS,
          responseTime: 3000,
        } as any);

      const savedEndpoint = {
        ...fastEndpoint,
        currentStatus: EndpointStatus.UP,
        lastResponseTime: 3000,
        lastCheckedAt: new Date(),
      };

      jest
        .spyOn(endpointRepository, 'save')
        .mockResolvedValue(savedEndpoint);
      jest
        .spyOn(incidentRepository, 'findOne')
        .mockResolvedValue(null);

      const job = {
        data: { endpointId: mockEndpoint.id },
      } as any;

      await processor.handleHealthCheck(job);

      const saveCall = (endpointRepository.save as jest.Mock).mock.calls[0][0];
      expect(saveCall.currentStatus).toBe(EndpointStatus.UP);
    });

    it('should handle incident lookup when endpoint status is DOWN', async () => {
      jest.spyOn(httpService.axiosRef, 'request').mockRejectedValue({
        code: 'ECONNREFUSED',
        message: 'Connection refused',
      });

      const failingEndpoint = {
        ...mockEndpoint,
        consecutiveFailures: 2,
        currentStatus: EndpointStatus.UP,
      };

      jest
        .spyOn(endpointRepository, 'findOne')
        .mockResolvedValue(failingEndpoint);
      jest
        .spyOn(checkResultRepository, 'save')
        .mockResolvedValue({
          status: CheckStatus.FAILURE,
          errorMessage: 'Connection refused',
        } as any);

      jest
        .spyOn(endpointRepository, 'save')
        .mockResolvedValue(failingEndpoint);

      const findOneSpy = jest
        .spyOn(incidentRepository, 'findOne')
        .mockResolvedValue(null);

      jest
        .spyOn(incidentRepository, 'save')
        .mockResolvedValue({} as any);

      const job = {
        data: { endpointId: mockEndpoint.id },
      } as any;

      await processor.handleHealthCheck(job);

      // 인시던트 조회가 호출되어야 함
      expect(findOneSpy).toHaveBeenCalled();
    });

    it('should resolve incident when transitioning from DOWN to UP status', async () => {
      jest.spyOn(httpService.axiosRef, 'request').mockResolvedValue({
        status: 200,
        data: {},
      });

      const downEndpoint = {
        ...mockEndpoint,
        consecutiveFailures: 3,
        currentStatus: EndpointStatus.DOWN,
      };

      const existingIncident = {
        id: 'incident-123',
        endpointId: mockEndpoint.id,
        startedAt: new Date(Date.now() - 60000),
        resolvedAt: null,
      } as any;

      jest
        .spyOn(endpointRepository, 'findOne')
        .mockResolvedValue(downEndpoint);
      jest
        .spyOn(checkResultRepository, 'save')
        .mockResolvedValue({
          status: CheckStatus.SUCCESS,
          responseTime: 100,
        } as any);

      jest
        .spyOn(endpointRepository, 'save')
        .mockResolvedValue({
          ...downEndpoint,
          consecutiveFailures: 0,
          currentStatus: EndpointStatus.UP,
        });
      jest
        .spyOn(incidentRepository, 'findOne')
        .mockResolvedValue(existingIncident);

      const resolvedIncident = {
        ...existingIncident,
        resolvedAt: new Date(),
        duration: 60000,
      };

      jest
        .spyOn(incidentRepository, 'save')
        .mockResolvedValue(resolvedIncident);

      const job = {
        data: { endpointId: mockEndpoint.id },
      } as any;

      await processor.handleHealthCheck(job);

      expect(incidentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          resolvedAt: expect.any(Date),
        }),
      );
    });

    it('should handle timeout message pattern matching', async () => {
      jest.spyOn(httpService.axiosRef, 'request').mockRejectedValue({
        message: 'Request timeout: exceeded 5000ms limit',
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
      jest
        .spyOn(incidentRepository, 'save')
        .mockResolvedValue({} as any);

      const job = {
        data: { endpointId: mockEndpoint.id },
      } as any;

      const result = await processor.handleHealthCheck(job);

      expect(result?.errorMessage).toBe('Timeout exceeded');
    });

    it('should handle unknown error message', async () => {
      jest.spyOn(httpService.axiosRef, 'request').mockRejectedValue({
        message: 'Some unknown error occurred',
      });

      jest
        .spyOn(endpointRepository, 'findOne')
        .mockResolvedValue(mockEndpoint);
      jest
        .spyOn(checkResultRepository, 'save')
        .mockResolvedValue({
          status: CheckStatus.FAILURE,
          errorMessage: 'Some unknown error occurred',
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
      jest
        .spyOn(incidentRepository, 'save')
        .mockResolvedValue({} as any);

      const job = {
        data: { endpointId: mockEndpoint.id },
      } as any;

      const result = await processor.handleHealthCheck(job);

      expect(result?.errorMessage).toBe('Some unknown error occurred');
    });
  });
});
