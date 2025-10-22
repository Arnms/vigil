import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UptimeCalculatorService } from './uptime-calculator.service';
import { CheckResult } from '../../health-check/check-result.entity';
import { UptimePeriod } from '../dto/uptime-query.dto';

describe('UptimeCalculatorService', () => {
  let service: UptimeCalculatorService;
  let checkResultRepository: Repository<CheckResult>;

  const mockCheckResultRepository = {
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UptimeCalculatorService,
        {
          provide: getRepositoryToken(CheckResult),
          useValue: mockCheckResultRepository,
        },
      ],
    }).compile();

    service = module.get<UptimeCalculatorService>(UptimeCalculatorService);
    checkResultRepository = module.get<Repository<CheckResult>>(
      getRepositoryToken(CheckResult),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculate', () => {
    it('should calculate uptime for 24h period', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalChecks: '100',
          successfulChecks: '95',
          failedChecks: '5',
        }),
      };

      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.calculate('endpoint-id', {
        period: UptimePeriod.TWENTY_FOUR_HOURS,
      });

      expect(result.uptime).toBe(95);
      expect(result.totalChecks).toBe(100);
      expect(result.successfulChecks).toBe(95);
      expect(result.failedChecks).toBe(5);
      expect(result.period).toBe(UptimePeriod.TWENTY_FOUR_HOURS);
    });

    it('should handle zero checks gracefully', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
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

      const result = await service.calculate('endpoint-id', {
        period: UptimePeriod.TWENTY_FOUR_HOURS,
      });

      expect(result.uptime).toBe(0);
      expect(result.totalChecks).toBe(0);
    });

    it('should calculate uptime for custom period', async () => {
      const startDate = new Date('2025-10-15T00:00:00Z');
      const endDate = new Date('2025-10-16T00:00:00Z');

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalChecks: '200',
          successfulChecks: '198',
          failedChecks: '2',
        }),
      };

      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.calculate('endpoint-id', {
        period: UptimePeriod.CUSTOM,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      expect(result.uptime).toBe(99);
    });

    it('should calculate uptime for 7d period', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalChecks: '10080',
          successfulChecks: '10000',
          failedChecks: '80',
        }),
      };

      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.calculate('endpoint-id', {
        period: UptimePeriod.SEVEN_DAYS,
      });

      expect(result.uptime).toBeCloseTo(99.21, 1);
    });

    it('should round uptime to 2 decimal places', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          totalChecks: '3',
          successfulChecks: '1',
          failedChecks: '2',
        }),
      };

      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.calculate('endpoint-id', {
        period: UptimePeriod.TWENTY_FOUR_HOURS,
      });

      expect(result.uptime).toBe(33.33);
    });
  });
});
