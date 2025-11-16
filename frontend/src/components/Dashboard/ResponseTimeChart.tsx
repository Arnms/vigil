import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ChartDataPoint {
  timestamp: string
  [key: string]: string | number
}

interface ResponseTimeChartProps {
  data: ChartDataPoint[]
  isLoading?: boolean
}

export default function ResponseTimeChart({ data, isLoading }: ResponseTimeChartProps) {
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

  // 차트에서 timestamp를 제외한 숫자 키 찾기
  const dataKeys = Object.keys(data[0]).filter((key) => key !== 'timestamp' && typeof data[0][key] === 'number')

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">응답시간 트렌드 (24시간)</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="timestamp"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            label={{ value: '응답시간 (ms)', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
            }}
            formatter={(value) => `${value}ms`}
          />
          <Legend />
          {dataKeys.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[index % colors.length]}
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
