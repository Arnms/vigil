import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { EndpointService } from './endpoint.service';
import { CreateEndpointDto, UpdateEndpointDto, EndpointListQueryDto } from './dto';
import { Endpoint } from './endpoint.entity';
import { CheckResult } from '../health-check/check-result.entity';

@ApiTags('Endpoints')
@Controller('api/endpoints')
export class EndpointController {
  constructor(private readonly endpointService: EndpointService) {}

  /**
   * 엔드포인트 등록
   */
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: '엔드포인트 등록' })
  @ApiResponse({ status: 201, description: 'Endpoint created', type: Endpoint })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() dto: CreateEndpointDto): Promise<Endpoint> {
    return this.endpointService.create(dto);
  }

  /**
   * 엔드포인트 목록 조회
   */
  @Get()
  @ApiOperation({ summary: '엔드포인트 목록 조회' })
  @ApiResponse({ status: 200, description: 'Endpoints list', type: [Endpoint] })
  async findAll(@Query() query: EndpointListQueryDto) {
    return this.endpointService.findAll(query);
  }

  /**
   * 엔드포인트 상세 조회
   */
  @Get(':id')
  @ApiOperation({ summary: '엔드포인트 상세 조회' })
  @ApiResponse({ status: 200, description: 'Endpoint details', type: Endpoint })
  @ApiResponse({ status: 404, description: 'Endpoint not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Endpoint> {
    const endpoint = await this.endpointService.findOne(id);

    // Soft-deleted 엔드포인트는 조회 불가
    if (!endpoint.isActive) {
      throw new NotFoundException(`Endpoint not found: ${id}`);
    }

    return endpoint;
  }

  /**
   * 엔드포인트 수정
   */
  @Patch(':id')
  @ApiOperation({ summary: '엔드포인트 수정' })
  @ApiResponse({ status: 200, description: 'Endpoint updated', type: Endpoint })
  @ApiResponse({ status: 404, description: 'Endpoint not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEndpointDto,
  ): Promise<Endpoint> {
    return this.endpointService.update(id, dto);
  }

  /**
   * 엔드포인트 삭제
   */
  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: '엔드포인트 삭제' })
  @ApiResponse({ status: 200, description: 'Endpoint deleted' })
  @ApiResponse({ status: 404, description: 'Endpoint not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<object> {
    await this.endpointService.remove(id);
    return { message: 'Endpoint deleted successfully' };
  }

  /**
   * 수동 헬스 체크
   */
  @Post(':id/check')
  @HttpCode(200)
  @ApiOperation({ summary: '수동 헬스 체크' })
  @ApiResponse({
    status: 200,
    description: 'Health check result',
    type: CheckResult,
  })
  @ApiResponse({ status: 404, description: 'Endpoint not found' })
  async manualHealthCheck(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CheckResult> {
    return this.endpointService.manualHealthCheck(id);
  }
}
