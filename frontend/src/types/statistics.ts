export interface OverviewStats {
  totalEndpoints: number
  statusBreakdown: {
    UP: number
    DOWN: number
    DEGRADED: number
    UNKNOWN: number
  }
  overallUptime: number
  activeIncidents: number
  totalIncidentsLast24h: number
  averageResponseTime: number
  cachedAt?: string
}

export interface UptimeStats {
  endpointId: string
  period: string
  uptime: number
  totalChecks: number
  successfulChecks: number
  failedChecks: number
  startDate: string
  endDate: string
}

export interface ResponseTimeStats {
  endpointId: string
  period: string
  statistics: {
    average: number
    min: number
    max: number
    p50: number
    p95: number
    p99: number
  }
  timeSeries: Array<{
    timestamp: string
    avgResponseTime: number
  }>
}
