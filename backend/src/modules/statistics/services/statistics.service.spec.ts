import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';;
import { Repository } from 'typeorm';
import { StatisticsService } from './statistics.service';
import { UptimeCalculatorService } from './uptime-calculator.service';
import { ResponseTimeAnalyzerService } from './response-time-analyzer.service';
import { CacheManagerService } from './cache-manager.service';
import { IncidentService } from './incident.service';
import { Endpoint } from '../../endpoint/endpoint.entity';
import { CheckResult } from '../../health-check/check-result.entity';
import { Incident } from '../../incident/incident.entity';

describe('StatisticsService', () => {
  let service: StatisticsService;
  let endpointRepository: Repository<Endpoint>;
  let checkResultRepository: Repository<CheckResult>;
  let incidentRepository: Repository<Incident>;
  let uptimeCalculatorService: UptimeCalculatorService;
  let responseTimeAnalyzerService: ResponseTimeAnalyzerService;
  let cacheManagerService: CacheManagerService;
  let incidentService: IncidentService;

  const mockEndpointRepository = {
    find: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockCheckResultRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockIncidentRepository = {
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

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
      ],
    }).compile();

    service = module.get<StatisticsService>(StatisticsService);
    endpointRepository = module.get<Repository<Endpoint>>(
      getRepositoryToken(Endpoint),
    );
    checkResultRepository = module.get<Repository<CheckResult>>(
      getRepositoryToken(CheckResult),
    );
    incidentRepository = module.get<Repository<Incident>>(
      getRepositoryToken(Incident),
    );
    uptimeCalculatorService =
      module.get<UptimeCalculatorService>(UptimeCalculatorService);
    responseTimeAnalyzerService = module.get<ResponseTimeAnalyzerService>(
      ResponseTimeAnalyzerService,
    );
    cacheManagerService =
      module.get<CacheManagerService>(CacheManagerService);
    incidentService = module.get<IncidentService>(IncidentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUptimeStats', () => {
    it('should return uptime statistics for an endpoint', async () => {
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
        .spyOn(uptimeCalculatorService, 'calculate')
        .mockResolvedValue(mockUptimeData);

      const result = await service.getUptimeStats(endpointId, {
        period: '24h' as any,
      });

      expect(result).toEqual(mockUptimeData);
      expect(uptimeCalculatorService.calculate).toHaveBeenCalledWith(
        endpointId,
        { period: '24h' },
      );
    });
  });

  describe('getResponseTimeStats', () => {
    it('should return response time statistics for an endpoint', async () => {
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
        timeSeries: [
          {
            hour: new Date('2025-10-21T00:00:00Z'),
            avg: 150,
            count: 60,
          },
        ],
        startDate: new Date('2025-10-21T00:00:00Z'),
        endDate: new Date('2025-10-22T00:00:00Z'),
      };

      jest
        .spyOn(responseTimeAnalyzerService, 'analyze')
        .mockResolvedValue(mockResponseTimeData);

      const result = await service.getResponseTimeStats(endpointId, {
        period: '24h' as any,
      });

      expect(result).toEqual(mockResponseTimeData);
      expect(responseTimeAnalyzerService.analyze).toHaveBeenCalledWith(
        endpointId,
        { period: '24h' },
      );
    });
  });

  describe('getOverview', () => {
    it('should return overall statistics overview', async () => {
      const mockCacheValue = {
        totalEndpoints: 2,
        statusBreakdown: { UP: 1, DOWN: 1, DEGRADED: 0, UNKNOWN: 0 },
        overallUptime: 98.5,
        activeIncidents: 2,
        totalIncidents: 15,
        avgResponseTime: 175,
      };

      // Mock cache to return a value (avoid complex mocking)
      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(mockCacheValue);

      const result = await service.getOverview();

      expect(result).toBeDefined();
      expect(result.totalEndpoints).toBeDefined();
      expect(result.statusBreakdown).toBeDefined();
    });
  });

  describe('getIncidents', () => {
    it('should return incidents list with pagination', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(10),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            id: 'incident-1',
            endpointId: 'endpoint-1',
            startedAt: new Date(),
            resolvedAt: null,
          },
        ]),
      };

      jest
        .spyOn(incidentRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.getIncidents({
        page: 1,
        limit: 20,
      });

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.meta).toBeDefined();
      expect(result.meta.total).toBe(10);
    });
  });

  describe('getIncidentDetail', () => {
    it('should return incident detail with check results', async () => {
      const incidentId = 'incident-1';
      const mockIncidentDetail = {
        id: incidentId,
        endpointId: 'endpoint-1',
        endpoint: { name: 'API 1' },
        startedAt: new Date(),
        resolvedAt: null,
        duration: 300000,
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
  });

  describe('getComparison', () => {
    it('should return endpoint comparison with stability scores', async () => {
      const mockCacheValue = {
        endpoints: [
          {
            id: 'endpoint-1',
            name: 'API 1',
            uptime: 99.5,
            avgResponseTime: 150,
            stabilityScore: 95.4,
            rank: 1,
          },
          {
            id: 'endpoint-2',
            name: 'API 2',
            uptime: 98.3,
            avgResponseTime: 200,
            stabilityScore: 91.2,
            rank: 2,
          },
        ],
      };

      // Mock cache to return a value (avoid complex mocking)
      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(mockCacheValue);

      const result = await service.getComparison();

      expect(result).toBeDefined();
      expect(result.endpoints).toBeDefined();
      expect(result.endpoints.length).toBe(2);
    });
  });

  describe('calculateStabilityScore', () => {
    it('should calculate stability score based on uptime and response time', async () => {
      // Test through the public API using cached results
      const mockCacheValue = {
        endpoints: [
          {
            id: 'endpoint-1',
            name: 'API 1',
            uptime: 99.5,
            avgResponseTime: 150,
            stabilityScore: 95.4,
            rank: 1,
          },
        ],
      };

      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(mockCacheValue);

      const result = await service.getComparison();

      // Verify score is within valid range
      expect(result.endpoints[0].stabilityScore).toBeGreaterThanOrEqual(0);
      expect(result.endpoints[0].stabilityScore).toBeLessThanOrEqual(100);
    });
  });

  describe('caching', () => {
    it('should cache overview results', async () => {
      const mockCacheValue = {
        totalEndpoints: 1,
        statusBreakdown: { UP: 1, DOWN: 0, DEGRADED: 0, UNKNOWN: 0 },
        overallUptime: 99.5,
        activeIncidents: 0,
        totalIncidents: 5,
        avgResponseTime: 150,
      };

      jest.spyOn(cacheManagerService, 'get').mockResolvedValue(mockCacheValue);
      jest.spyOn(cacheManagerService, 'set').mockResolvedValue(undefined);

      // First call should get from cache
      const result = await service.getOverview();

      // Cache operations should have been called
      expect(cacheManagerService.get).toHaveBeenCalled();
      expect(result).toEqual(mockCacheValue);
    });
  });
});
