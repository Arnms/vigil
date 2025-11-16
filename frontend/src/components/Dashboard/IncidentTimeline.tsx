import type { Incident } from '../../types/incident'

interface IncidentTimelineProps {
  incidents: Incident[]
  isLoading?: boolean
}

const formatDuration = (startTime: string, endTime?: string) => {
  const start = new Date(startTime).getTime()
  const end = endTime ? new Date(endTime).getTime() : new Date().getTime()
  const durationMs = end - start
  const durationMinutes = Math.floor(durationMs / 60000)

  if (durationMinutes < 1) return '1분 미만'
  if (durationMinutes < 60) return `${durationMinutes}분`

  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60

  return `${hours}시간 ${minutes}분`
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function IncidentTimeline({ incidents, isLoading }: IncidentTimelineProps) {
  if (isLoading) {
    return (
      <div className="h-80 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!incidents || incidents.length === 0) {
    return (
      <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">최근 인시던트가 없습니다</div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">최근 인시던트</h2>
      <div className="space-y-4">
        {incidents.slice(0, 10).map((incident, index) => (
          <div key={incident.id} className="flex gap-4">
            {/* 타임라인 라인 및 원 */}
            <div className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full ${
                  incident.resolvedAt ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              {index !== Math.min(incidents.length, 10) - 1 && (
                <div className="w-0.5 h-12 bg-gray-300 my-2" />
              )}
            </div>

            {/* 인시던트 정보 */}
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {incident.endpointName || `Endpoint ${incident.endpointId}`}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatDate(incident.startedAt)}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      incident.resolvedAt
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {incident.resolvedAt ? '해결됨' : '진행 중'}
                  </span>
                </div>
              </div>

              {/* 인시던트 상세 정보 */}
              <div className="mt-2 text-sm text-gray-600">
                <p>
                  <span className="font-medium">지속시간:</span>{' '}
                  {formatDuration(incident.startedAt, incident.resolvedAt)}
                </p>
                {incident.failureCount > 0 && (
                  <p>
                    <span className="font-medium">실패 횟수:</span> {incident.failureCount}회
                  </p>
                )}
                {incident.errorMessage && (
                  <p>
                    <span className="font-medium">에러:</span> {incident.errorMessage}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
