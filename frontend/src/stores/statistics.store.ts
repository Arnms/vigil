import { create } from 'zustand'
import statisticsService from '../services/statistics.service'
import type { OverviewStats, UptimeStats, ResponseTimeStats } from '../types/statistics'

interface StatisticsState {
  // 상태
  overview: OverviewStats | null
  uptimeStats: Map<string, UptimeStats>
  responseTimeStats: Map<string, ResponseTimeStats>
  statusDistribution: {
    up: number
    down: number
    degraded: number
    unknown: number
  } | null
  responseTimeTimeseries: Array<{
    timestamp: string
    avgResponseTime: number
    minResponseTime: number
    maxResponseTime: number
  }>
  uptimeTimeseries: Array<{
    timestamp: string
    uptime: number
    totalChecks: number
    failedChecks: number
  }>
  currentPeriod: 'day' | 'week' | 'month'
  selectedEndpointId: string | null
  isLoading: boolean
  error: string | null

  // 액션 - 조회
  fetchOverview: () => Promise<void>
  fetchUptime: (endpointId: string, period?: 'day' | 'week' | 'month') => Promise<void>
  fetchAllUptime: (period?: 'day' | 'week' | 'month') => Promise<void>
  fetchResponseTime: (endpointId: string, period?: 'day' | 'week' | 'month') => Promise<void>
  fetchAllResponseTime: (period?: 'day' | 'week' | 'month') => Promise<void>
  fetchResponseTimeTimeseries: (endpointId: string, hours?: number) => Promise<void>
  fetchUptimeTimeseries: (endpointId: string, hours?: number) => Promise<void>
  fetchStatusDistribution: () => Promise<void>

  // 액션 - 상태 관리
  setPeriod: (period: 'day' | 'week' | 'month') => void
  setSelectedEndpointId: (id: string | null) => void
  clearError: () => void
  reset: () => void
}

const initialState = {
  overview: null,
  uptimeStats: new Map(),
  responseTimeStats: new Map(),
  statusDistribution: null,
  responseTimeTimeseries: [],
  uptimeTimeseries: [],
  currentPeriod: 'day' as const,
  selectedEndpointId: null,
  isLoading: false,
  error: null,
}

export const useStatisticsStore = create<StatisticsState>((set, get) => ({
  ...initialState,

  // 전체 통계 개요 조회
  fetchOverview: async () => {
    set({ isLoading: true, error: null })
    try {
      const overview = await statisticsService.getOverview()
      set({ overview, isLoading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : '통계 개요 조회 실패'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  // 특정 엔드포인트의 가동률 조회
  fetchUptime: async (endpointId: string, period = 'day') => {
    set({ isLoading: true, error: null })
    try {
      const uptime = await statisticsService.getUptime(endpointId, period)
      const state = get()
      const newUptimeStats = new Map(state.uptimeStats)
      newUptimeStats.set(endpointId, uptime)
      set({ uptimeStats: newUptimeStats, isLoading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : '가동률 조회 실패'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  // 모든 엔드포인트의 가동률 조회
  fetchAllUptime: async (period = 'day') => {
    set({ isLoading: true, error: null })
    try {
      const allUptime = await statisticsService.getAllUptime(period)
      const newUptimeStats = new Map<string, UptimeStats>()
      allUptime.forEach((item) => {
        newUptimeStats.set(item.endpointId, item)
      })
      set({ uptimeStats: newUptimeStats, isLoading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : '전체 가동률 조회 실패'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  // 특정 엔드포인트의 응답 시간 조회
  fetchResponseTime: async (endpointId: string, period = 'day') => {
    set({ isLoading: true, error: null })
    try {
      const responseTime = await statisticsService.getResponseTime(endpointId, period)
      const state = get()
      const newResponseTimeStats = new Map(state.responseTimeStats)
      newResponseTimeStats.set(endpointId, responseTime)
      set({ responseTimeStats: newResponseTimeStats, isLoading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : '응답 시간 조회 실패'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  // 모든 엔드포인트의 응답 시간 조회
  fetchAllResponseTime: async (period = 'day') => {
    set({ isLoading: true, error: null })
    try {
      const allResponseTime = await statisticsService.getAllResponseTime(period)
      const newResponseTimeStats = new Map<string, ResponseTimeStats>()
      allResponseTime.forEach((item) => {
        newResponseTimeStats.set(item.endpointId, item)
      })
      set({ responseTimeStats: newResponseTimeStats, isLoading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : '전체 응답 시간 조회 실패'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  // 응답 시간 시계열 데이터 조회
  fetchResponseTimeTimeseries: async (endpointId: string, hours = 24) => {
    set({ isLoading: true, error: null })
    try {
      const data = await statisticsService.getResponseTimeTimeseries(endpointId, hours)
      set({
        responseTimeTimeseries: data,
        selectedEndpointId: endpointId,
        isLoading: false,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '응답 시간 시계열 조회 실패'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  // 가동률 시계열 데이터 조회
  fetchUptimeTimeseries: async (endpointId: string, hours = 24) => {
    set({ isLoading: true, error: null })
    try {
      const data = await statisticsService.getUptimeTimeseries(endpointId, hours)
      set({
        uptimeTimeseries: data,
        selectedEndpointId: endpointId,
        isLoading: false,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '가동률 시계열 조회 실패'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  // 상태 분포 조회
  fetchStatusDistribution: async () => {
    set({ isLoading: true, error: null })
    try {
      const distribution = await statisticsService.getStatusDistribution()
      set({ statusDistribution: distribution, isLoading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : '상태 분포 조회 실패'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  // 기간 설정
  setPeriod: (period: 'day' | 'week' | 'month') => {
    set({ currentPeriod: period })
  },

  // 선택된 엔드포인트 ID 설정
  setSelectedEndpointId: (id: string | null) => {
    set({ selectedEndpointId: id })
  },

  // 에러 초기화
  clearError: () => {
    set({ error: null })
  },

  // 전체 상태 초기화
  reset: () => {
    set(initialState)
  },
}))
