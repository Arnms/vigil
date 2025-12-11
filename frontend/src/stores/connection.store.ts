import { create } from 'zustand'
import { socketService } from '../services/socket.service'

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'

interface ConnectionStore {
  status: ConnectionStatus
  setStatus: (status: ConnectionStatus) => void
  initialize: () => void
}

let isInitialized = false

export const useConnectionStore = create<ConnectionStore>((set) => {
  return {
    status: 'disconnected',
    setStatus: (status) => set({ status }),
    initialize: () => {
      // 중복 초기화 방지
      if (isInitialized) return

      const socket = socketService.getSocket()
      if (!socket) {
        console.warn('Socket not available for connection store initialization')
        return
      }

      // Socket 이벤트 리스너 등록
      socket.on('connect', () => {
        set({ status: 'connected' })
      })

      socket.on('disconnect', () => {
        set({ status: 'disconnected' })
      })

      socket.on('connect_error', () => {
        set({ status: 'connecting' })
      })

      socket.on('reconnect_attempt', () => {
        set({ status: 'connecting' })
      })

      // 초기 상태 설정
      set({ status: socketService.isConnected() ? 'connected' : 'disconnected' })
      isInitialized = true
    },
  }
})
