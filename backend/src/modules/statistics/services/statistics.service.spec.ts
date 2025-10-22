import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
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
  let cacheManagerService: CacheManagerService;
  let uptimeCalculatorService: UptimeCalculatorService;
  let responseTimeAnalyzerService: ResponseTimeAnalyzerService;
  let incidentService: IncidentService;

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

  const mockEndpointRepository = {
    find: jest.fn(),
    count: jest.fn(),
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
        timeSeries: [],
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

      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(mockCacheValue);

      const result = await service.getOverview();

      expect(result).toBeDefined();
      expect(result.totalEndpoints).toBeDefined();
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
      });

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
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

      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(mockCacheValue);

      const result = await service.getComparison();

      expect(result).toBeDefined();
      expect(result.endpoints.length).toBe(2);
    });
  });

  describe('calculateStabilityScore', () => {
    it('should calculate stability score based on uptime and response time', async () => {
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

      const result = await service.getOverview();

      expect(cacheManagerService.get).toHaveBeenCalled();
      expect(result).toEqual(mockCacheValue);
    });
  });
});
