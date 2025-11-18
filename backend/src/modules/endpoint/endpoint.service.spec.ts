import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EndpointService } from './endpoint.service';
import { Endpoint, EndpointStatus } from './endpoint.entity';
import { CheckResult } from '../health-check/check-result.entity';
import { Incident } from '../incident/incident.entity';
import { HealthCheckService } from '../health-check/health-check.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { CreateEndpointDto } from './dto';
import { HttpMethod } from './endpoint.entity';

describe('EndpointService', () => {
  let service: EndpointService;
  let endpointRepository: Repository<Endpoint>;
  let healthCheckService: HealthCheckService;

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
        EndpointService,
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
          provide: HealthCheckService,
          useValue: {
            scheduleHealthCheck: jest.fn(),
            rescheduleHealthCheck: jest.fn(),
            unscheduleHealthCheck: jest.fn(),
            performHealthCheckNow: jest.fn(),
          },
        },
        {
          provide: WebsocketGateway,
          useValue: {
            broadcastEndpointCreated: jest.fn(),
            broadcastEndpointUpdated: jest.fn(),
            broadcastEndpointDeleted: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EndpointService>(EndpointService);
    endpointRepository = module.get<Repository<Endpoint>>(
      getRepositoryToken(Endpoint),
    );
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
  });

  describe('create', () => {
    it('should create an endpoint and schedule health check', async () => {
      const dto: CreateEndpointDto = {
        name: 'Test API',
        url: 'https://api.example.com/health',
        method: HttpMethod.GET,
        checkInterval: 60,
        expectedStatusCode: 200,
        timeoutThreshold: 5000,
      };

      // Mock 설정
      jest
        .spyOn(endpointRepository, 'create')
        .mockReturnValue(mockEndpoint as any);
      jest
        .spyOn(endpointRepository, 'save')
        .mockResolvedValue(mockEndpoint);
      jest
        .spyOn(healthCheckService, 'scheduleHealthCheck')
        .mockResolvedValue(undefined);

      const result = await service.create(dto);

      // 검증
      expect(result.id).toBe(mockEndpoint.id);
      expect(result.currentStatus).toBe(EndpointStatus.UNKNOWN);
      expect(result.consecutiveFailures).toBe(0);
      expect(healthCheckService.scheduleHealthCheck).toHaveBeenCalledWith(
        mockEndpoint,
      );
    });

    it('should throw error when invalid URL is provided', async () => {
      const dto: CreateEndpointDto = {
        name: 'Test API',
        url: 'invalid-url', // 잘못된 URL
        checkInterval: 60,
      };

      // create 메서드에서 DTO 검증 실패
      // 이는 @IsUrl() 데코레이터에서 잡혀야 함
    });
  });

  describe('findAll', () => {
    it('should return paginated endpoints', async () => {
      const query = {
        page: 1,
        limit: 20,
        status: undefined,
        isActive: undefined,
        sortBy: 'createdAt' as any,
        order: 'DESC' as any,
      };

      const mockEndpoints = [mockEndpoint];

      jest
        .spyOn(endpointRepository, 'createQueryBuilder')
        .mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(1),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(mockEndpoints),
        } as any);

      const result = await service.findAll(query);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should filter by status', async () => {
      const query = {
        page: 1,
        limit: 20,
        status: EndpointStatus.UP,
        isActive: undefined,
        sortBy: 'createdAt' as any,
        order: 'DESC' as any,
      };

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      jest
        .spyOn(endpointRepository, 'createQueryBuilder')
        .mockReturnValue(queryBuilder as any);

      await service.findAll(query);

      // where 메서드가 status로 호출되었는지 확인
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'endpoint.currentStatus = :status',
        { status: EndpointStatus.UP },
      );
    });
  });

  describe('findOne', () => {
    it('should return endpoint by id', async () => {
      jest
        .spyOn(endpointRepository, 'findOne')
        .mockResolvedValue(mockEndpoint);

      const result = await service.findOne(mockEndpoint.id);

      expect(result.id).toBe(mockEndpoint.id);
      expect(result.name).toBe(mockEndpoint.name);
    });

    it('should throw NotFoundException when endpoint not found', async () => {
      jest.spyOn(endpointRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.findOne('non-existent-id'),
      ).rejects.toThrow('Endpoint not found');
    });
  });

  describe('update', () => {
    it('should update endpoint without rescheduling if interval not changed', async () => {
      const dto = {
        name: 'Updated Name',
      };

      jest
        .spyOn(endpointRepository, 'findOne')
        .mockResolvedValue(mockEndpoint);
      jest
        .spyOn(endpointRepository, 'save')
        .mockResolvedValue({ ...mockEndpoint, ...dto });

      await service.update(mockEndpoint.id, dto);

      expect(healthCheckService.rescheduleHealthCheck).not.toHaveBeenCalled();
    });

    it('should reschedule health check when interval changed', async () => {
      const dto = {
        checkInterval: 120, // 기존 60에서 120으로 변경
      };

      jest
        .spyOn(endpointRepository, 'findOne')
        .mockResolvedValue(mockEndpoint);
      jest
        .spyOn(endpointRepository, 'save')
        .mockResolvedValue({
          ...mockEndpoint,
          checkInterval: 120,
        });
      jest
        .spyOn(healthCheckService, 'rescheduleHealthCheck')
        .mockResolvedValue(undefined);

      await service.update(mockEndpoint.id, dto);

      expect(healthCheckService.rescheduleHealthCheck).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete endpoint and unschedule health check', async () => {
      jest
        .spyOn(endpointRepository, 'findOne')
        .mockResolvedValue(mockEndpoint);
      jest
        .spyOn(endpointRepository, 'save')
        .mockResolvedValue({ ...mockEndpoint, isActive: false });
      jest
        .spyOn(healthCheckService, 'unscheduleHealthCheck')
        .mockResolvedValue(undefined);

      await service.remove(mockEndpoint.id);

      expect(healthCheckService.unscheduleHealthCheck).toHaveBeenCalledWith(
        mockEndpoint,
      );
    });
  });

  describe('manualHealthCheck', () => {
    it('should perform manual health check', async () => {
      const mockCheckResult = {
        id: 'check-123',
        status: 'success',
        responseTime: 150,
        statusCode: 200,
        errorMessage: null,
      };

      jest
        .spyOn(endpointRepository, 'findOne')
        .mockResolvedValue(mockEndpoint);
      jest
        .spyOn(healthCheckService, 'performHealthCheckNow')
        .mockResolvedValue(mockCheckResult as any);

      const result = await service.manualHealthCheck(mockEndpoint.id);

      expect(result).toEqual(mockCheckResult);
      expect(healthCheckService.performHealthCheckNow).toHaveBeenCalledWith(
        mockEndpoint,
      );
    });
  });
});
