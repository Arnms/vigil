import { create } from 'zustand'
import { socketService } from '../services/socket.service'

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'

interface ConnectionStore {
  status: ConnectionStatus
  setStatus: (status: ConnectionStatus) => void
}

export const useConnectionStore = create<ConnectionStore>((set) => {
  // Socket 이벤트 리스너 등록
  const socket = socketService.getSocket()

  if (socket) {
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
  }

  return {
    status: socketService.isConnected() ? 'connected' : 'disconnected',
    setStatus: (status) => set({ status }),
  }
})
