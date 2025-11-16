import { Link } from 'react-router-dom'
import type { Endpoint } from '../types/endpoint'
import StatusBadge from './StatusBadge'

interface EndpointTableProps {
  endpoints: Endpoint[]
  isLoading: boolean
  onEdit: (endpoint: Endpoint) => void
  onDelete: (id: string) => void
  onCheck: (id: string) => void
}

export default function EndpointTable({
  endpoints,
  isLoading,
  onEdit,
  onDelete,
  onCheck,
}: EndpointTableProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (endpoints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
        <p className="text-lg font-medium mb-2">등록된 엔드포인트가 없습니다</p>
        <p className="text-sm">새로운 엔드포인트를 추가하세요</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 bg-white shadow-md rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              이름
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              URL
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              메서드
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              상태
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              체크 간격
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              생성일
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              작업
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {endpoints.map((endpoint) => (
            <tr key={endpoint.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <Link
                  to={`/endpoints/${endpoint.id}`}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  {endpoint.name}
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                  {endpoint.url.length > 50 ? `${endpoint.url.slice(0, 50)}...` : endpoint.url}
                </code>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm font-medium text-gray-900">{endpoint.method}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge status={endpoint.currentStatus} size="sm" />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-600">
                  {Math.floor(endpoint.checkInterval / 60)}분
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(endpoint.createdAt)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                <button
                  onClick={() => onCheck(endpoint.id)}
                  className="text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                  title="즉시 체크 실행"
                >
                  ✓ 체크
                </button>
                <button
                  onClick={() => onEdit(endpoint)}
                  className="text-green-600 hover:text-green-800 px-2 py-1 rounded hover:bg-green-50"
                >
                  ✎ 수정
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('정말로 삭제하시겠습니까?')) {
                      onDelete(endpoint.id)
                    }
                  }}
                  className="text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
                >
                  ✕ 삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
