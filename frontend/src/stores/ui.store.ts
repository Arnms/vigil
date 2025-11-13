import { create } from 'zustand'

export type AlertType = 'success' | 'error' | 'warning' | 'info'

export interface Alert {
  id: string
  type: AlertType
  message: string
  duration?: number
}

interface UIState {
  // 전역 로딩 상태
  isGlobalLoading: boolean
  setGlobalLoading: (loading: boolean) => void

  // 에러 메시지
  globalError: string | null
  setGlobalError: (error: string | null) => void

  // 알림 (Toast/Notification)
  alerts: Alert[]
  addAlert: (type: AlertType, message: string, duration?: number) => string
  removeAlert: (id: string) => void
  clearAlerts: () => void

  // 모달 상태
  isModalOpen: boolean
  modalTitle: string
  modalContent: string
  openModal: (title: string, content: string) => void
  closeModal: () => void

  // 사이드바 상태
  isSidebarOpen: boolean
  toggleSidebar: () => void

  // 검색 쿼리
  searchQuery: string
  setSearchQuery: (query: string) => void

  // 필터 상태
  filters: Record<string, any>
  setFilters: (filters: Record<string, any>) => void
  clearFilters: () => void

  // 페이지네이션
  currentPage: number
  pageSize: number
  setPageSize: (size: number) => void
  goToPage: (page: number) => void

  // 정렬
  sortBy: string | null
  sortOrder: 'asc' | 'desc'
  setSortBy: (field: string, order?: 'asc' | 'desc') => void
}

let alertIdCounter = 0

export const useUIStore = create<UIState>((set) => ({
  // 전역 로딩 상태
  isGlobalLoading: false,
  setGlobalLoading: (loading: boolean) => {
    set({ isGlobalLoading: loading })
  },

  // 에러 메시지
  globalError: null,
  setGlobalError: (error: string | null) => {
    set({ globalError: error })
  },

  // 알림
  alerts: [],
  addAlert: (type: AlertType, message: string, duration = 3000) => {
    const id = `alert-${Date.now()}-${alertIdCounter++}`
    set((state) => ({
      alerts: [...state.alerts, { id, type, message, duration }],
    }))

    // 자동으로 알림 제거 (duration이 있을 경우)
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          alerts: state.alerts.filter((alert) => alert.id !== id),
        }))
      }, duration)
    }

    return id
  },

  removeAlert: (id: string) => {
    set((state) => ({
      alerts: state.alerts.filter((alert) => alert.id !== id),
    }))
  },

  clearAlerts: () => {
    set({ alerts: [] })
  },

  // 모달 상태
  isModalOpen: false,
  modalTitle: '',
  modalContent: '',
  openModal: (title: string, content: string) => {
    set({
      isModalOpen: true,
      modalTitle: title,
      modalContent: content,
    })
  },
  closeModal: () => {
    set({
      isModalOpen: false,
      modalTitle: '',
      modalContent: '',
    })
  },

  // 사이드바 상태
  isSidebarOpen: true,
  toggleSidebar: () => {
    set((state) => ({
      isSidebarOpen: !state.isSidebarOpen,
    }))
  },

  // 검색 쿼리
  searchQuery: '',
  setSearchQuery: (query: string) => {
    set({ searchQuery: query })
  },

  // 필터 상태
  filters: {},
  setFilters: (filters: Record<string, any>) => {
    set({ filters })
  },
  clearFilters: () => {
    set({ filters: {} })
  },

  // 페이지네이션
  currentPage: 1,
  pageSize: 10,
  setPageSize: (size: number) => {
    set({ pageSize: size, currentPage: 1 })
  },
  goToPage: (page: number) => {
    set({ currentPage: Math.max(1, page) })
  },

  // 정렬
  sortBy: null,
  sortOrder: 'asc' as const,
  setSortBy: (field: string, order: 'asc' | 'desc' = 'asc') => {
    set({
      sortBy: field,
      sortOrder: order,
    })
  },
}))
