import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 시계열 데이터 조회 기간
 */
export enum TimeseriesPeriod {
  HOURLY = 'hourly',
  DAILY = 'daily',
}

/**
 * 시계열 데이터 조회 DTO
 */
export class TimeseriesQueryDto {
  @ApiProperty({
    description: '시계열 데이터 기간 (hourly: 시간별, daily: 일별)',
    enum: TimeseriesPeriod,
    default: TimeseriesPeriod.HOURLY,
    required: false,
  })
  @IsOptional()
  @IsEnum(TimeseriesPeriod)
  period?: TimeseriesPeriod = TimeseriesPeriod.HOURLY;

  @ApiProperty({
    description: '조회할 시간 범위 (시간 단위, 기본: 24시간)',
    default: 24,
    minimum: 1,
    maximum: 168,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(168) // 최대 7일 (168시간)
  hours?: number = 24;
}
