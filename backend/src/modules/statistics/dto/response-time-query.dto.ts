import { IsEnum, IsOptional } from 'class-validator';

export enum ResponseTimePeriod {
  TWENTY_FOUR_HOURS = '24h',
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
}

export class ResponseTimeQueryDto {
  @IsEnum(ResponseTimePeriod)
  @IsOptional()
  period?: ResponseTimePeriod = ResponseTimePeriod.TWENTY_FOUR_HOURS;
}

export class ResponseTimeStatistics {
  average: number;
  min: number;
  max: number;
  p50: number;
  p95: number;
  p99: number;
}

export class TimeSeriesData {
  timestamp: Date;
  avgResponseTime: number;
}

export class ResponseTimeStatsResponse {
  endpointId: string;
  period: ResponseTimePeriod;
  statistics: ResponseTimeStatistics;
  timeSeries: TimeSeriesData[];
}
