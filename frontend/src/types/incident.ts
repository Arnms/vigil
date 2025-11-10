export type IncidentStatus = 'active' | 'resolved'

export interface Incident {
  id: string
  endpointId: string
  endpointName?: string
  startedAt: string
  resolvedAt?: string
  duration?: number
  failureCount: number
  errorMessage: string
  checkResults?: CheckResult[]
}

export interface CheckResult {
  checkedAt: string
  status: 'success' | 'failure'
  responseTime: number
  statusCode?: number
  errorMessage?: string
}

export interface IncidentQuery {
  status?: IncidentStatus
  endpointId?: string
  sortBy?: 'startedAt' | 'failureCount'
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
