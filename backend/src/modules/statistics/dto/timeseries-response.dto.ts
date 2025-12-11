import { ApiProperty } from '@nestjs/swagger';
import { TimeseriesPeriod } from './timeseries-query.dto';

/**
 * 시계열 데이터 포인트
 */
export class TimeseriesDataPointDto {
  @ApiProperty({
    description: '타임스탬프 (ISO 8601 형식)',
    example: '2025-12-11T10:00:00.000Z',
  })
  timestamp: Date;

  @ApiProperty({
    description: '값 (가동률: 0-100, 응답시간: ms 단위)',
    example: 98.5,
  })
  value: number;
}

/**
 * 가동률 시계열 응답 DTO
 */
export class UptimeTimeseriesResponseDto {
  @ApiProperty({
    description: '시계열 기간',
    enum: TimeseriesPeriod,
    example: TimeseriesPeriod.HOURLY,
  })
  period: TimeseriesPeriod;

  @ApiProperty({
    description: '조회 시간 범위 (시간 단위)',
    example: 24,
  })
  hours: number;

  @ApiProperty({
    description: '시계열 데이터 포인트 배열',
    type: [TimeseriesDataPointDto],
  })
  data: TimeseriesDataPointDto[];

  @ApiProperty({
    description: '평균 가동률 (%)',
    example: 98.5,
  })
  average: number;

  @ApiProperty({
    description: '데이터 생성 시각',
    example: '2025-12-11T10:30:00.000Z',
  })
  generatedAt: Date;
}

/**
 * 응답 시간 시계열 응답 DTO
 */
export class ResponseTimeTimeseriesResponseDto {
  @ApiProperty({
    description: '시계열 기간',
    enum: TimeseriesPeriod,
    example: TimeseriesPeriod.HOURLY,
  })
  period: TimeseriesPeriod;

  @ApiProperty({
    description: '조회 시간 범위 (시간 단위)',
    example: 24,
  })
  hours: number;

  @ApiProperty({
    description: '시계열 데이터 포인트 배열',
    type: [TimeseriesDataPointDto],
  })
  data: TimeseriesDataPointDto[];

  @ApiProperty({
    description: '평균 응답 시간 (ms)',
    example: 145.2,
  })
  average: number;

  @ApiProperty({
    description: '최소 응답 시간 (ms)',
    example: 85.0,
  })
  min: number;

  @ApiProperty({
    description: '최대 응답 시간 (ms)',
    example: 320.5,
  })
  max: number;

  @ApiProperty({
    description: 'P95 응답 시간 (ms)',
    example: 280.0,
  })
  p95: number;

  @ApiProperty({
    description: '데이터 생성 시각',
    example: '2025-12-11T10:30:00.000Z',
  })
  generatedAt: Date;
}
