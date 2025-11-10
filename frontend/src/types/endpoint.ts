export type EndpointStatus = 'UP' | 'DOWN' | 'DEGRADED' | 'UNKNOWN'
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'

export interface Endpoint {
  id: string
  name: string
  url: string
  method: HttpMethod
  headers?: Record<string, string>
  body?: string
  expectedStatusCode: number
  checkInterval: number
  timeoutThreshold: number
  isActive: boolean
  currentStatus: EndpointStatus
  createdAt: string
  updatedAt: string
}

export interface CreateEndpointRequest {
  name: string
  url: string
  method: HttpMethod
  headers?: Record<string, string>
  body?: string
  expectedStatusCode?: number
  checkInterval?: number
  timeoutThreshold?: number
  isActive?: boolean
}

export interface UpdateEndpointRequest extends Partial<CreateEndpointRequest> {}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}
