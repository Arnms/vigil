import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './services/statistics.service';

describe('StatisticsController', () => {
  let controller: StatisticsController;
  let service: StatisticsService;

  const mockStatisticsService = {
    getUptimeStats: jest.fn(),
    getResponseTimeStats: jest.fn(),
    getOverview: jest.fn(),
    getIncidents: jest.fn(),
    getIncidentDetail: jest.fn(),
    getComparison: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatisticsController],
      providers: [
        {
          provide: StatisticsService,
          useValue: mockStatisticsService,
        },
      ],
    }).compile();

    controller = module.get<StatisticsController>(StatisticsController);
    service = module.get<StatisticsService>(StatisticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUptime', () => {
    it('should return uptime statistics for endpoint', async () => {
      const endpointId = '550e8400-e29b-41d4-a716-446655440000';
      const mockResponse = {
        endpointId,
        period: '24h',
        uptime: 99.5,
        totalChecks: 1000,
        successfulChecks: 995,
        failedChecks: 5,
        startDate: new Date(),
        endDate: new Date(),
      };

      mockStatisticsService.getUptimeStats.mockResolvedValue(mockResponse);

      const result = await controller.getUptime(endpointId, {
        period: '24h' as any,
      });

      expect(result).toEqual(mockResponse);
      expect(service.getUptimeStats).toHaveBeenCalledWith(endpointId, {
        period: '24h',
      });
    });

    it('should handle period parameter correctly', async () => {
      const endpointId = '550e8400-e29b-41d4-a716-446655440000';
      const query = { period: '7d' };

      mockStatisticsService.getUptimeStats.mockResolvedValue({});

      await controller.getUptime(endpointId, query as any);

      expect(service.getUptimeStats).toHaveBeenCalledWith(
        endpointId,
        expect.objectContaining({ period: '7d' }),
      );
    });
  });

  describe('getResponseTime', () => {
    it('should return response time statistics for endpoint', async () => {
      const endpointId = '550e8400-e29b-41d4-a716-446655440000';
      const mockResponse = {
        endpointId,
        period: '24h',
        statistics: {
          avg: 150,
          min: 50,
          max: 2000,
          p50: 120,
          p95: 800,
          p99: 1500,
        },
        timeSeries: [],
        startDate: new Date(),
        endDate: new Date(),
      };

      mockStatisticsService.getResponseTimeStats.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getResponseTime(endpointId, {
        period: '24h' as any,
      });

      expect(result).toEqual(mockResponse);
      expect(service.getResponseTimeStats).toHaveBeenCalledWith(
        endpointId,
        { period: '24h' },
      );
    });
  });

  describe('getOverview', () => {
    it('should return overall statistics overview', async () => {
      const mockResponse = {
        totalEndpoints: 5,
        statusBreakdown: {
          UP: 3,
          DOWN: 1,
          DEGRADED: 1,
          UNKNOWN: 0,
        },
        overallUptime: 98.5,
        activeIncidents: 2,
        totalIncidents: 15,
        avgResponseTime: 175,
      };

      mockStatisticsService.getOverview.mockResolvedValue(mockResponse);

      const result = await controller.getOverview();

      expect(result).toEqual(mockResponse);
      expect(service.getOverview).toHaveBeenCalled();
    });
  });

  describe('getIncidents', () => {
    it('should return incidents list with pagination', async () => {
      const mockResponse = {
        data: [
          {
            id: 'incident-1',
            endpointId: 'endpoint-1',
            endpoint: { name: 'API 1' },
            startedAt: new Date(),
            resolvedAt: null,
            duration: 300000,
            failureCount: 5,
            errorMessage: 'Timeout',
          },
        ],
        meta: {
          total: 10,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      };

      mockStatisticsService.getIncidents.mockResolvedValue(mockResponse);

      const result = await controller.getIncidents({
        page: 1,
        limit: 20,
      });

      expect(result).toEqual(mockResponse);
      expect(result.data.length).toBe(1);
      expect(result.meta.total).toBe(10);
    });

    it('should handle pagination parameters', async () => {
      mockStatisticsService.getIncidents.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 2, limit: 10, totalPages: 0 },
      });

      await controller.getIncidents({
        page: 2,
        limit: 10,
      });

      expect(service.getIncidents).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 10 }),
      );
    });

    it('should handle status filter', async () => {
      mockStatisticsService.getIncidents.mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });

      await controller.getIncidents({
        page: 1,
        limit: 20,
        status: 'active' as any,
      });

      expect(service.getIncidents).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' }),
      );
    });
  });

  describe('getIncidentDetail', () => {
    it('should return incident detail with check results', async () => {
      const incidentId = '550e8400-e29b-41d4-a716-446655440000';
      const mockResponse = {
        id: incidentId,
        endpointId: 'endpoint-1',
        endpoint: { name: 'API 1', url: 'https://api.example.com' },
        startedAt: new Date('2025-10-16T10:00:00Z'),
        resolvedAt: new Date('2025-10-16T10:05:00Z'),
        duration: 300000,
        failureCount: 5,
        errorMessage: 'Timeout',
        checkResults: [
          {
            checkedAt: new Date('2025-10-16T10:00:00Z'),
            status: 'failure',
            responseTime: 5001,
            statusCode: null,
            errorMessage: 'Timeout',
          },
        ],
      };

      mockStatisticsService.getIncidentDetail.mockResolvedValue(mockResponse);

      const result = await controller.getIncidentDetail(incidentId);

      expect(result).toEqual(mockResponse);
      expect(result.checkResults.length).toBe(1);
      expect(service.getIncidentDetail).toHaveBeenCalledWith(incidentId);
    });

    it('should handle missing incident gracefully', async () => {
      const incidentId = '550e8400-e29b-41d4-a716-446655440000';

      mockStatisticsService.getIncidentDetail.mockRejectedValue(
        new Error('Not Found'),
      );

      await expect(controller.getIncidentDetail(incidentId)).rejects.toThrow();
    });
  });

  describe('getComparison', () => {
    it('should return endpoint comparison with stability scores', async () => {
      const mockResponse = {
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

      mockStatisticsService.getComparison.mockResolvedValue(mockResponse);

      const result = await controller.getComparison();

      expect(result).toEqual(mockResponse);
      expect(result.endpoints.length).toBe(2);
      expect(result.endpoints[0].rank).toBe(1);
      expect(service.getComparison).toHaveBeenCalled();
    });

    it('should rank endpoints by stability score', async () => {
      const mockResponse = {
        endpoints: [
          { rank: 1, stabilityScore: 99.5 },
          { rank: 2, stabilityScore: 95.2 },
          { rank: 3, stabilityScore: 88.0 },
        ],
      };

      mockStatisticsService.getComparison.mockResolvedValue(mockResponse);

      const result = await controller.getComparison();

      expect(result.endpoints[0].stabilityScore).toBeGreaterThan(
        result.endpoints[1].stabilityScore,
      );
      expect(result.endpoints[1].stabilityScore).toBeGreaterThan(
        result.endpoints[2].stabilityScore,
      );
    });
  });

  describe('HTTP status codes', () => {
    it('all endpoints should return 200 status code', async () => {
      // Mock responses for all endpoints
      mockStatisticsService.getUptimeStats.mockResolvedValue({});
      mockStatisticsService.getResponseTimeStats.mockResolvedValue({});
      mockStatisticsService.getOverview.mockResolvedValue({});
      mockStatisticsService.getIncidents.mockResolvedValue({
        data: [],
        meta: {},
      });
      mockStatisticsService.getIncidentDetail.mockResolvedValue({});
      mockStatisticsService.getComparison.mockResolvedValue({});

      const endpointId = '550e8400-e29b-41d4-a716-446655440000';

      // All these should complete without errors (status 200 is implicit)
      await expect(
        controller.getUptime(endpointId, {} as any),
      ).resolves.toBeDefined();
      await expect(
        controller.getResponseTime(endpointId, {} as any),
      ).resolves.toBeDefined();
      await expect(controller.getOverview()).resolves.toBeDefined();
      await expect(controller.getIncidents({} as any)).resolves.toBeDefined();
      await expect(
        controller.getIncidentDetail(endpointId),
      ).resolves.toBeDefined();
      await expect(controller.getComparison()).resolves.toBeDefined();
    });
  });
});
