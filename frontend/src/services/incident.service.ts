import apiClient from './api'
import type { Incident, CheckResult, IncidentQuery, PaginatedResponse } from '../types/incident'

/**
 * Incident Service
 * 인시던트 및 체크 결과 조회를 처리하는 서비스
 */

class IncidentService {
  /**
   * 모든 인시던트 조회
   * @param page 페이지 번호 (기본값: 1)
   * @param limit 페이지당 항목 수 (기본값: 20)
   * @param query 필터링 옵션
   * @returns 인시던트 목록 (페이지네이션)
   */
  async getIncidents(
    page: number = 1,
    limit: number = 20,
    query?: IncidentQuery
  ): Promise<PaginatedResponse<Incident>> {
    try {
      const response = await apiClient.get<PaginatedResponse<Incident>>(
        '/incidents',
        {
          params: {
            page,
            limit,
            ...(query?.endpointId && { endpointId: query.endpointId }),
            ...(query?.status && { status: query.status }),
            ...(query?.sortBy && { sortBy: query.sortBy }),
            ...(query?.order && { order: query.order }),
          },
        }
      )
      return response.data
    } catch (error) {
      console.error('Failed to fetch incidents:', error)
      throw error
    }
  }

  /**
   * 특정 인시던트 조회
   * @param id 인시던트 ID
   * @returns 인시던트 상세 정보
   */
  async getIncident(id: string): Promise<Incident & { checkResults?: CheckResult[] }> {
    try {
      const response = await apiClient.get<Incident & { checkResults?: CheckResult[] }>(
        `/incidents/${id}`
      )
      return response.data
    } catch (error) {
      console.error(`Failed to fetch incident ${id}:`, error)
      throw error
    }
  }

  /**
   * 특정 엔드포인트의 인시던트 조회
   * @param endpointId 엔드포인트 ID
   * @param page 페이지 번호 (기본값: 1)
   * @param limit 페이지당 항목 수 (기본값: 10)
   * @returns 엔드포인트의 인시던트 목록
   */
  async getIncidentsByEndpoint(
    endpointId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<Incident>> {
    try {
      const response = await apiClient.get<PaginatedResponse<Incident>>(
        `/incidents/endpoint/${endpointId}`,
        {
          params: { page, limit },
        }
      )
      return response.data
    } catch (error) {
      console.error(`Failed to fetch incidents for endpoint ${endpointId}:`, error)
      throw error
    }
  }

  /**
   * 최근 인시던트 조회
   * @param limit 조회 개수 (기본값: 10)
   * @returns 최근 인시던트 목록
   */
  async getRecentIncidents(limit: number = 10): Promise<Incident[]> {
    try {
      const response = await apiClient.get<Incident[]>(
        '/incidents/recent',
        {
          params: { limit },
        }
      )
      return response.data
    } catch (error) {
      console.error('Failed to fetch recent incidents:', error)
      throw error
    }
  }

  /**
   * 현재 진행 중인 인시던트 조회
   * @returns 활성화된 인시던트 목록
   */
  async getActiveIncidents(): Promise<Incident[]> {
    try {
      const response = await apiClient.get<Incident[]>('/incidents/active')
      return response.data
    } catch (error) {
      console.error('Failed to fetch active incidents:', error)
      throw error
    }
  }

  /**
   * 인시던트 해결 (종료)
   * @param id 인시던트 ID
   * @returns 업데이트된 인시던트
   */
  async resolveIncident(id: string): Promise<Incident> {
    try {
      const response = await apiClient.post<Incident>(`/incidents/${id}/resolve`)
      return response.data
    } catch (error) {
      console.error(`Failed to resolve incident ${id}:`, error)
      throw error
    }
  }

  /**
   * 모든 체크 결과 조회
   * @param page 페이지 번호 (기본값: 1)
   * @param limit 페이지당 항목 수 (기본값: 50)
   * @param endpointId 엔드포인트 ID로 필터링 (선택사항)
   * @returns 체크 결과 목록 (페이지네이션)
   */
  async getCheckResults(
    page: number = 1,
    limit: number = 50,
    endpointId?: string
  ): Promise<PaginatedResponse<CheckResult>> {
    try {
      const response = await apiClient.get<PaginatedResponse<CheckResult>>(
        '/check-results',
        {
          params: {
            page,
            limit,
            ...(endpointId && { endpointId }),
          },
        }
      )
      return response.data
    } catch (error) {
      console.error('Failed to fetch check results:', error)
      throw error
    }
  }

  /**
   * 특정 엔드포인트의 체크 결과 조회
   * @param endpointId 엔드포인트 ID
   * @param limit 조회 개수 (기본값: 100)
   * @returns 체크 결과 목록
   */
  async getEndpointCheckResults(
    endpointId: string,
    limit: number = 100
  ): Promise<CheckResult[]> {
    try {
      const response = await apiClient.get<CheckResult[]>(
        `/check-results/endpoint/${endpointId}`,
        {
          params: { limit },
        }
      )
      return response.data
    } catch (error) {
      console.error(`Failed to fetch check results for endpoint ${endpointId}:`, error)
      throw error
    }
  }

  /**
   * 특정 기간의 체크 결과 조회
   * @param startDate 시작 날짜 (ISO 8601 형식)
   * @param endDate 종료 날짜 (ISO 8601 형식)
   * @param endpointId 엔드포인트 ID로 필터링 (선택사항)
   * @returns 체크 결과 목록
   */
  async getCheckResultsByDateRange(
    startDate: string,
    endDate: string,
    endpointId?: string
  ): Promise<CheckResult[]> {
    try {
      const response = await apiClient.get<CheckResult[]>(
        '/check-results/date-range',
        {
          params: {
            startDate,
            endDate,
            ...(endpointId && { endpointId }),
          },
        }
      )
      return response.data
    } catch (error) {
      console.error('Failed to fetch check results by date range:', error)
      throw error
    }
  }

  /**
   * 실패한 체크 결과만 조회
   * @param page 페이지 번호 (기본값: 1)
   * @param limit 페이지당 항목 수 (기본값: 50)
   * @returns 실패한 체크 결과 목록
   */
  async getFailedChecks(
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResponse<CheckResult>> {
    try {
      const response = await apiClient.get<PaginatedResponse<CheckResult>>(
        '/check-results/failed',
        {
          params: { page, limit },
        }
      )
      return response.data
    } catch (error) {
      console.error('Failed to fetch failed check results:', error)
      throw error
    }
  }

  /**
   * 인시던트 통계 조회
   * @returns 인시던트 통계
   */
  async getIncidentStats(): Promise<{
    totalIncidents: number
    activeIncidents: number
    resolvedIncidents: number
    averageResolutionTime: number
  }> {
    try {
      const response = await apiClient.get('/incidents/stats')
      return response.data
    } catch (error) {
      console.error('Failed to fetch incident statistics:', error)
      throw error
    }
  }
}

export default new IncidentService()
