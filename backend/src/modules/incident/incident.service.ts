import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not } from 'typeorm';
import { Incident } from './incident.entity';
import { QueryIncidentDto } from './dto/query-incident.dto';

@Injectable()
export class IncidentService {
  constructor(
    @InjectRepository(Incident)
    private readonly incidentRepository: Repository<Incident>,
  ) {}

  /**
   * 인시던트 목록 조회 (페이지네이션, 필터)
   */
  async findAll(query: QueryIncidentDto) {
    const { endpointId, status, page = 1, limit = 20 } = query;

    const queryBuilder = this.incidentRepository
      .createQueryBuilder('incident')
      .leftJoinAndSelect('incident.endpoint', 'endpoint')
      .orderBy('incident.startedAt', 'DESC');

    // 엔드포인트 필터
    if (endpointId) {
      queryBuilder.andWhere('incident.endpointId = :endpointId', { endpointId });
    }

    // 상태 필터 (active: resolvedAt IS NULL, resolved: resolvedAt IS NOT NULL)
    if (status === 'active') {
      queryBuilder.andWhere('incident.resolvedAt IS NULL');
    } else if (status === 'resolved') {
      queryBuilder.andWhere('incident.resolvedAt IS NOT NULL');
    }

    // 페이지네이션
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data: data.map((incident) => ({
        ...incident,
        endpointName: incident.endpoint?.name,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 인시던트 상세 조회
   */
  async findOne(id: string) {
    const incident = await this.incidentRepository.findOne({
      where: { id },
      relations: ['endpoint'],
    });

    if (!incident) {
      throw new NotFoundException(`Incident with ID ${id} not found`);
    }

    return incident;
  }

  /**
   * 최근 인시던트 조회
   */
  async findRecent(limit: number = 10) {
    const incidents = await this.incidentRepository.find({
      relations: ['endpoint'],
      order: { startedAt: 'DESC' },
      take: limit,
    });

    return incidents.map((incident) => ({
      ...incident,
      endpointName: incident.endpoint?.name,
    }));
  }

  /**
   * 활성 인시던트 조회
   */
  async findActive() {
    const incidents = await this.incidentRepository.find({
      where: { resolvedAt: IsNull() },
      relations: ['endpoint'],
      order: { startedAt: 'DESC' },
    });

    return incidents.map((incident) => ({
      ...incident,
      endpointName: incident.endpoint?.name,
    }));
  }

  /**
   * 엔드포인트별 인시던트 조회
   */
  async findByEndpoint(endpointId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.incidentRepository.findAndCount({
      where: { endpointId },
      relations: ['endpoint'],
      order: { startedAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: data.map((incident) => ({
        ...incident,
        endpointName: incident.endpoint?.name,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 인시던트 해결 처리
   */
  async resolve(id: string) {
    const incident = await this.findOne(id);

    if (incident.resolvedAt) {
      return incident;
    }

    incident.resolvedAt = new Date();
    incident.duration = incident.resolvedAt.getTime() - incident.startedAt.getTime();

    return await this.incidentRepository.save(incident);
  }

  /**
   * 인시던트 통계
   */
  async getStats() {
    const totalIncidents = await this.incidentRepository.count();
    const activeIncidents = await this.incidentRepository.count({
      where: { resolvedAt: IsNull() },
    });
    const resolvedIncidents = await this.incidentRepository.count({
      where: { resolvedAt: Not(IsNull()) },
    });

    // MTTR (Mean Time To Recovery) 계산
    const resolvedWithDuration = await this.incidentRepository
      .createQueryBuilder('incident')
      .select('AVG(incident.duration)', 'avgDuration')
      .addSelect('MAX(incident.duration)', 'maxDuration')
      .where('incident.resolvedAt IS NOT NULL')
      .andWhere('incident.duration IS NOT NULL')
      .getRawOne();

    const avgRecoveryTime = resolvedWithDuration?.avgDuration
      ? Math.round(parseFloat(resolvedWithDuration.avgDuration))
      : null;
    const maxDowntime = resolvedWithDuration?.maxDuration
      ? Math.round(parseFloat(resolvedWithDuration.maxDuration))
      : null;

    // 월별 인시던트 발생 추이 (최근 12개월)
    const monthlyTrend = await this.incidentRepository
      .createQueryBuilder('incident')
      .select("DATE_TRUNC('month', incident.startedAt)", 'month')
      .addSelect('COUNT(*)', 'count')
      .where("incident.startedAt >= NOW() - INTERVAL '12 months'")
      .groupBy("DATE_TRUNC('month', incident.startedAt)")
      .orderBy('month', 'ASC')
      .getRawMany();

    return {
      totalIncidents,
      activeIncidents,
      resolvedIncidents,
      avgRecoveryTime,
      maxDowntime,
      monthlyTrend: monthlyTrend.map((item) => ({
        month: item.month,
        count: parseInt(item.count, 10),
      })),
    };
  }
}
