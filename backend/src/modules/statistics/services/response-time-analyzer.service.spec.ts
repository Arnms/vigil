import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResponseTimeAnalyzerService } from './response-time-analyzer.service';
import { CheckResult } from '../../health-check/check-result.entity';
import { ResponseTimePeriod } from '../dto/response-time-query.dto';

describe('ResponseTimeAnalyzerService', () => {
  let service: ResponseTimeAnalyzerService;
  let checkResultRepository: Repository<CheckResult>;

  const mockCheckResultRepository = {
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResponseTimeAnalyzerService,
        {
          provide: getRepositoryToken(CheckResult),
          useValue: mockCheckResultRepository,
        },
      ],
    }).compile();

    service = module.get<ResponseTimeAnalyzerService>(ResponseTimeAnalyzerService);
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

  describe('analyze', () => {
    it('should analyze response time statistics', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          avg: '150',
          min: '50',
          max: '500',
          p50: '145',
          p95: '350',
          p99: '480',
        }),
        getRawMany: jest.fn().mockResolvedValue([
          { timestamp: new Date('2025-10-16T00:00:00Z'), avgResponseTime: 150 },
          { timestamp: new Date('2025-10-16T01:00:00Z'), avgResponseTime: 155 },
        ]),
      };

      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.analyze('endpoint-id', {
        period: ResponseTimePeriod.TWENTY_FOUR_HOURS,
      });

      expect(result.statistics.average).toBe(150);
      expect(result.statistics.min).toBe(50);
      expect(result.statistics.max).toBe(500);
      expect(result.statistics.p95).toBe(350);
      expect(result.statistics.p99).toBe(480);
      expect(result.timeSeries.length).toBe(2);
    });

    it('should handle null values gracefully', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          avg: null,
          min: null,
          max: null,
          p50: null,
          p95: null,
          p99: null,
        }),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.analyze('endpoint-id', {
        period: ResponseTimePeriod.TWENTY_FOUR_HOURS,
      });

      expect(result.statistics.average).toBe(0);
      expect(result.statistics.min).toBe(0);
      expect(result.statistics.max).toBe(0);
      expect(result.timeSeries.length).toBe(0);
    });
  });
});
