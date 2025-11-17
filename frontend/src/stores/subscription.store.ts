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
      socketService.emit('subscribe:endpoint', { endpointId })
      set({ subscriptions: newSubs })
    }
  },

  unsubscribe: (endpointId: string) => {
    const current = get().subscriptions
    if (current.has(endpointId)) {
      const newSubs = new Set(current)
      newSubs.delete(endpointId)
      socketService.emit('unsubscribe:endpoint', { endpointId })
      set({ subscriptions: newSubs })
    }
  },

  subscribeAll: () => {
    socketService.emit('subscribe:all', {})
    // 모든 엔드포인트 구독 표시
    set({ subscriptions: new Set() })
  },

  unsubscribeAll: () => {
    const current = get().subscriptions
    current.forEach((endpointId) => {
      socketService.emit('unsubscribe:endpoint', { endpointId })
    })
    set({ subscriptions: new Set() })
  },

  isSubscribed: (endpointId: string) => {
    return get().subscriptions.has(endpointId)
  },
}))
