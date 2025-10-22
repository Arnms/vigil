import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IncidentQueryDto,
  IncidentStatus,
  IncidentListResponse,
  IncidentDetailResponse,
} from '../dto/incident-query.dto';
import { Incident } from '../../incident/incident.entity';
import { CheckResult } from '../../health-check/check-result.entity';

@Injectable()
export class IncidentService {
  private readonly logger = new Logger(IncidentService.name);

  constructor(
    @InjectRepository(Incident)
    private incidentRepository: Repository<Incident>,
    @InjectRepository(CheckResult)
    private checkResultRepository: Repository<CheckResult>,
  ) {}

  /**
   * 인시던트 목록 조회
   */
  async findAll(query: IncidentQueryDto): Promise<IncidentListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    let qb = this.incidentRepository
      .createQueryBuilder('incident')
      .leftJoinAndSelect('incident.endpoint', 'endpoint');

    if (query.status === IncidentStatus.ACTIVE) {
      qb = qb.where('incident.resolvedAt IS NULL');
    } else if (query.status === IncidentStatus.RESOLVED) {
      qb = qb.where('incident.resolvedAt IS NOT NULL');
    }

    qb = qb.orderBy('incident.startedAt', 'DESC');

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data: data.map((incident) => ({
        id: incident.id,
        endpointId: incident.endpointId,
        endpointName: incident.endpoint?.name,
        startedAt: incident.startedAt,
        resolvedAt: incident.resolvedAt,
        duration: incident.duration,
        failureCount: incident.failureCount,
        errorMessage: incident.errorMessage,
      })),
      meta: {
        total,
        page: query.page || 1,
        limit: query.limit || 20,
        totalPages: Math.ceil(total / (query.limit || 20)),
      },
    };
  }

  /**
   * 인시던트 상세 조회
   */
  async findById(id: string): Promise<IncidentDetailResponse> {
    const incident = await this.incidentRepository
      .createQueryBuilder('incident')
      .leftJoinAndSelect('incident.endpoint', 'endpoint')
      .where('incident.id = :id', { id })
      .getOne();

    if (!incident) {
      throw new NotFoundException('Incident not found');
    }

    // 관련 체크 결과 조회
    const checkResults = await this.checkResultRepository
      .createQueryBuilder('cr')
      .where('cr.endpointId = :endpointId', {
        endpointId: incident.endpointId,
      })
      .andWhere('cr.checkedAt >= :startDate', {
        startDate: incident.startedAt,
      })
      .andWhere('cr.checkedAt <= :endDate', {
        endDate: incident.resolvedAt || new Date(),
      })
      .orderBy('cr.checkedAt', 'DESC')
      .getMany();

    return {
      id: incident.id,
      endpointId: incident.endpointId,
      endpoint: {
        name: incident.endpoint?.name,
        url: incident.endpoint?.url,
      },
      startedAt: incident.startedAt,
      resolvedAt: incident.resolvedAt,
      duration: incident.duration,
      failureCount: incident.failureCount,
      errorMessage: incident.errorMessage,
      checkResults: checkResults.map((cr) => ({
        checkedAt: cr.checkedAt,
        status: cr.status,
        responseTime: cr.responseTime,
        statusCode: cr.statusCode,
        errorMessage: cr.errorMessage,
      })),
    };
  }
}
