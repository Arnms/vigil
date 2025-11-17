import { create } from 'zustand'
import incidentService from '../services/incident.service'
import type { Incident, CheckResult, IncidentQuery, PaginatedResponse } from '../types/incident'

interface IncidentState {
  // 상태
  incidents: Incident[]
  selectedIncident: Incident | null
  activeIncidents: Incident[]
  recentIncidents: Incident[]
  checkResults: CheckResult[]
  totalCount: number
  currentPage: number
  pageSize: number
  isLoading: boolean
  error: string | null

  // 액션 - 조회
  fetchIncidents: (page?: number, limit?: number, query?: IncidentQuery) => Promise<void>
  fetchIncident: (id: string) => Promise<void>
  fetchIncidentsByEndpoint: (endpointId: string, page?: number, limit?: number) => Promise<void>
  fetchRecentIncidents: (limit?: number) => Promise<void>
  fetchActiveIncidents: () => Promise<void>
  fetchCheckResults: (page?: number, limit?: number, endpointId?: string) => Promise<void>
  fetchEndpointCheckResults: (endpointId: string, limit?: number) => Promise<void>
  fetchFailedChecks: (page?: number, limit?: number) => Promise<void>

  // 액션 - 상태 변경
  resolveIncident: (id: string) => Promise<void>

  // 액션 - 상태 관리
  setSelectedIncident: (incident: Incident | null) => void
  clearError: () => void
  reset: () => void

  // 액션 - 실시간 업데이트 (WebSocket)
  handleIncidentStarted: (incidentData: Incident) => void
  handleIncidentResolved: (incidentData: Incident) => void
  handleCheckCompleted: (checkData: CheckResult) => void
}

const initialState = {
  incidents: [],
  selectedIncident: null,
  activeIncidents: [],
  recentIncidents: [],
  checkResults: [],
  totalCount: 0,
  currentPage: 1,
  pageSize: 20,
  isLoading: false,
  error: null,
}

export const useIncidentStore = create<IncidentState>((set, get) => ({
  ...initialState,

  // 모든 인시던트 조회
  fetchIncidents: async (page = 1, limit = 20, query?: IncidentQuery) => {
    set({ isLoading: true, error: null })
    try {
      const response: PaginatedResponse<Incident> = await incidentService.getIncidents(
        page,
        limit,
        query
      )
      set({
        incidents: response.data,
        totalCount: response.meta.total,
        currentPage: response.meta.page,
        pageSize: response.meta.limit,
        isLoading: false,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '인시던트 조회 실패'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  // 특정 인시던트 조회
  fetchIncident: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const incident = await incidentService.getIncident(id)
      set({ selectedIncident: incident, isLoading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : '인시던트 조회 실패'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  // 엔드포인트별 인시던트 조회
  fetchIncidentsByEndpoint: async (endpointId: string, page = 1, limit = 10) => {
    set({ isLoading: true, error: null })
    try {
      const response: PaginatedResponse<Incident> = await incidentService.getIncidentsByEndpoint(
        endpointId,
        page,
        limit
      )
      set({
        incidents: response.data,
        totalCount: response.meta.total,
        currentPage: response.meta.page,
        pageSize: response.meta.limit,
        isLoading: false,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '엔드포인트 인시던트 조회 실패'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  // 최근 인시던트 조회
  fetchRecentIncidents: async (limit = 10) => {
    set({ isLoading: true, error: null })
    try {
      const incidents = await incidentService.getRecentIncidents(limit)
      set({ recentIncidents: incidents, isLoading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : '최근 인시던트 조회 실패'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  // 활성화된 인시던트 조회
  fetchActiveIncidents: async () => {
    set({ isLoading: true, error: null })
    try {
      const incidents = await incidentService.getActiveIncidents()
      set({ activeIncidents: incidents, isLoading: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : '활성 인시던트 조회 실패'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  // 모든 체크 결과 조회
  fetchCheckResults: async (page = 1, limit = 50, endpointId?: string) => {
    set({ isLoading: true, error: null })
    try {
      const response: PaginatedResponse<CheckResult> = await incidentService.getCheckResults(
        page,
        limit,
        endpointId
      )
      set({
        checkResults: response.data,
        isLoading: false,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '체크 결과 조회 실패'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  // 엔드포인트별 체크 결과 조회
  fetchEndpointCheckResults: async (endpointId: string, limit = 100) => {
    set({ isLoading: true, error: null })
    try {
      const checkResults = await incidentService.getEndpointCheckResults(endpointId, limit)
      set({
        checkResults,
        isLoading: false,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '엔드포인트 체크 결과 조회 실패'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  // 실패한 체크 결과 조회
  fetchFailedChecks: async (page = 1, limit = 50) => {
    set({ isLoading: true, error: null })
    try {
      const response: PaginatedResponse<CheckResult> = await incidentService.getFailedChecks(
        page,
        limit
      )
      set({
        checkResults: response.data,
        isLoading: false,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '실패한 체크 조회 실패'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  // 인시던트 해결
  resolveIncident: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const resolved = await incidentService.resolveIncident(id)
      const state = get()
      set({
        incidents: state.incidents.map((i) =>
          i.id === id ? resolved : i
        ),
        activeIncidents: state.activeIncidents.filter((i) => i.id !== id),
        selectedIncident:
          state.selectedIncident?.id === id
            ? resolved
            : state.selectedIncident,
        isLoading: false,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '인시던트 해결 실패'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  // 선택된 인시던트 설정
  setSelectedIncident: (incident: Incident | null) => {
    set({ selectedIncident: incident })
  },

  // 에러 초기화
  clearError: () => {
    set({ error: null })
  },

  // 전체 상태 초기화
  reset: () => {
    set(initialState)
  },

  // WebSocket 실시간 업데이트 - 인시던트 시작
  handleIncidentStarted: (incidentData: Incident) => {
    const state = get()
    set({
      incidents: [incidentData, ...state.incidents],
      activeIncidents: [incidentData, ...state.activeIncidents],
      recentIncidents: [incidentData, ...state.recentIncidents.slice(0, 9)],
      totalCount: state.totalCount + 1,
    })
  },

  // WebSocket 실시간 업데이트 - 인시던트 해결
  handleIncidentResolved: (incidentData: Incident) => {
    const state = get()
    set({
      incidents: state.incidents.map((i) =>
        i.id === incidentData.id ? incidentData : i
      ),
      activeIncidents: state.activeIncidents.filter((i) => i.id !== incidentData.id),
      recentIncidents: state.recentIncidents.map((i) =>
        i.id === incidentData.id ? incidentData : i
      ),
      selectedIncident:
        state.selectedIncident?.id === incidentData.id
          ? incidentData
          : state.selectedIncident,
    })
  },

  // WebSocket 실시간 업데이트 - 체크 완료
  handleCheckCompleted: (checkData: CheckResult) => {
    const state = get()
    set({
      checkResults: [checkData, ...state.checkResults.slice(0, 49)],
    })
  },
}))
