import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { IncidentService } from './incident.service';
import { QueryIncidentDto } from './dto/query-incident.dto';

@Controller('api/incidents')
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}

  /**
   * 인시던트 목록 조회
   * GET /api/incidents?endpointId=xxx&status=active&page=1&limit=20
   */
  @Get()
  async findAll(@Query() query: QueryIncidentDto) {
    return await this.incidentService.findAll(query);
  }

  /**
   * 최근 인시던트 조회
   * GET /api/incidents/recent?limit=10
   */
  @Get('recent')
  async findRecent(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return await this.incidentService.findRecent(limit);
  }

  /**
   * 활성 인시던트 조회
   * GET /api/incidents/active
   */
  @Get('active')
  async findActive() {
    return await this.incidentService.findActive();
  }

  /**
   * 인시던트 통계 조회
   * GET /api/incidents/stats
   */
  @Get('stats')
  async getStats() {
    return await this.incidentService.getStats();
  }

  /**
   * 엔드포인트별 인시던트 조회
   * GET /api/incidents/endpoint/:endpointId?page=1&limit=10
   */
  @Get('endpoint/:endpointId')
  async findByEndpoint(
    @Param('endpointId') endpointId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return await this.incidentService.findByEndpoint(endpointId, page, limit);
  }

  /**
   * 인시던트 상세 조회
   * GET /api/incidents/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.incidentService.findOne(id);
  }

  /**
   * 인시던트 해결 처리
   * POST /api/incidents/:id/resolve
   */
  @Post(':id/resolve')
  async resolve(@Param('id') id: string) {
    return await this.incidentService.resolve(id);
  }
}
