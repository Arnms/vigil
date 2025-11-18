import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { StatisticsService } from './statistics.service';
import { UptimeCalculatorService } from './uptime-calculator.service';
import { ResponseTimeAnalyzerService } from './response-time-analyzer.service';
import { CacheManagerService } from './cache-manager.service';
import { IncidentService } from './incident.service';
import { Endpoint, EndpointStatus } from '../../endpoint/endpoint.entity';
import { CheckResult } from '../../health-check/check-result.entity';
import { Incident } from '../../incident/incident.entity';

describe('StatisticsService', () => {
  let service: StatisticsService;
  let cacheManagerService: CacheManagerService;
  let uptimeCalculatorService: UptimeCalculatorService;
  let responseTimeAnalyzerService: ResponseTimeAnalyzerService;
  let incidentService: IncidentService;
  let checkResultRepository: Repository<CheckResult>;
  let endpointRepository: Repository<Endpoint>;
  let incidentRepository: Repository<Incident>;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'redis') {
        return {
          host: 'localhost',
          port: 6379,
          password: undefined,
          db: 0,
        };
      }
      return undefined;
    }),
  };

  const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
    getRawOne: jest.fn(),
  };

  const mockEndpointRepository = {
    find: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockCheckResultRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockIncidentRepository = {
    count: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockEndpoints: Endpoint[] = [
    {
      id: 'endpoint-1',
      name: 'API 1',
      url: 'https://api1.example.com',
      method: 'GET' as any,
      headers: {},
      body: null,
      checkInterval: 60,
      expectedStatusCode: 200,
      timeoutThreshold: 5000,
      isActive: true,
      currentStatus: EndpointStatus.UP,
      lastResponseTime: 150,
      lastCheckedAt: new Date(),
      consecutiveFailures: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      checkResults: [],
      incidents: [],
    },
    {
      id: 'endpoint-2',
      name: 'API 2',
      url: 'https://api2.example.com',
      method: 'GET' as any,
      headers: {},
      body: null,
      checkInterval: 60,
      expectedStatusCode: 200,
      timeoutThreshold: 5000,
      isActive: true,
      currentStatus: EndpointStatus.DOWN,
      lastResponseTime: 5000,
      lastCheckedAt: new Date(),
      consecutiveFailures: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
      checkResults: [],
      incidents: [],
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsService,
        UptimeCalculatorService,
        ResponseTimeAnalyzerService,
        CacheManagerService,
        IncidentService,
        {
          provide: getRepositoryToken(Endpoint),
          useValue: mockEndpointRepository,
        },
        {
          provide: getRepositoryToken(CheckResult),
          useValue: mockCheckResultRepository,
        },
        {
          provide: getRepositoryToken(Incident),
          useValue: mockIncidentRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<StatisticsService>(StatisticsService);
    cacheManagerService =
      module.get<CacheManagerService>(CacheManagerService);
    uptimeCalculatorService =
      module.get<UptimeCalculatorService>(UptimeCalculatorService);
    responseTimeAnalyzerService = module.get<ResponseTimeAnalyzerService>(
      ResponseTimeAnalyzerService,
    );
    incidentService = module.get<IncidentService>(IncidentService);
    checkResultRepository = module.get<Repository<CheckResult>>(
      getRepositoryToken(CheckResult),
    );
    endpointRepository = module.get<Repository<Endpoint>>(
      getRepositoryToken(Endpoint),
    );
    incidentRepository = module.get<Repository<Incident>>(
      getRepositoryToken(Incident),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUptimeStats', () => {
    it('should return uptime statistics from cache if available', async () => {
      const endpointId = 'endpoint-1';
      const mockUptimeData = {
        endpointId,
        period: '24h' as any,
        uptime: 99.5,
        totalChecks: 1000,
        successfulChecks: 995,
        failedChecks: 5,
        startDate: new Date('2025-10-21T00:00:00Z'),
        endDate: new Date('2025-10-22T00:00:00Z'),
      };

      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(mockUptimeData);

      const result = await service.getUptimeStats(endpointId, {
        period: '24h' as any,
      });

      expect(result).toEqual(mockUptimeData);
      expect(cacheManagerService.get).toHaveBeenCalled();
    });

    it('should calculate and cache uptime statistics if not cached', async () => {
      const endpointId = 'endpoint-1';
      const mockUptimeData = {
        endpointId,
        period: '24h' as any,
        uptime: 99.5,
        totalChecks: 1000,
        successfulChecks: 995,
        failedChecks: 5,
        startDate: new Date('2025-10-21T00:00:00Z'),
        endDate: new Date('2025-10-22T00:00:00Z'),
      };

      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(null);
      jest
        .spyOn(uptimeCalculatorService, 'calculate')
        .mockResolvedValue(mockUptimeData);
      jest
        .spyOn(cacheManagerService, 'set')
        .mockResolvedValue(undefined);

      const result = await service.getUptimeStats(endpointId, {
        period: '24h' as any,
      });

      expect(result).toEqual(mockUptimeData);
      expect(cacheManagerService.set).toHaveBeenCalled();
    });
  });

  describe('getResponseTimeStats', () => {
    it('should return response time statistics from cache if available', async () => {
      const endpointId = 'endpoint-1';
      const mockResponseTimeData = {
        endpointId,
        period: '24h' as any,
        statistics: {
          avg: 150,
          min: 50,
          max: 2000,
          p50: 120,
          p95: 800,
          p99: 1500,
        },
        timeSeries: [],
        startDate: new Date('2025-10-21T00:00:00Z'),
        endDate: new Date('2025-10-22T00:00:00Z'),
      };

      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(mockResponseTimeData);

      const result = await service.getResponseTimeStats(endpointId, {
        period: '24h' as any,
      });

      expect(result).toEqual(mockResponseTimeData);
    });

    it('should calculate and cache response time statistics if not cached', async () => {
      const endpointId = 'endpoint-1';
      const mockResponseTimeData = {
        endpointId,
        period: '24h' as any,
        statistics: {
          avg: 150,
          min: 50,
          max: 2000,
          p50: 120,
          p95: 800,
          p99: 1500,
        },
        timeSeries: [],
        startDate: new Date('2025-10-21T00:00:00Z'),
        endDate: new Date('2025-10-22T00:00:00Z'),
      };

      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(null);
      jest
        .spyOn(responseTimeAnalyzerService, 'analyze')
        .mockResolvedValue(mockResponseTimeData);
      jest
        .spyOn(cacheManagerService, 'set')
        .mockResolvedValue(undefined);

      const result = await service.getResponseTimeStats(endpointId, {
        period: '24h' as any,
      });

      expect(result).toEqual(mockResponseTimeData);
      expect(cacheManagerService.set).toHaveBeenCalled();
    });
  });

  describe('getOverview', () => {
    it('should return cached overview if available', async () => {
      const mockCacheValue = {
        totalEndpoints: 2,
        statusBreakdown: { UP: 1, DOWN: 1, DEGRADED: 0, UNKNOWN: 0 },
        overallUptime: 98.5,
        activeIncidents: 2,
        totalIncidentsLast24h: 5,
        averageResponseTime: 175,
        cachedAt: new Date(),
      };

      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(mockCacheValue);

      const result = await service.getOverview();

      expect(result).toEqual(mockCacheValue);
      expect(cacheManagerService.get).toHaveBeenCalled();
    });

    it('should calculate and cache overview when not cached', async () => {
      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(null);
      jest
        .spyOn(endpointRepository, 'count')
        .mockResolvedValue(2);
      jest
        .spyOn(endpointRepository, 'createQueryBuilder')
        .mockReturnValue({
          ...mockQueryBuilder,
          getRawMany: jest.fn().mockResolvedValue([
            { status: EndpointStatus.UP, count: '1' },
            { status: EndpointStatus.DOWN, count: '1' },
          ]),
        } as any);
      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValue({
          ...mockQueryBuilder,
          getRawOne: jest.fn().mockResolvedValue({ uptime: '98.5' }),
        } as any);
      jest
        .spyOn(incidentRepository, 'count')
        .mockResolvedValue(2);
      jest
        .spyOn(cacheManagerService, 'set')
        .mockResolvedValue(undefined);

      const result = await service.getOverview();

      expect(result).toBeDefined();
      expect(result.totalEndpoints).toBe(2);
    });
  });

  describe('getIncidents', () => {
    it('should return incidents list with pagination', async () => {
      const mockResponse = {
        data: [
          {
            id: 'incident-1',
            endpointId: 'endpoint-1',
            startedAt: new Date(),
            resolvedAt: null,
          },
        ],
        meta: { total: 10, page: 1, limit: 20, totalPages: 1 },
      };

      jest
        .spyOn(incidentService, 'findAll')
        .mockResolvedValue(mockResponse as any);

      const result = await service.getIncidents({
        page: 1,
        limit: 20,
      } as any);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(incidentService.findAll).toHaveBeenCalled();
    });

    it('should pass correct pagination parameters to incident service', async () => {
      const mockResponse = {
        data: [],
        meta: { total: 0, page: 2, limit: 10, totalPages: 0 },
      };

      jest
        .spyOn(incidentService, 'findAll')
        .mockResolvedValue(mockResponse as any);

      await service.getIncidents({
        page: 2,
        limit: 10,
      } as any);

      expect(incidentService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 10,
        }),
      );
    });
  });

  describe('getIncidentDetail', () => {
    it('should return incident detail with check results', async () => {
      const incidentId = 'incident-1';
      const mockIncidentDetail = {
        id: incidentId,
        endpointId: 'endpoint-1',
        startedAt: new Date(),
        resolvedAt: null,
        failureCount: 5,
        errorMessage: 'Timeout',
        checkResults: [],
      };

      jest
        .spyOn(incidentService, 'findById')
        .mockResolvedValue(mockIncidentDetail as any);

      const result = await service.getIncidentDetail(incidentId);

      expect(result).toEqual(mockIncidentDetail);
      expect(incidentService.findById).toHaveBeenCalledWith(incidentId);
    });

    it('should return null when incident not found', async () => {
      jest
        .spyOn(incidentService, 'findById')
        .mockResolvedValue(null);

      const result = await service.getIncidentDetail('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('getComparison', () => {
    it('should return cached comparison if available', async () => {
      const mockCacheValue = {
        data: [
          {
            endpointId: 'endpoint-1',
            name: 'API 1',
            uptime24h: 99.5,
            avgResponseTime: 150,
            incidentCount: 0,
            stabilityScore: 95.4,
            rank: 1,
          },
        ],
        generatedAt: new Date(),
      };

      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(mockCacheValue);

      const result = await service.getComparison();

      expect(result).toEqual(mockCacheValue);
    });

    it('should calculate and cache comparison when not cached', async () => {
      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(null);
      jest
        .spyOn(endpointRepository, 'find')
        .mockResolvedValue(mockEndpoints);
      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValue({
          ...mockQueryBuilder,
          getRawOne: jest.fn().mockResolvedValue({ uptime: '0.995' }),
        } as any);
      jest
        .spyOn(incidentRepository, 'count')
        .mockResolvedValue(0);
      jest
        .spyOn(cacheManagerService, 'set')
        .mockResolvedValue(undefined);

      const result = await service.getComparison();

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      expect(cacheManagerService.set).toHaveBeenCalled();
    });

    it('should sort endpoints by stability score', async () => {
      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(null);
      jest
        .spyOn(endpointRepository, 'find')
        .mockResolvedValue(mockEndpoints);
      let callCount = 0;
      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValue({
          ...mockQueryBuilder,
          getRawOne: jest.fn().mockImplementation(() => {
            // Simulate different uptime values for sorting
            callCount++;
            if (callCount % 3 === 1) return Promise.resolve({ uptime: '0.995', avg: '150' });
            if (callCount % 3 === 2) return Promise.resolve({ avg: '150' });
            return Promise.resolve({ uptime: '0.98' });
          }),
        } as any);
      jest
        .spyOn(incidentRepository, 'count')
        .mockResolvedValue(0);
      jest
        .spyOn(cacheManagerService, 'set')
        .mockResolvedValue(undefined);

      const result = await service.getComparison();

      // Verify that data is sorted by stability score in descending order
      if (result.data.length > 1) {
        for (let i = 0; i < result.data.length - 1; i++) {
          expect(result.data[i].stabilityScore).toBeGreaterThanOrEqual(
            result.data[i + 1].stabilityScore,
          );
        }
      }
    });
  });

  describe('Uptime calculation methods', () => {
    it('should calculate overall uptime correctly', async () => {
      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(null);
      jest
        .spyOn(endpointRepository, 'count')
        .mockResolvedValue(1);
      jest
        .spyOn(endpointRepository, 'createQueryBuilder')
        .mockReturnValue({
          ...mockQueryBuilder,
          getRawMany: jest.fn().mockResolvedValue([
            { status: EndpointStatus.UP, count: '1' },
          ]),
        } as any);
      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValue({
          ...mockQueryBuilder,
          getRawOne: jest.fn().mockResolvedValue({ uptime: '98.50' }),
        } as any);
      jest
        .spyOn(incidentRepository, 'count')
        .mockResolvedValue(0);
      jest
        .spyOn(cacheManagerService, 'set')
        .mockResolvedValue(undefined);

      const result = await service.getOverview();

      expect(result.overallUptime).toBeDefined();
      expect(typeof result.overallUptime).toBe('number');
    });

    it('should handle zero uptime when no checks recorded', async () => {
      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(null);
      jest
        .spyOn(endpointRepository, 'count')
        .mockResolvedValue(0);
      jest
        .spyOn(endpointRepository, 'createQueryBuilder')
        .mockReturnValue({
          ...mockQueryBuilder,
          getRawMany: jest.fn().mockResolvedValue([]),
        } as any);
      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValue({
          ...mockQueryBuilder,
          getRawOne: jest.fn().mockResolvedValue({ uptime: '0' }),
        } as any);
      jest
        .spyOn(incidentRepository, 'count')
        .mockResolvedValue(0);
      jest
        .spyOn(cacheManagerService, 'set')
        .mockResolvedValue(undefined);

      const result = await service.getOverview();

      expect(result.overallUptime).toBe(0);
    });
  });

  describe('Status breakdown', () => {
    it('should return status breakdown with all statuses', async () => {
      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(null);
      jest
        .spyOn(endpointRepository, 'count')
        .mockResolvedValue(4);
      jest
        .spyOn(endpointRepository, 'createQueryBuilder')
        .mockReturnValue({
          ...mockQueryBuilder,
          getRawMany: jest.fn().mockResolvedValue([
            { status: EndpointStatus.UP, count: '1' },
            { status: EndpointStatus.DOWN, count: '1' },
            { status: EndpointStatus.DEGRADED, count: '1' },
            { status: EndpointStatus.UNKNOWN, count: '1' },
          ]),
        } as any);
      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValue({
          ...mockQueryBuilder,
          getRawOne: jest.fn().mockResolvedValue({ uptime: '75' }),
        } as any);
      jest
        .spyOn(incidentRepository, 'count')
        .mockResolvedValue(0);
      jest
        .spyOn(cacheManagerService, 'set')
        .mockResolvedValue(undefined);

      const result = await service.getOverview();

      expect(result.statusBreakdown).toBeDefined();
      expect(result.statusBreakdown.UP).toBe(1);
      expect(result.statusBreakdown.DOWN).toBe(1);
      expect(result.statusBreakdown.DEGRADED).toBe(1);
      expect(result.statusBreakdown.UNKNOWN).toBe(1);
    });

    it('should handle missing statuses in breakdown', async () => {
      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(null);
      jest
        .spyOn(endpointRepository, 'count')
        .mockResolvedValue(1);
      jest
        .spyOn(endpointRepository, 'createQueryBuilder')
        .mockReturnValue({
          ...mockQueryBuilder,
          getRawMany: jest.fn().mockResolvedValue([
            { status: EndpointStatus.UP, count: '1' },
          ]),
        } as any);
      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValue({
          ...mockQueryBuilder,
          getRawOne: jest.fn().mockResolvedValue({ uptime: '100' }),
        } as any);
      jest
        .spyOn(incidentRepository, 'count')
        .mockResolvedValue(0);
      jest
        .spyOn(cacheManagerService, 'set')
        .mockResolvedValue(undefined);

      const result = await service.getOverview();

      expect(result.statusBreakdown.DOWN).toBe(0);
      expect(result.statusBreakdown.DEGRADED).toBe(0);
      expect(result.statusBreakdown.UNKNOWN).toBe(0);
    });
  });

  describe('Incident tracking', () => {
    it('should count active incidents correctly', async () => {
      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(null);
      jest
        .spyOn(endpointRepository, 'count')
        .mockResolvedValue(1);
      jest
        .spyOn(endpointRepository, 'createQueryBuilder')
        .mockReturnValue({
          ...mockQueryBuilder,
          getRawMany: jest.fn().mockResolvedValue([
            { status: EndpointStatus.DOWN, count: '1' },
          ]),
        } as any);
      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValue({
          ...mockQueryBuilder,
          getRawOne: jest.fn().mockResolvedValue({ uptime: '0' }),
        } as any);
      jest
        .spyOn(incidentRepository, 'count')
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(1);
      jest
        .spyOn(cacheManagerService, 'set')
        .mockResolvedValue(undefined);

      const result = await service.getOverview();

      expect(result.activeIncidents).toBe(3);
      expect(result.totalIncidentsLast24h).toBe(1);
    });

    it('should handle incidents 24h window correctly', async () => {
      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(null);
      jest
        .spyOn(endpointRepository, 'count')
        .mockResolvedValue(1);
      jest
        .spyOn(endpointRepository, 'createQueryBuilder')
        .mockReturnValue({
          ...mockQueryBuilder,
          getRawMany: jest.fn().mockResolvedValue([
            { status: EndpointStatus.UP, count: '1' },
          ]),
        } as any);
      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValue({
          ...mockQueryBuilder,
          getRawOne: jest.fn().mockResolvedValue({ uptime: '100' }),
        } as any);
      jest
        .spyOn(incidentRepository, 'count')
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      jest
        .spyOn(cacheManagerService, 'set')
        .mockResolvedValue(undefined);

      const result = await service.getOverview();

      expect(result.activeIncidents).toBe(0);
      expect(result.totalIncidentsLast24h).toBe(0);
    });
  });

  describe('Response time calculations', () => {
    it('should calculate average response time correctly', async () => {
      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(null);
      jest
        .spyOn(endpointRepository, 'count')
        .mockResolvedValue(1);
      jest
        .spyOn(endpointRepository, 'createQueryBuilder')
        .mockReturnValue({
          ...mockQueryBuilder,
          getRawMany: jest.fn().mockResolvedValue([
            { status: EndpointStatus.UP, count: '1' },
          ]),
        } as any);
      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValueOnce({
          ...mockQueryBuilder,
          getRawOne: jest.fn().mockResolvedValue({ uptime: '99.5' }),
        } as any)
        .mockReturnValueOnce({
          ...mockQueryBuilder,
          getRawOne: jest.fn().mockResolvedValue({ avg: '250' }),
        } as any);
      jest
        .spyOn(incidentRepository, 'count')
        .mockResolvedValue(0);
      jest
        .spyOn(cacheManagerService, 'set')
        .mockResolvedValue(undefined);

      const result = await service.getOverview();

      expect(result.averageResponseTime).toBe(250);
    });

    it('should handle zero response time when no successful checks', async () => {
      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(null);
      jest
        .spyOn(endpointRepository, 'count')
        .mockResolvedValue(1);
      jest
        .spyOn(endpointRepository, 'createQueryBuilder')
        .mockReturnValue({
          ...mockQueryBuilder,
          getRawMany: jest.fn().mockResolvedValue([
            { status: EndpointStatus.DOWN, count: '1' },
          ]),
        } as any);
      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValueOnce({
          ...mockQueryBuilder,
          getRawOne: jest.fn().mockResolvedValue({ uptime: '0' }),
        } as any)
        .mockReturnValueOnce({
          ...mockQueryBuilder,
          getRawOne: jest.fn().mockResolvedValue({ avg: '0' }),
        } as any);
      jest
        .spyOn(incidentRepository, 'count')
        .mockResolvedValue(0);
      jest
        .spyOn(cacheManagerService, 'set')
        .mockResolvedValue(undefined);

      const result = await service.getOverview();

      expect(result.averageResponseTime).toBe(0);
    });
  });

  describe('Cache behavior', () => {
    it('should use 5-minute cache expiration for comparison', async () => {
      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(null);
      jest
        .spyOn(endpointRepository, 'find')
        .mockResolvedValue([]);
      jest
        .spyOn(cacheManagerService, 'set')
        .mockResolvedValue(undefined);

      await service.getComparison();

      expect(cacheManagerService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        300,
      );
    });

    it('should include cachedAt timestamp in overview', async () => {
      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(null);
      jest
        .spyOn(endpointRepository, 'count')
        .mockResolvedValue(1);
      jest
        .spyOn(endpointRepository, 'createQueryBuilder')
        .mockReturnValue({
          ...mockQueryBuilder,
          getRawMany: jest.fn().mockResolvedValue([
            { status: EndpointStatus.UP, count: '1' },
          ]),
        } as any);
      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValue({
          ...mockQueryBuilder,
          getRawOne: jest.fn().mockResolvedValue({ uptime: '99.5' }),
        } as any);
      jest
        .spyOn(incidentRepository, 'count')
        .mockResolvedValue(0);
      jest
        .spyOn(cacheManagerService, 'set')
        .mockResolvedValue(undefined);

      const result = await service.getOverview();

      expect(result.cachedAt).toBeDefined();
      expect(result.cachedAt instanceof Date).toBe(true);
    });
  });
});
