import { IsEnum, IsOptional, IsISO8601, IsString } from 'class-validator';

export enum UptimePeriod {
  TWENTY_FOUR_HOURS = '24h',
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
  CUSTOM = 'custom',
}

export class UptimeQueryDto {
  @IsEnum(UptimePeriod)
  @IsOptional()
  period?: UptimePeriod = UptimePeriod.TWENTY_FOUR_HOURS;

  @IsISO8601()
  @IsOptional()
  startDate?: string; // period=custom일 때만

  @IsISO8601()
  @IsOptional()
  endDate?: string; // period=custom일 때만
}

export class UptimeStatsResponse {
  endpointId: string;
  period: UptimePeriod;
  uptime: number;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  startDate: Date;
  endDate: Date;
}
