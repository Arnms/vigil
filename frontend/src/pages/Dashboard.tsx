export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
        <p className="mt-2 text-gray-600">API 모니터링 대시보드에 오신 것을 환영합니다.</p>
      </div>

      {/* 통계 카드들이 여기에 표시될 예정 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">총 엔드포인트</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">-</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">활성 인시던트</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">-</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">전체 가동률</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">-</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium">평균 응답시간</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">-</p>
        </div>
      </div>
    </div>
  )
}
