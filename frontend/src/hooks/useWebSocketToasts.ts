import { useEffect } from 'react'
import { socketService } from '../services/socket.service'
import { useToastStore } from '../stores/toast.store'
import { useEndpointStore } from '../stores/endpoint.store'
import { useIncidentStore } from '../stores/incident.store'

/**
 * WebSocket 이벤트에서 토스트 알림과 실시간 상태 업데이트를 관리하는 커스텀 훅
 */
export function useWebSocketToasts() {
  const { addToast } = useToastStore()
  const {
    updateEndpointStatus,
    handleEndpointCreated,
    handleEndpointUpdated,
    handleEndpointDeleted,
  } = useEndpointStore()
  const {
    handleIncidentStarted,
    handleIncidentResolved,
    handleCheckCompleted,
  } = useIncidentStore()

  useEffect(() => {
    // 상태 변경 이벤트
    socketService.on('endpoint:status-changed', (data) => {
      const endpointName = data.endpointName || '엔드포인트'

      // 상태 업데이트
      updateEndpointStatus(data.endpointId, {
        status: data.currentStatus,
        lastCheckedAt: data.lastCheckedAt,
        responseTime: data.responseTime,
      })

      // 토스트 알림
      if (data.currentStatus === 'DOWN') {
        addToast(`❌ ${endpointName} 장애 발생`, 'error')
      } else if (data.currentStatus === 'UP') {
        addToast(`✅ ${endpointName} 정상 작동`, 'success')
      } else if (data.currentStatus === 'DEGRADED') {
        addToast(`⚠️ ${endpointName} 성능 저하`, 'warning')
      }
    })

    // 인시던트 시작 이벤트
    socketService.on('incident:started', (data) => {
      const endpointName = data.endpointName || '엔드포인트'

      // 인시던트 저장소 업데이트
      handleIncidentStarted(data)

      // 토스트 알림
      addToast(`🚨 ${endpointName} 장애 시작됨`, 'error')
    })

    // 인시던트 해결 이벤트
    socketService.on('incident:resolved', (data) => {
      const endpointName = data.endpointName || '엔드포인트'

      // 인시던트 저장소 업데이트
      handleIncidentResolved(data)

      // 토스트 알림
      addToast(`✨ ${endpointName} 복구됨`, 'success')
    })

    // 체크 완료 이벤트
    socketService.on('check:completed', (data) => {
      // 체크 결과 저장소 업데이트
      handleCheckCompleted(data)

      // 실패한 경우만 토스트 표시
      if (data.status === 'failure') {
        const endpointName = data.endpointName || '엔드포인트'
        addToast(`❌ ${endpointName} 헬스 체크 실패`, 'error', 2000)
      }
    })

    // 엔드포인트 생성 이벤트
    socketService.on('endpoint:created', (data) => {
      // 엔드포인트 저장소 업데이트
      handleEndpointCreated(data)

      // 토스트 알림
      addToast(`✅ ${data.name} 엔드포인트 등록됨`, 'success', 2000)
    })

    // 엔드포인트 수정 이벤트
    socketService.on('endpoint:updated', (data) => {
      // 엔드포인트 저장소 업데이트
      handleEndpointUpdated(data)

      // 토스트 알림
      addToast(`✏️ ${data.name} 엔드포인트 수정됨`, 'info', 2000)
    })

    // 엔드포인트 삭제 이벤트
    socketService.on('endpoint:deleted', (data) => {
      // 엔드포인트 저장소 업데이트
      handleEndpointDeleted(data.id || data.endpointId)

      // 토스트 알림
      addToast(`🗑️ ${data.name} 엔드포인트 삭제됨`, 'info', 2000)
    })

    // 정리: 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      socketService.off('endpoint:status-changed')
      socketService.off('incident:started')
      socketService.off('incident:resolved')
      socketService.off('check:completed')
      socketService.off('endpoint:created')
      socketService.off('endpoint:updated')
      socketService.off('endpoint:deleted')
    }
  }, [
    addToast,
    updateEndpointStatus,
    handleEndpointCreated,
    handleEndpointUpdated,
    handleEndpointDeleted,
    handleIncidentStarted,
    handleIncidentResolved,
    handleCheckCompleted,
  ])
}
