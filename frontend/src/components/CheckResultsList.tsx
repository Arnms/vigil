import type { CheckResult } from '../types/incident'

interface CheckResultsListProps {
  results: CheckResult[]
  isLoading: boolean
}

export default function CheckResultsList({ results, isLoading }: CheckResultsListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getStatusIcon = (status: string) => {
    return status === 'success' ? '✓' : '✕'
  }

  const getStatusColor = (status: string) => {
    return status === 'success'
      ? 'text-green-600 bg-green-50'
      : 'text-red-600 bg-red-50'
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
        <p className="text-lg font-medium mb-2">체크 결과가 없습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {results.map((result, index) => (
        <div
          key={index}
          className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-start gap-4 flex-1">
            <span
              className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${getStatusColor(result.status)}`}
            >
              {getStatusIcon(result.status)}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">
                  {result.statusCode ? `HTTP ${result.statusCode}` : 'Network Error'}
                </span>
                <span className="text-sm text-gray-500">
                  {result.responseTime}ms
                </span>
              </div>
              {result.errorMessage && (
                <p className="text-sm text-red-600 mt-1">{result.errorMessage}</p>
              )}
            </div>
          </div>
          <div className="text-right text-sm text-gray-500 whitespace-nowrap ml-4">
            {formatDate(result.checkedAt)}
          </div>
        </div>
      ))}
    </div>
  )
}
