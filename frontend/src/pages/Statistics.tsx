export default function Statistics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">통계</h1>
        <p className="mt-2 text-gray-600">API 모니터링 통계 및 분석</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">엔드포인트별 가동률</h2>
          <div className="text-center text-gray-500">로드 중...</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">응답 시간 분석</h2>
          <div className="text-center text-gray-500">로드 중...</div>
        </div>
      </div>
    </div>
  )
}
