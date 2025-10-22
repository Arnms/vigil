import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { StatisticsService } from './services/statistics.service';
import { UptimeQueryDto } from './dto/uptime-query.dto';
import { ResponseTimeQueryDto } from './dto/response-time-query.dto';
import { IncidentQueryDto } from './dto/incident-query.dto';

@Controller('api/statistics')
@ApiTags('Statistics')
export class StatisticsController {
  constructor(private statisticsService: StatisticsService) {}

  // 1. 특정 엔드포인트 가동률 조회
  @Get('endpoints/:id/uptime')
  @HttpCode(200)
  @ApiOperation({ summary: '엔드포인트 가동률 조회' })
  async getUptime(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: UptimeQueryDto,
  ) {
    return await this.statisticsService.getUptimeStats(id, query);
  }

  // 2. 특정 엔드포인트 응답 시간 통계 조회
  @Get('endpoints/:id/response-time')
  @HttpCode(200)
  @ApiOperation({ summary: '응답 시간 통계 조회' })
  async getResponseTime(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ResponseTimeQueryDto,
  ) {
    return await this.statisticsService.getResponseTimeStats(id, query);
  }

  // 3. 전체 엔드포인트 통계 개요
  @Get('overview')
  @HttpCode(200)
  @ApiOperation({ summary: '전체 통계 개요' })
  async getOverview() {
    return await this.statisticsService.getOverview();
  }

  // 4. 인시던트 목록 조회
  @Get('incidents')
  @HttpCode(200)
  @ApiOperation({ summary: '인시던트 목록 조회' })
  async getIncidents(@Query() query: IncidentQueryDto) {
    return await this.statisticsService.getIncidents(query);
  }

  // 5. 인시던트 상세 조회
  @Get('incidents/:id')
  @HttpCode(200)
  @ApiOperation({ summary: '인시던트 상세 조회' })
  async getIncidentDetail(@Param('id', ParseUUIDPipe) id: string) {
    return await this.statisticsService.getIncidentDetail(id);
  }

  // 6. 엔드포인트 성능 비교
  @Get('comparison')
  @HttpCode(200)
  @ApiOperation({ summary: '엔드포인트 성능 비교' })
  async getComparison() {
    return await this.statisticsService.getComparison();
  }
}
