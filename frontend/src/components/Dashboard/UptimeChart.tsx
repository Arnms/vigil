import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

interface UptimeData {
  name: string
  uptime: number
}

interface UptimeChartProps {
  data: UptimeData[]
  isLoading?: boolean
}

const getUptimeColor = (uptime: number) => {
  if (uptime >= 99) return '#10b981' // 초록색 - 99% 이상
  if (uptime >= 95) return '#84cc16' // 라임색 - 95% 이상
  if (uptime >= 90) return '#f59e0b' // 주황색 - 90% 이상
  return '#ef4444' // 빨간색 - 90% 미만
}

export default function UptimeChart({ data, isLoading }: UptimeChartProps) {
  if (isLoading) {
    return (
      <div className="h-80 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">데이터가 없습니다</div>
      </div>
    )
  }

  // 가동률 순으로 정렬 (높은 순)
  const sortedData = [...data].sort((a, b) => b.uptime - a.uptime)

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">엔드포인트별 가동률</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={sortedData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            label={{ value: '가동률 (%)', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
            formatter={(value) => `${(value as number).toFixed(2)}%`}
          />
          <Legend />
          <Bar dataKey="uptime" name="가동률" radius={[8, 8, 0, 0]}>
            {sortedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getUptimeColor(entry.uptime)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
