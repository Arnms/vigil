import { useEffect, useState } from 'react'
import { useEndpointStore } from '../stores/endpoint.store'
import { useIncidentStore } from '../stores/incident.store'
import { useStatisticsStore } from '../stores/statistics.store'
import StatusCard from '../components/Dashboard/StatusCard'
import ResponseTimeChart from '../components/Dashboard/ResponseTimeChart'
import UptimeChart from '../components/Dashboard/UptimeChart'
import IncidentTimeline from '../components/Dashboard/IncidentTimeline'
import DateRangePicker, { type DateRange } from '../components/Common/DateRangePicker'

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange>('24h')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Zustand 스토어
  const { endpoints, fetchEndpoints, isLoading } = useEndpointStore()
  const { fetchRecentIncidents, recentIncidents, fetchIncidents, incidents } =
    useIncidentStore()
  const {
    fetchOverview,
    fetchStatusDistribution,
    fetchAllUptimeTimeseries,
    fetchAllResponseTimeTimeseries,
    overview,
    allResponseTimeTimeseries,
  } = useStatisticsStore()

  // 초기 데이터 로드
  useEffect(() => {
    fetchEndpoints()
    fetchRecentIncidents()
    fetchIncidents()
    fetchOverview()
    fetchStatusDistribution()
    fetchAllUptimeTimeseries('hourly', 24)
    fetchAllResponseTimeTimeseries('hourly', 24)
  }, [
    fetchEndpoints,
    fetchRecentIncidents,
    fetchIncidents,
    fetchOverview,
    fetchStatusDistribution,
    fetchAllUptimeTimeseries,
    fetchAllResponseTimeTimeseries,
  ])

  // 5초마다 자동 새로고침
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOverview()
      fetchStatusDistribution()
      setLastUpdate(new Date())
    }, 5000)

    return () => clearInterval(interval)
  }, [fetchOverview, fetchStatusDistribution])

  // 30초마다 차트 데이터 새로고침
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAllUptimeTimeseries('hourly', 24)
      fetchAllResponseTimeTimeseries('hourly', 24)
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchAllUptimeTimeseries, fetchAllResponseTimeTimeseries])

  // 기간 변경 시 데이터 갱신
  useEffect(() => {
    const hours = dateRange === '24h' ? 24 : dateRange === '7d' ? 168 : 720 // 24h, 7d, 30d
    const period = dateRange === '24h' ? 'hourly' : 'daily'
    fetchAllUptimeTimeseries(period as 'hourly' | 'daily', hours)
    fetchAllResponseTimeTimeseries(period as 'hourly' | 'daily', hours)
  }, [dateRange, fetchAllUptimeTimeseries, fetchAllResponseTimeTimeseries])

  // 통계 계산
  const activeIncidents = incidents.filter((i) => !i.resolvedAt).length
  const upEndpoints = endpoints.filter((e) => e.currentStatus === 'UP').length
  const downEndpoints = endpoints.filter((e) => e.currentStatus === 'DOWN').length
  const avgUptime = overview?.overallUptime ?? 0

  // 응답시간 차트 데이터 변환
  const responseTimeChartData = allResponseTimeTimeseries.map((item: { timestamp: string; value: number }) => ({
    timestamp: new Date(item.timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    '평균 응답시간': item.value,
  }))

  // 가동률 차트 데이터 변환 (엔드포인트의 현재 상태 기반)
  const uptimeChartData = endpoints.map((endpoint) => {
    // 현재 상태 기반 대략적인 가동률 표시
    const estimatedUptime =
      endpoint.currentStatus === 'UP'
        ? 0.99
        : endpoint.currentStatus === 'DEGRADED'
          ? 0.85
          : 0.5

    return {
      name: endpoint.name,
      uptime: estimatedUptime,
    }
  })

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
          <p className="mt-2 text-gray-600">API 모니터링 대시보드에 오신 것을 환영합니다.</p>
          <p className="text-xs text-gray-500 mt-2">
            마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}
          </p>
        </div>
        <DateRangePicker selectedRange={dateRange} onRangeChange={setDateRange} />
      </div>

      {/* 요약 통계 카드 (4개) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatusCard
          title="정상 서버"
          value={upEndpoints}
          icon="🟢"
          color="green"
          trend={upEndpoints > downEndpoints ? 'up' : 'down'}
        />
        <StatusCard
          title="장애 서버"
          value={downEndpoints}
          icon="🔴"
          color="red"
          trend={downEndpoints === 0 ? 'stable' : 'down'}
        />
        <StatusCard
          title="전체 가동률"
          value={avgUptime.toFixed(2)}
          unit="%"
          icon="📊"
          color="blue"
          trend={avgUptime >= 99 ? 'up' : avgUptime >= 95 ? 'stable' : 'down'}
        />
        <StatusCard
          title="활성 인시던트"
          value={activeIncidents}
          icon="🚨"
          color={activeIncidents === 0 ? 'green' : 'red'}
          trend={activeIncidents === 0 ? 'up' : 'down'}
        />
      </div>

      {/* 차트 섹션 (2열) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ResponseTimeChart data={responseTimeChartData} isLoading={isLoading} />
        <UptimeChart data={uptimeChartData} isLoading={isLoading} />
      </div>

      {/* 최근 인시던트 타임라인 */}
      <IncidentTimeline incidents={recentIncidents} isLoading={isLoading} />
    </div>
  )
}
