import { create } from 'zustand'
import endpointService from '../services/endpoint.service'
import type { Endpoint, CreateEndpointRequest, UpdateEndpointRequest, PaginatedResponse } from '../types/endpoint'

interface EndpointState {
  // 상태
  endpoints: Endpoint[]
  selectedEndpoint: Endpoint | null
  totalCount: number
  currentPage: number
  pageSize: number
  isLoading: boolean
  error: string | null

  // 액션 - 조회
  fetchEndpoints: (page?: number, limit?: number, status?: string) => Promise<void>
  fetchEndpoint: (id: string) => Promise<void>
  fetchCheckResults: (id: string) => Promise<void>

  // 액션 - 생성/수정/삭제
  createEndpoint: (data: CreateEndpointRequest) => Promise<Endpoint>
  updateEndpoint: (id: string, data: UpdateEndpointRequest) => Promise<Endpoint>
  deleteEndpoint: (id: string) => Promise<void>

  // 액션 - 상태 관리
  setSelectedEndpoint: (endpoint: Endpoint | null) => void
  clearError: () => void
  reset: () => void

  // 액션 - 추가 작업
  checkEndpoint: (id: string) => Promise<any>

  // 액션 - 실시간 업데이트 (WebSocket)
  updateEndpointStatus: (endpointId: string, statusData: any) => void
  handleEndpointCreated: (endpointData: Endpoint) => void
  handleEndpointUpdated: (endpointData: Endpoint) => void
  handleEndpointDeleted: (endpointId: string) => void
}

const initialState = {
  endpoints: [],
  selectedEndpoint: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 10,
  isLoading: false,
  error: null,
}

export const useEndpointStore = create<EndpointState>((set, get) => ({
  ...initialState,

  // 모든 엔드포인트 조회
  fetchEndpoints: async (page = 1, limit = 10, status?: string) => {
    set({ isLoading: true, error: null })
    try {
      const response: PaginatedResponse<Endpoint> = await endpointService.getEndpoints(
        page,
        limit,
        status
      )
      set({
        endpoints: response.data,
        totalCount: response.meta.total,
        currentPage: response.meta.page,
        pageSize: response.meta.limit,
        isLoading: false,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '엔드포인트 조회 실패'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  // 특정 엔드포인트 조회
  fetchEndpoint: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const endpoint = await endpointService.getEndpoint(id)
      set({ selectedEndpoint: endpoint, isLoading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : '엔드포인트 조회 실패'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  // 체크 결과 조회
  fetchCheckResults: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await endpointService.getCheckResults(id, 10)
      set({ isLoading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : '체크 결과 조회 실패'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  // 엔드포인트 생성
  createEndpoint: async (data: CreateEndpointRequest) => {
    set({ isLoading: true, error: null })
    try {
      const newEndpoint = await endpointService.createEndpoint(data)
      const state = get()
      set({
        endpoints: [...state.endpoints, newEndpoint],
        totalCount: state.totalCount + 1,
        isLoading: false,
      })
      return newEndpoint
    } catch (error) {
      const message = error instanceof Error ? error.message : '엔드포인트 생성 실패'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  // 엔드포인트 업데이트
  updateEndpoint: async (id: string, data: UpdateEndpointRequest) => {
    set({ isLoading: true, error: null })
    try {
      const updatedEndpoint = await endpointService.updateEndpoint(id, data)
      const state = get()
      set({
        endpoints: state.endpoints.map((e) =>
          e.id === id ? updatedEndpoint : e
        ),
        selectedEndpoint:
          state.selectedEndpoint?.id === id
            ? updatedEndpoint
            : state.selectedEndpoint,
        isLoading: false,
      })
      return updatedEndpoint
    } catch (error) {
      const message = error instanceof Error ? error.message : '엔드포인트 업데이트 실패'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  // 엔드포인트 삭제
  deleteEndpoint: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await endpointService.deleteEndpoint(id)
      const state = get()
      set({
        endpoints: state.endpoints.filter((e) => e.id !== id),
        selectedEndpoint:
          state.selectedEndpoint?.id === id ? null : state.selectedEndpoint,
        totalCount: state.totalCount - 1,
        isLoading: false,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '엔드포인트 삭제 실패'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  // 선택된 엔드포인트 설정
  setSelectedEndpoint: (endpoint: Endpoint | null) => {
    set({ selectedEndpoint: endpoint })
  },

  // 에러 초기화
  clearError: () => {
    set({ error: null })
  },

  // 전체 상태 초기화
  reset: () => {
    set(initialState)
  },

  // 엔드포인트 수동 체크
  checkEndpoint: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const result = await endpointService.checkEndpoint(id)
      set({ isLoading: false })
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : '엔드포인트 체크 실패'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  // WebSocket 실시간 업데이트 - 엔드포인트 상태 변경
  updateEndpointStatus: (endpointId: string, statusData: any) => {
    const state = get()
    const baseEndpoint = state.endpoints.find((e) => e.id === endpointId)
    if (!baseEndpoint) return

    const updatedEndpoint = {
      ...baseEndpoint,
      currentStatus: statusData.status,
      lastCheckedAt: statusData.lastCheckedAt || new Date().toISOString(),
      lastResponseTime: statusData.responseTime || null,
    }

    set({
      endpoints: state.endpoints.map((e) =>
        e.id === endpointId ? updatedEndpoint : e
      ),
      selectedEndpoint:
        state.selectedEndpoint?.id === endpointId
          ? updatedEndpoint
          : state.selectedEndpoint,
    })
  },

  // WebSocket 실시간 업데이트 - 엔드포인트 생성
  handleEndpointCreated: (endpointData: Endpoint) => {
    const state = get()
    set({
      endpoints: [...state.endpoints, endpointData],
      totalCount: state.totalCount + 1,
    })
  },

  // WebSocket 실시간 업데이트 - 엔드포인트 수정
  handleEndpointUpdated: (endpointData: Endpoint) => {
    const state = get()
    set({
      endpoints: state.endpoints.map((e) =>
        e.id === endpointData.id ? endpointData : e
      ),
      selectedEndpoint:
        state.selectedEndpoint?.id === endpointData.id
          ? endpointData
          : state.selectedEndpoint,
    })
  },

  // WebSocket 실시간 업데이트 - 엔드포인트 삭제
  handleEndpointDeleted: (endpointId: string) => {
    const state = get()
    set({
      endpoints: state.endpoints.filter((e) => e.id !== endpointId),
      selectedEndpoint:
        state.selectedEndpoint?.id === endpointId ? null : state.selectedEndpoint,
      totalCount: state.totalCount - 1,
    })
  },
}))
