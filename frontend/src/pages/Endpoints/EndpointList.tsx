import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { useEndpointStore } from '../../stores/endpoint.store'
import { useSubscriptionStore } from '../../stores/subscription.store'
import { useUIStore } from '../../stores/ui.store'
import EndpointTable from '../../components/EndpointTable'
import type { Endpoint } from '../../types/endpoint'

export default function EndpointList() {
  const navigate = useNavigate()
  const [selectedStatus, setSelectedStatus] = useState<string>('')

  // Zustand 스토어
  const {
    endpoints,
    isLoading,
    error,
    currentPage,
    pageSize,
    totalCount,
    fetchEndpoints,
    deleteEndpoint,
    checkEndpoint,
  } = useEndpointStore()

  const { subscribeAll, unsubscribeAll } = useSubscriptionStore()
  const { addAlert } = useUIStore()

  // 컴포넌트 마운트 시 엔드포인트 목록 조회 및 전체 구독
  useEffect(() => {
    fetchEndpoints(currentPage, pageSize, selectedStatus || undefined)
    // 모든 엔드포인트에 대해 구독 (실시간 업데이트 수신)
    subscribeAll()

    // 언마운트 시 구독 해제
    return () => {
      unsubscribeAll()
    }
  }, [currentPage, pageSize, selectedStatus, fetchEndpoints, subscribeAll, unsubscribeAll])

  // 에러 처리
  useEffect(() => {
    if (error) {
      addAlert('error', error, 5000)
    }
  }, [error, addAlert])

  // 엔드포인트 삭제 처리
  const handleDelete = async (id: string) => {
    try {
      await deleteEndpoint(id)
      addAlert('success', '엔드포인트가 삭제되었습니다', 3000)
    } catch (err) {
      addAlert('error', '엔드포인트 삭제에 실패했습니다', 3000)
    }
  }

  // 엔드포인트 수정 처리
  const handleEdit = (endpoint: Endpoint) => {
    navigate(`/endpoints/${endpoint.id}`)
  }

  // 엔드포인트 수동 체크
  const handleCheck = async (id: string) => {
    try {
      await checkEndpoint(id)
      addAlert('success', '엔드포인트 체크가 실행되었습니다', 3000)
      // 목록 새로고침
      fetchEndpoints(currentPage, pageSize, selectedStatus || undefined)
    } catch (err) {
      addAlert('error', '엔드포인트 체크에 실패했습니다', 3000)
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">엔드포인트</h1>
          <p className="mt-2 text-gray-600">
            모니터링 중인 API 엔드포인트 목록 ({totalCount}개)
          </p>
        </div>
        <Link
          to="/endpoints/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors"
        >
          + 새 엔드포인트
        </Link>
      </div>

      {/* 필터 */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              상태 필터
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedStatus('')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedStatus === ''
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                전체
              </button>
              <button
                onClick={() => setSelectedStatus('UP')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedStatus === 'UP'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🟢 정상
              </button>
              <button
                onClick={() => setSelectedStatus('DOWN')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedStatus === 'DOWN'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🔴 다운
              </button>
              <button
                onClick={() => setSelectedStatus('DEGRADED')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedStatus === 'DEGRADED'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🟡 저하
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-lg shadow">
        <EndpointTable
          endpoints={endpoints}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCheck={handleCheck}
        />
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
          >
            이전
          </button>
          <span className="px-4 py-2 text-gray-600">
            페이지 {currentPage} / {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
          >
            다음
          </button>
        </div>
      )}
    </div>
  )
}
