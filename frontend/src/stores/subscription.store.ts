import { create } from 'zustand'
import { socketService } from '../services/socket.service'

interface SubscriptionStore {
  subscriptions: Set<string>
  subscribe: (endpointId: string) => void
  unsubscribe: (endpointId: string) => void
  subscribeAll: () => void
  unsubscribeAll: () => void
  isSubscribed: (endpointId: string) => boolean
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  subscriptions: new Set(),

  subscribe: (endpointId: string) => {
    const current = get().subscriptions
    if (!current.has(endpointId)) {
      const newSubs = new Set(current)
      newSubs.add(endpointId)
      // 서버에 구독 요청
      socketService.subscribeToEndpoint(endpointId)
      set({ subscriptions: newSubs })
    }
  },

  unsubscribe: (endpointId: string) => {
    const current = get().subscriptions
    if (current.has(endpointId)) {
      const newSubs = new Set(current)
      newSubs.delete(endpointId)
      // 서버에 구독 해제 요청
      socketService.unsubscribeFromEndpoint(endpointId)
      set({ subscriptions: newSubs })
    }
  },

  subscribeAll: () => {
    // 서버에 전체 구독 요청
    socketService.subscribeToAllEndpoints()
    // 모든 엔드포인트 구독 표시
    set({ subscriptions: new Set() })
  },

  unsubscribeAll: () => {
    const current = get().subscriptions
    current.forEach((endpointId) => {
      // 서버에 구독 해제 요청
      socketService.unsubscribeFromEndpoint(endpointId)
    })
    set({ subscriptions: new Set() })
  },

  isSubscribed: (endpointId: string) => {
    return get().subscriptions.has(endpointId)
  },
}))
