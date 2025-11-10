import apiClient from './api'
import type { OverviewStats, UptimeStats, ResponseTimeStats } from '../types/statistics'

/**
 * Statistics Service
 * 통계 및 분석 데이터 조회를 처리하는 서비스
 */

class StatisticsService {
  /**
   * 전체 통계 개요 조회
   * @returns 전체 시스템 통계
   */
  async getOverview(): Promise<OverviewStats> {
    try {
      const response = await apiClient.get<OverviewStats>('/statistics/overview')
      return response.data
    } catch (error) {
      console.error('Failed to fetch overview statistics:', error)
      throw error
    }
  }

  /**
   * 특정 엔드포인트의 가동률 조회
   * @param endpointId 엔드포인트 ID
   * @param period 기간 ('day' | 'week' | 'month')
   * @returns 가동률 통계
   */
  async getUptime(
    endpointId: string,
    period: 'day' | 'week' | 'month' = 'day'
  ): Promise<UptimeStats> {
    try {
      const response = await apiClient.get<UptimeStats>(
        `/statistics/uptime/${endpointId}`,
        {
          params: { period },
        }
      )
      return response.data
    } catch (error) {
      console.error(`Failed to fetch uptime statistics for endpoint ${endpointId}:`, error)
      throw error
    }
  }

  /**
   * 모든 엔드포인트의 가동률 조회
   * @param period 기간 ('day' | 'week' | 'month')
   * @returns 엔드포인트별 가동률 통계 배열
   */
  async getAllUptime(
    period: 'day' | 'week' | 'month' = 'day'
  ): Promise<Array<UptimeStats & { endpointId: string; endpointName: string }>> {
    try {
      const response = await apiClient.get(
        '/statistics/uptime',
        {
          params: { period },
        }
      )
      return response.data
    } catch (error) {
      console.error('Failed to fetch all uptime statistics:', error)
      throw error
    }
  }

  /**
   * 특정 엔드포인트의 응답 시간 통계 조회
   * @param endpointId 엔드포인트 ID
   * @param period 기간 ('day' | 'week' | 'month')
   * @returns 응답 시간 통계
   */
  async getResponseTime(
    endpointId: string,
    period: 'day' | 'week' | 'month' = 'day'
  ): Promise<ResponseTimeStats> {
    try {
      const response = await apiClient.get<ResponseTimeStats>(
        `/statistics/response-time/${endpointId}`,
        {
          params: { period },
        }
      )
      return response.data
    } catch (error) {
      console.error(
        `Failed to fetch response time statistics for endpoint ${endpointId}:`,
        error
      )
      throw error
    }
  }

  /**
   * 모든 엔드포인트의 응답 시간 통계 조회
   * @param period 기간 ('day' | 'week' | 'month')
   * @returns 엔드포인트별 응답 시간 통계 배열
   */
  async getAllResponseTime(
    period: 'day' | 'week' | 'month' = 'day'
  ): Promise<Array<ResponseTimeStats & { endpointId: string; endpointName: string }>> {
    try {
      const response = await apiClient.get(
        '/statistics/response-time',
        {
          params: { period },
        }
      )
      return response.data
    } catch (error) {
      console.error('Failed to fetch all response time statistics:', error)
      throw error
    }
  }

  /**
   * 엔드포인트별 시간대별 응답 시간 데이터 조회 (차트용)
   * @param endpointId 엔드포인트 ID
   * @param hours 시간 범위 (기본값: 24)
   * @returns 시간대별 응답 시간 데이터
   */
  async getResponseTimeTimeseries(
    endpointId: string,
    hours: number = 24
  ): Promise<Array<{
    timestamp: string
    avgResponseTime: number
    minResponseTime: number
    maxResponseTime: number
  }>> {
    try {
      const response = await apiClient.get(
        `/statistics/response-time/${endpointId}/timeseries`,
        {
          params: { hours },
        }
      )
      return response.data
    } catch (error) {
      console.error(
        `Failed to fetch response time timeseries for endpoint ${endpointId}:`,
        error
      )
      throw error
    }
  }

  /**
   * 엔드포인트별 시간대별 가동률 데이터 조회 (차트용)
   * @param endpointId 엔드포인트 ID
   * @param hours 시간 범위 (기본값: 24)
   * @returns 시간대별 가동률 데이터
   */
  async getUptimeTimeseries(
    endpointId: string,
    hours: number = 24
  ): Promise<Array<{
    timestamp: string
    uptime: number
    totalChecks: number
    failedChecks: number
  }>> {
    try {
      const response = await apiClient.get(
        `/statistics/uptime/${endpointId}/timeseries`,
        {
          params: { hours },
        }
      )
      return response.data
    } catch (error) {
      console.error(
        `Failed to fetch uptime timeseries for endpoint ${endpointId}:`,
        error
      )
      throw error
    }
  }

  /**
   * 상태별 엔드포인트 개수 조회
   * @returns 상태별 엔드포인트 개수
   */
  async getStatusDistribution(): Promise<{
    up: number
    down: number
    degraded: number
    unknown: number
  }> {
    try {
      const response = await apiClient.get('/statistics/status-distribution')
      return response.data
    } catch (error) {
      console.error('Failed to fetch status distribution:', error)
      throw error
    }
  }
}

export default new StatisticsService()
