import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Endpoint } from './endpoint.entity';
import {
  CreateEndpointDto,
  UpdateEndpointDto,
  EndpointListQueryDto,
  SortBy,
} from './dto';
import { CheckResult } from '../health-check/check-result.entity';
import { Incident } from '../incident/incident.entity';
import { HealthCheckService } from '../health-check/health-check.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';

@Injectable()
export class EndpointService {
  private readonly logger = new Logger(EndpointService.name);

  constructor(
    @InjectRepository(Endpoint)
    private endpointRepository: Repository<Endpoint>,
    @InjectRepository(CheckResult)
    private checkResultRepository: Repository<CheckResult>,
    @InjectRepository(Incident)
    private incidentRepository: Repository<Incident>,
    private healthCheckService: HealthCheckService,
    private websocketGateway: WebsocketGateway,
  ) {}

  /**
   * 엔드포인트 등록
   */
  async create(dto: CreateEndpointDto): Promise<Endpoint> {
    try {
      const endpoint = this.endpointRepository.create({
        ...dto,
        currentStatus: 'UNKNOWN' as any,
        consecutiveFailures: 0,
      });

      const savedEndpoint = await this.endpointRepository.save(endpoint);
      this.logger.log(`Endpoint created: ${savedEndpoint.id}`);

      // 헬스 체크 스케줄 추가
      await this.healthCheckService.scheduleHealthCheck(savedEndpoint);

      // 📡 WebSocket: 엔드포인트 생성 이벤트 브로드캐스트
      this.websocketGateway.broadcastEndpointCreated({
        endpointId: savedEndpoint.id,
        name: savedEndpoint.name,
        url: savedEndpoint.url,
        method: savedEndpoint.method,
      });

      return savedEndpoint;
    } catch (error) {
      this.logger.error(`Failed to create endpoint: ${error.message}`);
      throw new BadRequestException('Failed to create endpoint');
    }
  }

  /**
   * 엔드포인트 목록 조회 (페이지네이션, 필터링, 정렬)
   */
  async findAll(query: EndpointListQueryDto): Promise<{
    data: Endpoint[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    let qb = this.endpointRepository.createQueryBuilder('endpoint');

    // 필터링: 상태
    if (query.status) {
      qb = qb.where('endpoint.currentStatus = :status', {
        status: query.status,
      });
    }

    // 필터링: 활성화 여부
    if (query.isActive !== undefined) {
      qb = qb.andWhere('endpoint.isActive = :isActive', {
        isActive: query.isActive,
      });
    }

    // 정렬
    const sortColumn = `endpoint.${query.sortBy}`;
    qb = qb.orderBy(sortColumn, query.order);

    // 페이지네이션 전 전체 개수 조회
    const total = await qb.getCount();

    const page = query.page || 1;
    const limit = query.limit || 20;

    // 페이지네이션
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * 엔드포인트 상세 조회
   */
  async findOne(id: string): Promise<Endpoint> {
    const endpoint = await this.endpointRepository.findOne({
      where: { id },
    });

    if (!endpoint) {
      throw new NotFoundException(`Endpoint not found: ${id}`);
    }

    return endpoint;
  }

  /**
   * 엔드포인트 수정
   */
  async update(id: string, dto: UpdateEndpointDto): Promise<Endpoint> {
    const endpoint = await this.findOne(id);

    // checkInterval이 변경된 경우 재스케줄 필요
    const dtoAny = dto as any;
    const intervalChanged =
      dtoAny.checkInterval && dtoAny.checkInterval !== endpoint.checkInterval;

    Object.assign(endpoint, dto);
    const updatedEndpoint = await this.endpointRepository.save(endpoint);

    if (intervalChanged) {
      this.logger.log(
        `Endpoint interval changed: ${id}, old: ${endpoint.checkInterval}, new: ${dtoAny.checkInterval}`,
      );
      await this.healthCheckService.rescheduleHealthCheck(updatedEndpoint);
    }

    this.logger.log(`Endpoint updated: ${id}`);

    // 📡 WebSocket: 엔드포인트 수정 이벤트 브로드캐스트
    this.websocketGateway.broadcastEndpointUpdated({
      endpointId: updatedEndpoint.id,
      changes: {
        name: updatedEndpoint.name,
        url: updatedEndpoint.url,
        method: updatedEndpoint.method,
        currentStatus: updatedEndpoint.currentStatus,
        isActive: updatedEndpoint.isActive,
      },
    });

    return updatedEndpoint;
  }

  /**
   * 엔드포인트 삭제 (Soft Delete)
   */
  async remove(id: string): Promise<void> {
    const endpoint = await this.findOne(id);

    // 헬스 체크 스케줄 제거
    await this.healthCheckService.unscheduleHealthCheck(endpoint);

    // Soft Delete: isActive를 false로 설정
    endpoint.isActive = false;
    await this.endpointRepository.save(endpoint);

    this.logger.log(`Endpoint deleted: ${id}`);

    // 📡 WebSocket: 엔드포인트 삭제 이벤트 브로드캐스트
    this.websocketGateway.broadcastEndpointDeleted({
      endpointId: endpoint.id,
      name: endpoint.name,
    });
  }

  /**
   * 수동 헬스 체크
   */
  async manualHealthCheck(id: string): Promise<CheckResult> {
    const endpoint = await this.findOne(id);
    return await this.healthCheckService.performHealthCheckNow(endpoint);
  }
}
