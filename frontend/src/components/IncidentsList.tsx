import type { Incident } from '../types/incident'

interface IncidentsListProps {
  incidents: Incident[]
  isLoading: boolean
  onResolve?: (id: string) => void
}

export default function IncidentsList({
  incidents,
  isLoading,
  onResolve,
}: IncidentsListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getIncidentDuration = (startedAt: string, resolvedAt?: string) => {
    const start = new Date(startedAt)
    const end = resolvedAt ? new Date(resolvedAt) : new Date()
    const diffMs = end.getTime() - start.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60

    if (hours === 0) return `${mins}분`
    return `${hours}시간 ${mins}분`
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (incidents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
        <p className="text-lg font-medium mb-2">인시던트가 없습니다</p>
        <p className="text-sm">모든 것이 정상적으로 작동 중입니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {incidents.map((incident) => (
        <div
          key={incident.id}
          className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-start gap-4 flex-1">
            <span
              className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                incident.resolvedAt
                  ? 'text-green-600 bg-green-50'
                  : 'text-red-600 bg-red-50'
              }`}
            >
              {incident.resolvedAt ? '✓' : '⚠'}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">
                  {incident.resolvedAt ? '해결됨' : '진행 중'}
                </span>
                <span className="text-sm text-gray-500">
                  실패 {incident.failureCount}회
                </span>
              </div>
              {incident.errorMessage && (
                <p className="text-sm text-gray-600 mt-1">
                  {incident.errorMessage}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                <span>{formatDate(incident.startedAt)}</span>
                <span>·</span>
                <span>{getIncidentDuration(incident.startedAt, incident.resolvedAt)}</span>
              </div>
            </div>
          </div>
          {!incident.resolvedAt && onResolve && (
            <button
              onClick={() => onResolve(incident.id)}
              className="ml-4 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors whitespace-nowrap"
            >
              해결
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
