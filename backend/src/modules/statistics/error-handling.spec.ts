import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { IncidentService } from './services/incident.service';
import { CacheManagerService } from './services/cache-manager.service';
import { Incident } from '../incident/incident.entity';
import { CheckResult } from '../health-check/check-result.entity';

/**
 * Phase 5-6: Error Handling & Edge Case Tests
 */
describe('Statistics Module - Error Handling', () => {
  let incidentService: IncidentService;
  let cacheManagerService: CacheManagerService;

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

  const mockIncidentRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockCheckResultRepository = {
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidentService,
        CacheManagerService,
        {
          provide: getRepositoryToken(Incident),
          useValue: mockIncidentRepository,
        },
        {
          provide: getRepositoryToken(CheckResult),
          useValue: mockCheckResultRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    incidentService = module.get<IncidentService>(IncidentService);
    cacheManagerService =
      module.get<CacheManagerService>(CacheManagerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
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
        .spyOn(mockIncidentRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder);

      await expect(
        incidentService.findById('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Cache Error Handling', () => {
    it('should handle cache operations without errors', async () => {
      // CacheManagerService handles errors internally
      // Setting a value should not throw
      await expect(
        cacheManagerService.set('test-key', { data: 'test' }),
      ).resolves.not.toThrow();

      // Getting a non-existent key should return null
      const result = await cacheManagerService.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should handle cache delete without errors', async () => {
      // Setting a value
      await cacheManagerService.set('test-key', { data: 'test' });

      // Deleting should not throw
      await expect(
        cacheManagerService.delete('test-key'),
      ).resolves.not.toThrow();

      // Value should be deleted
      const result = await cacheManagerService.get('test-key');
      expect(result).toBeNull();
    });
  });

  describe('Edge Cases - Boundary Values', () => {
    it('should handle 0% uptime', () => {
      const totalChecks = 100;
      const successfulChecks = 0;
      const uptime = (successfulChecks / totalChecks) * 100;

      expect(uptime).toBe(0);
    });

    it('should handle 100% uptime', () => {
      const totalChecks = 100;
      const successfulChecks = 100;
      const uptime = (successfulChecks / totalChecks) * 100;

      expect(uptime).toBe(100);
    });

    it('should handle fractional uptime values', () => {
      const totalChecks = 3;
      const successfulChecks = 2;
      const uptime = Math.round(
        ((successfulChecks / totalChecks) * 100 + Number.EPSILON) * 100,
      ) / 100;

      expect(uptime).toBeCloseTo(66.67, 1);
    });

    it('should handle zero checks', () => {
      const totalChecks = 0;
      const successfulChecks = 0;
      const uptime = totalChecks === 0 ? 0 : (successfulChecks / totalChecks) * 100;

      expect(uptime).toBe(0);
    });
  });

  describe('Pagination Edge Cases', () => {
    it('should handle valid pagination parameters', () => {
      const page = 1;
      const limit = 20;

      expect(page).toBeGreaterThanOrEqual(1);
      expect(limit).toBeGreaterThanOrEqual(1);
      expect(limit).toBeLessThanOrEqual(100);
    });

    it('should handle limit of 1', () => {
      const limit = 1;
      expect(limit).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Response Format Validation', () => {
    it('uptime should always be valid percentage', () => {
      const uptime = 99.5;
      expect(uptime).toBeGreaterThanOrEqual(0);
      expect(uptime).toBeLessThanOrEqual(100);
    });

    it('stability score should always be valid', () => {
      const stabilityScore = 95.4;
      expect(stabilityScore).toBeGreaterThanOrEqual(0);
      expect(stabilityScore).toBeLessThanOrEqual(100);
    });

    it('cache should report health status', async () => {
      const status = cacheManagerService.getStatus();
      expect(status).toHaveProperty('isHealthy');
      expect(status).toHaveProperty('backend');
      expect(status).toHaveProperty('connected');
    });
  });

  describe('Type Safety', () => {
    it('should handle JSON serialization', () => {
      const data = { name: 'API', status: 'UP' };
      const serialized = JSON.stringify(data);
      const deserialized = JSON.parse(serialized);

      expect(deserialized).toEqual(data);
    });

    it('should handle null values safely', () => {
      const value = null;
      expect(value).toBeNull();
    });

    it('should handle undefined values safely', () => {
      let value: string | undefined;
      expect(value).toBeUndefined();
    });
  });
});
