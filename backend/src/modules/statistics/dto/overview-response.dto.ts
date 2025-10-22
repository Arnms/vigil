export class StatusBreakdownDto {
  UP: number;
  DOWN: number;
  DEGRADED: number;
  UNKNOWN: number;
}

export class OverviewResponseDto {
  totalEndpoints: number;
  statusBreakdown: StatusBreakdownDto;
  overallUptime: number;
  activeIncidents: number;
  totalIncidentsLast24h: number;
  averageResponseTime: number;
  cachedAt?: Date;
}
