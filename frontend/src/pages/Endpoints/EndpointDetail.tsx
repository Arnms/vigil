import { useParams, useNavigate } from 'react-router-dom'

export default function EndpointDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">엔드포인트 상세</h1>
          <p className="mt-2 text-gray-600">ID: {id}</p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => navigate(`/endpoints/${id}/edit`)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            수정
          </button>
          <button
            onClick={() => navigate('/endpoints')}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium"
          >
            돌아가기
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 기본 정보 */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">기본 정보</h2>
          <div className="border-t pt-4">
            <p className="text-gray-500 text-sm">로드 중...</p>
          </div>
        </div>

        {/* 통계 */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">24시간 통계</h2>
          <div className="space-y-3">
            <div>
              <p className="text-gray-500 text-sm">가동률</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">총 체크</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
