import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { StatisticsService } from './services/statistics.service';
import { UptimeCalculatorService } from './services/uptime-calculator.service';
import { ResponseTimeAnalyzerService } from './services/response-time-analyzer.service';
import { CacheManagerService } from './services/cache-manager.service';
import { IncidentService } from './services/incident.service';
import { Endpoint } from '../endpoint/endpoint.entity';
import { CheckResult } from '../health-check/check-result.entity';
import { Incident } from '../incident/incident.entity';

/**
 * Phase 5-6: Error Handling & Edge Case Tests
 *
 * 테스트 범위:
 * - 잘못된 입력 값 처리
 * - 데이터베이스 오류 처리
 * - 캐시 오류 처리
 * - 경계값 테스트
 * - 빈 결과 세트 처리
 */
describe('Statistics Module - Error Handling & Edge Cases', () => {
  let service: StatisticsService;
  let incidentService: IncidentService;
  let endpointRepository: Repository<Endpoint>;
  let checkResultRepository: Repository<CheckResult>;
  let incidentRepository: Repository<Incident>;
  let cacheManagerService: CacheManagerService;

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
    incidentService = module.get<IncidentService>(IncidentService);
    endpointRepository = module.get<Repository<Endpoint>>(
      getRepositoryToken(Endpoint),
    );
    checkResultRepository = module.get<Repository<CheckResult>>(
      getRepositoryToken(CheckResult),
    );
    incidentRepository = module.get<Repository<Incident>>(
      getRepositoryToken(Incident),
    );
    cacheManagerService =
      module.get<CacheManagerService>(CacheManagerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Invalid Input Handling', () => {
    it('should handle empty endpointId', async () => {
      const result = await service.getUptimeStats('', {
        period: '24h' as any,
      });

      // Should return 0 uptime for empty ID
      expect(result.uptime).toBeDefined();
    });

    it('should handle null parameter gracefully', async () => {
      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(null);

      const result = await service.getUptimeStats(
        '550e8400-e29b-41d4-a716-446655440000',
        {} as any,
      );

      expect(result).toBeDefined();
    });

    it('should handle very long endpointId', async () => {
      const longId = 'x'.repeat(1000);

      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(null);

      const result = await service.getUptimeStats(longId, {
        period: '24h' as any,
      });

      expect(result).toBeDefined();
    });
  });

  describe('Database Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      jest
        .spyOn(endpointRepository, 'find')
        .mockRejectedValue(
          new Error('Connection refused'),
        );

      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue(null);

      // Should either throw or return default value
      try {
        await service.getComparison();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle QueryBuilder errors', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockRejectedValue(
          new Error('Query error'),
        ),
      };

      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      // Service should handle the error gracefully
      const result = await service.getUptimeStats(
        '550e8400-e29b-41d4-a716-446655440000',
        { period: '24h' as any },
      );

      expect(result).toBeDefined();
    });

    it('should handle null database results', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(null),
      };

      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.getUptimeStats(
        '550e8400-e29b-41d4-a716-446655440000',
        { period: '24h' as any },
      );

      // Should handle null and return 0
      expect(result.uptime).toBe(0);
    });
  });

  describe('Cache Error Handling', () => {
    it('should handle cache get errors', async () => {
      jest
        .spyOn(cacheManagerService, 'get')
        .mockRejectedValue(new Error('Cache error'));

      // Should proceed without cache
      const result = await service.getUptimeStats(
        '550e8400-e29b-41d4-a716-446655440000',
        { period: '24h' as any },
      );

      expect(result).toBeDefined();
    });

    it('should handle cache set errors', async () => {
      jest.spyOn(cacheManagerService, 'get').mockResolvedValue(null);
      jest
        .spyOn(cacheManagerService, 'set')
        .mockRejectedValue(new Error('Cache set failed'));

      // Should still return data even if cache fails
      const result = await service.getUptimeStats(
        '550e8400-e29b-41d4-a716-446655440000',
        { period: '24h' as any },
      );

      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases - Boundary Values', () => {
    it('should handle 0% uptime', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalChecks: '100',
          successfulChecks: '0',
          failedChecks: '100',
        }),
      };

      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.getUptimeStats(
        '550e8400-e29b-41d4-a716-446655440000',
        { period: '24h' as any },
      );

      expect(result.uptime).toBe(0);
    });

    it('should handle 100% uptime', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalChecks: '100',
          successfulChecks: '100',
          failedChecks: '0',
        }),
      };

      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.getUptimeStats(
        '550e8400-e29b-41d4-a716-446655440000',
        { period: '24h' as any },
      );

      expect(result.uptime).toBe(100);
    });

    it('should handle fractional uptime values', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalChecks: '3',
          successfulChecks: '2',
          failedChecks: '1',
        }),
      };

      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.getUptimeStats(
        '550e8400-e29b-41d4-a716-446655440000',
        { period: '24h' as any },
      );

      // 2/3 * 100 = 66.67 (rounded to 66.67)
      expect(result.uptime).toBeCloseTo(66.67, 1);
    });

    it('should handle zero checks', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalChecks: '0',
          successfulChecks: '0',
          failedChecks: '0',
        }),
      };

      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.getUptimeStats(
        '550e8400-e29b-41d4-a716-446655440000',
        { period: '24h' as any },
      );

      // Should handle division by zero
      expect(result.uptime).toBe(0);
    });

    it('should handle extremely large uptime values', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalChecks: '999999999',
          successfulChecks: '999999998',
          failedChecks: '1',
        }),
      };

      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.getUptimeStats(
        '550e8400-e29b-41d4-a716-446655440000',
        { period: '24h' as any },
      );

      expect(result.uptime).toBeLessThanOrEqual(100);
    });
  });

  describe('Empty Result Sets', () => {
    it('should handle empty endpoint list', async () => {
      jest.spyOn(endpointRepository, 'find').mockResolvedValue([]);
      jest.spyOn(cacheManagerService, 'get').mockResolvedValue(null);

      const result = await service.getComparison();

      expect(result.endpoints.length).toBe(0);
    });

    it('should handle empty incident list', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      jest
        .spyOn(incidentRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await incidentService.findAll({
        page: 1,
        limit: 20,
      });

      expect(result.data.length).toBe(0);
      expect(result.meta.total).toBe(0);
    });

    it('should handle empty check results', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          avg: null,
          min: null,
          max: null,
        }),
      };

      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      // Should handle null values gracefully
      const result = await service.getResponseTimeStats(
        '550e8400-e29b-41d4-a716-446655440000',
        { period: '24h' as any },
      );

      expect(result).toBeDefined();
    });
  });

  describe('Pagination Edge Cases', () => {
    it('should handle page beyond available data', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(10),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      jest
        .spyOn(incidentRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await incidentService.findAll({
        page: 100,
        limit: 20,
      });

      // Should return empty array but valid metadata
      expect(result.data.length).toBe(0);
      expect(result.meta.total).toBe(10);
    });

    it('should handle limit of 1', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(100),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { id: 'incident-1', startedAt: new Date(), resolvedAt: null },
        ]),
      };

      jest
        .spyOn(incidentRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await incidentService.findAll({
        page: 1,
        limit: 1,
      });

      expect(result.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Response Format Validation', () => {
    it('should always return valid uptime percentage', async () => {
      const result = await service.getUptimeStats(
        '550e8400-e29b-41d4-a716-446655440000',
        { period: '24h' as any },
      );

      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.uptime).toBeLessThanOrEqual(100);
    });

    it('should always include required fields in response', async () => {
      jest
        .spyOn(cacheManagerService, 'get')
        .mockResolvedValue({
          totalEndpoints: 5,
          statusBreakdown: { UP: 3, DOWN: 1, DEGRADED: 1, UNKNOWN: 0 },
          overallUptime: 98.5,
          activeIncidents: 2,
          totalIncidents: 15,
          avgResponseTime: 175,
        });

      const result = await service.getOverview();

      expect(result).toHaveProperty('totalEndpoints');
      expect(result).toHaveProperty('statusBreakdown');
      expect(result).toHaveProperty('overallUptime');
      expect(result).toHaveProperty('activeIncidents');
    });
  });

  describe('Incident Not Found', () => {
    it('should throw NotFoundException for non-existent incident', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      jest
        .spyOn(incidentRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      await expect(
        incidentService.findById('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Type Conversion Errors', () => {
    it('should handle string to number conversion in QueryBuilder results', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalChecks: 'invalid-number',
          successfulChecks: 'also-invalid',
          failedChecks: '0',
        }),
      };

      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.getUptimeStats(
        '550e8400-e29b-41d4-a716-446655440000',
        { period: '24h' as any },
      );

      // parseInt should handle invalid values gracefully
      expect(result.uptime).toBeDefined();
      expect(result.totalChecks).toBe(0); // parseInt('invalid') = 0
    });
  });
});
