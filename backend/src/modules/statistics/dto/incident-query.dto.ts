import { IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';

export enum IncidentStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
}

export class IncidentQueryDto {
  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class IncidentDto {
  id: string;
  endpointId: string;
  endpointName?: string;
  startedAt: Date;
  resolvedAt?: Date | null;
  duration?: number | null;
  failureCount: number;
  errorMessage?: string | null;
}

export class IncidentListResponse {
  data: IncidentDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class CheckResultDto {
  checkedAt: Date;
  status: string;
  responseTime?: number | null;
  statusCode?: number | null;
  errorMessage?: string | null;
}

export class IncidentDetailResponse {
  id: string;
  endpointId: string;
  endpoint: {
    name: string;
    url: string;
  };
  startedAt: Date;
  resolvedAt?: Date | null;
  duration?: number | null;
  failureCount: number;
  errorMessage?: string | null;
  checkResults: CheckResultDto[];
}
