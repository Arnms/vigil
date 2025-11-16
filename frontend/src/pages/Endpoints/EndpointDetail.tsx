import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useEndpointStore } from '../../stores/endpoint.store'
import { useIncidentStore } from '../../stores/incident.store'
import { useStatisticsStore } from '../../stores/statistics.store'
import { useUIStore } from '../../stores/ui.store'
import StatusBadge from '../../components/StatusBadge'
import InfoCard from '../../components/InfoCard'
import CheckResultsList from '../../components/CheckResultsList'
import IncidentsList from '../../components/IncidentsList'

export default function EndpointDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isDeleting, setIsDeleting] = useState(false)

  // Zustand 스토어
  const { selectedEndpoint, fetchEndpoint, deleteEndpoint, checkEndpoint, isLoading } =
    useEndpointStore()
  const {
    fetchIncidentsByEndpoint,
    incidents,
    resolveIncident,
    fetchEndpointCheckResults,
    checkResults,
  } = useIncidentStore()
  const { fetchUptime, fetchResponseTime, uptimeStats, responseTimeStats } =
    useStatisticsStore()
  const { addAlert } = useUIStore()

  // 데이터 로드
  useEffect(() => {
    if (id) {
      fetchEndpoint(id)
      fetchIncidentsByEndpoint(id)
      fetchEndpointCheckResults(id)
      fetchUptime(id, 'day')
      fetchResponseTime(id, 'day')
    }
  }, [id, fetchEndpoint, fetchIncidentsByEndpoint, fetchEndpointCheckResults, fetchUptime, fetchResponseTime])

  const handleCheck = async () => {
    if (!id) return
    try {
      await checkEndpoint(id)
      addAlert('success', '엔드포인트 체크가 실행되었습니다', 3000)
      // 체크 결과 새로고침
      setTimeout(() => {
        fetchEndpointCheckResults(id)
      }, 1000)
    } catch (err) {
      addAlert('error', '엔드포인트 체크에 실패했습니다', 3000)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    if (!window.confirm('정말로 이 엔드포인트를 삭제하시겠습니까?')) return

    setIsDeleting(true)
    try {
      await deleteEndpoint(id)
      addAlert('success', '엔드포인트가 삭제되었습니다', 3000)
      navigate('/endpoints')
    } catch (err) {
      addAlert('error', '엔드포인트 삭제에 실패했습니다', 3000)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleResolve = async (incidentId: string) => {
    try {
      await resolveIncident(incidentId)
      addAlert('success', '인시던트가 해결되었습니다', 3000)
    } catch (err) {
      addAlert('error', '인시던트 해결에 실패했습니다', 3000)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!selectedEndpoint) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-lg font-medium text-gray-900 mb-4">엔드포인트를 찾을 수 없습니다</p>
        <button
          onClick={() => navigate('/endpoints')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
        >
          목록으로 돌아가기
        </button>
      </div>
    )
  }

  const uptime = uptimeStats.get(id || '')
  const responseTime = responseTimeStats.get(id || '')

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{selectedEndpoint.name}</h1>
            <StatusBadge status={selectedEndpoint.currentStatus} />
          </div>
          <p className="text-gray-600">
            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
              {selectedEndpoint.method} {selectedEndpoint.url}
            </code>
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleCheck}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium transition-colors"
          >
            ✓ 즉시 체크
          </button>
          <button
            onClick={() => navigate(`/endpoints/${id}`)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            ✎ 수정
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? '삭제 중...' : '✕ 삭제'}
          </button>
          <button
            onClick={() => navigate('/endpoints')}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium transition-colors"
          >
            ← 돌아가기
          </button>
        </div>
      </div>

      {/* 기본 정보 및 통계 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 기본 정보 */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <InfoCard
                title="메서드"
                value={selectedEndpoint.method}
                icon="🔗"
                color="blue"
                size="sm"
              />
              <InfoCard
                title="예상 상태 코드"
                value={selectedEndpoint.expectedStatusCode}
                icon="📊"
                color="blue"
                size="sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InfoCard
                title="체크 간격"
                value={`${Math.floor(selectedEndpoint.checkInterval / 60)}분`}
                icon="⏱️"
                color="blue"
                size="sm"
              />
              <InfoCard
                title="타임아웃"
                value={`${selectedEndpoint.timeoutThreshold}ms`}
                icon="⚙️"
                color="blue"
                size="sm"
              />
            </div>
            <div>
              <InfoCard
                title="활성화 여부"
                value={selectedEndpoint.isActive ? '활성화' : '비활성화'}
                icon={selectedEndpoint.isActive ? '✓' : '✕'}
                color={selectedEndpoint.isActive ? 'green' : 'gray'}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* 24시간 통계 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">24시간 통계</h2>
          <div className="space-y-3">
            {uptime ? (
              <InfoCard
                title="가동률"
                value={`${(uptime.uptime * 100).toFixed(2)}%`}
                subtitle={`${uptime.totalChecks}회 체크`}
                icon="📈"
                color="green"
                size="sm"
              />
            ) : (
              <InfoCard
                title="가동률"
                value="데이터 없음"
                icon="📈"
                color="gray"
                size="sm"
              />
            )}
            {responseTime ? (
              <InfoCard
                title="평균 응답시간"
                value={`${responseTime.statistics.average}ms`}
                subtitle={`${responseTime.statistics.min}ms ~ ${responseTime.statistics.max}ms`}
                icon="⚡"
                color="blue"
                size="sm"
              />
            ) : (
              <InfoCard
                title="평균 응답시간"
                value="데이터 없음"
                icon="⚡"
                color="gray"
                size="sm"
              />
            )}
          </div>
        </div>
      </div>

      {/* 최근 체크 결과 및 인시던트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 체크 결과 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">최근 체크 결과</h2>
          <CheckResultsList results={checkResults.slice(0, 10)} isLoading={isLoading} />
        </div>

        {/* 최근 인시던트 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">최근 인시던트</h2>
          <IncidentsList
            incidents={incidents.slice(0, 10)}
            isLoading={isLoading}
            onResolve={handleResolve}
          />
        </div>
      </div>
    </div>
  )
}
