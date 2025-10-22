import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IncidentService } from './incident.service';
import { Incident } from '../../incident/incident.entity';
import { CheckResult } from '../../health-check/check-result.entity';
import { IncidentStatus } from '../dto/incident-query.dto';
import { NotFoundException } from '@nestjs/common';

describe('IncidentService', () => {
  let service: IncidentService;
  let incidentRepository: Repository<Incident>;
  let checkResultRepository: Repository<CheckResult>;

  const mockIncidentRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
  };

  const mockCheckResultRepository = {
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidentService,
        {
          provide: getRepositoryToken(Incident),
          useValue: mockIncidentRepository,
        },
        {
          provide: getRepositoryToken(CheckResult),
          useValue: mockCheckResultRepository,
        },
      ],
    }).compile();

    service = module.get<IncidentService>(IncidentService);
    incidentRepository = module.get<Repository<Incident>>(
      getRepositoryToken(Incident),
    );
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

  describe('findAll', () => {
    it('should return all incidents with pagination', async () => {
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
            endpoint: { name: 'Example API' },
            startedAt: new Date(),
            resolvedAt: new Date(),
            duration: 300000,
            failureCount: 5,
            errorMessage: 'Timeout',
          },
        ]),
      };

      jest
        .spyOn(incidentRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      const result = await service.findAll({
        page: 1,
        limit: 20,
      });

      expect(result.data.length).toBe(1);
      expect(result.meta.total).toBe(10);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(20);
    });

    it('should filter by active status', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      jest
        .spyOn(incidentRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      await service.findAll({
        status: IncidentStatus.ACTIVE,
        page: 1,
        limit: 20,
      });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'incident.resolvedAt IS NULL',
      );
    });
  });

  describe('findById', () => {
    it('should return incident detail with check results', async () => {
      const mockIncident = {
        id: 'incident-1',
        endpointId: 'endpoint-1',
        endpoint: { name: 'Example API', url: 'https://example.com' },
        startedAt: new Date('2025-10-16T10:00:00Z'),
        resolvedAt: new Date('2025-10-16T10:05:00Z'),
        duration: 300000,
        failureCount: 5,
        errorMessage: 'Timeout',
      };

      const mockCheckResults = [
        {
          checkedAt: new Date('2025-10-16T10:00:00Z'),
          status: 'failure',
          responseTime: 5001,
          statusCode: null,
          errorMessage: 'Timeout',
        },
      ];

      const mockIncidentQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockIncident),
      };

      const mockCheckResultQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockCheckResults),
      };

      jest
        .spyOn(incidentRepository, 'createQueryBuilder')
        .mockReturnValue(mockIncidentQueryBuilder as any);

      jest
        .spyOn(checkResultRepository, 'createQueryBuilder')
        .mockReturnValue(mockCheckResultQueryBuilder as any);

      const result = await service.findById('incident-1');

      expect(result.id).toBe('incident-1');
      expect(result.endpoint.name).toBe('Example API');
      expect(result.checkResults.length).toBe(1);
    });

    it('should throw NotFoundException if incident not found', async () => {
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      jest
        .spyOn(incidentRepository, 'createQueryBuilder')
        .mockReturnValue(mockQueryBuilder as any);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
