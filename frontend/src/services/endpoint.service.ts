import apiClient from './api'
import type { Endpoint, CreateEndpointRequest, UpdateEndpointRequest, PaginatedResponse } from '../types/endpoint'

/**
 * Endpoint Service
 * 엔드포인트 관련 API 작업을 처리하는 서비스
 */

class EndpointService {
  /**
   * 모든 엔드포인트 조회
   * @param page 페이지 번호 (기본값: 1)
   * @param limit 페이지당 항목 수 (기본값: 10)
   * @param status 상태 필터 (선택사항)
   * @returns 엔드포인트 목록 (페이지네이션)
   */
  async getEndpoints(
    page: number = 1,
    limit: number = 10,
    status?: string
  ): Promise<PaginatedResponse<Endpoint>> {
    try {
      const response = await apiClient.get<PaginatedResponse<Endpoint>>(
        '/endpoints',
        {
          params: {
            page,
            limit,
            ...(status && { status }),
          },
        }
      )
      return response.data
    } catch (error) {
      console.error('Failed to fetch endpoints:', error)
      throw error
    }
  }

  /**
   * 특정 엔드포인트 조회
   * @param id 엔드포인트 ID
   * @returns 엔드포인트 상세 정보
   */
  async getEndpoint(id: string): Promise<Endpoint> {
    try {
      const response = await apiClient.get<Endpoint>(`/endpoints/${id}`)
      return response.data
    } catch (error) {
      console.error(`Failed to fetch endpoint ${id}:`, error)
      throw error
    }
  }

  /**
   * 새로운 엔드포인트 생성
   * @param data 엔드포인트 생성 데이터
   * @returns 생성된 엔드포인트
   */
  async createEndpoint(data: CreateEndpointRequest): Promise<Endpoint> {
    try {
      const response = await apiClient.post<Endpoint>('/endpoints', data)
      return response.data
    } catch (error) {
      console.error('Failed to create endpoint:', error)
      throw error
    }
  }

  /**
   * 엔드포인트 업데이트
   * @param id 엔드포인트 ID
   * @param data 업데이트 데이터
   * @returns 업데이트된 엔드포인트
   */
  async updateEndpoint(id: string, data: UpdateEndpointRequest): Promise<Endpoint> {
    try {
      const response = await apiClient.put<Endpoint>(`/endpoints/${id}`, data)
      return response.data
    } catch (error) {
      console.error(`Failed to update endpoint ${id}:`, error)
      throw error
    }
  }

  /**
   * 엔드포인트 삭제
   * @param id 엔드포인트 ID
   */
  async deleteEndpoint(id: string): Promise<void> {
    try {
      await apiClient.delete(`/endpoints/${id}`)
    } catch (error) {
      console.error(`Failed to delete endpoint ${id}:`, error)
      throw error
    }
  }

  /**
   * 엔드포인트 즉시 체크 (수동 헬스 체크)
   * @param id 엔드포인트 ID
   * @returns 체크 결과
   */
  async checkEndpoint(id: string): Promise<{
    status: string
    responseTime: number
    statusCode: number
    message: string
  }> {
    try {
      const response = await apiClient.post(`/endpoints/${id}/check`)
      return response.data
    } catch (error) {
      console.error(`Failed to check endpoint ${id}:`, error)
      throw error
    }
  }

  /**
   * 최근 체크 결과 조회
   * @param id 엔드포인트 ID
   * @param limit 조회 개수 (기본값: 10)
   * @returns 최근 체크 결과 목록
   */
  async getCheckResults(
    id: string,
    limit: number = 10
  ): Promise<Array<{
    id: string
    endpointId: string
    status: string
    responseTime: number
    statusCode: number
    errorMessage?: string
    checkedAt: string
  }>> {
    try {
      const response = await apiClient.get(
        `/endpoints/${id}/check-results`,
        {
          params: { limit },
        }
      )
      return response.data
    } catch (error) {
      console.error(`Failed to fetch check results for endpoint ${id}:`, error)
      throw error
    }
  }
}

export default new EndpointService()
