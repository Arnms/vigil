interface StatusCardProps {
  title: string
  value: string | number
  unit?: string
  icon?: string
  trend?: 'up' | 'down' | 'stable'
  color?: 'green' | 'red' | 'blue' | 'yellow'
}

const colorConfig = {
  green: 'bg-green-50 border-green-200',
  red: 'bg-red-50 border-red-200',
  blue: 'bg-blue-50 border-blue-200',
  yellow: 'bg-yellow-50 border-yellow-200',
}

const textColorConfig = {
  green: 'text-green-900',
  red: 'text-red-900',
  blue: 'text-blue-900',
  yellow: 'text-yellow-900',
}

const trendIconConfig = {
  up: { icon: '📈', className: 'text-green-600' },
  down: { icon: '📉', className: 'text-red-600' },
  stable: { icon: '➡️', className: 'text-gray-600' },
}

export default function StatusCard({
  title,
  value,
  unit,
  icon,
  trend = 'stable',
  color = 'blue',
}: StatusCardProps) {
  const trendInfo = trendIconConfig[trend]

  return (
    <div className={`border rounded-lg ${colorConfig[color]} p-6`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 font-medium">{title}</p>
          <p className={`text-3xl font-bold ${textColorConfig[color]} mt-2`}>
            {value}
            {unit && <span className="text-lg ml-1">{unit}</span>}
          </p>
        </div>
        {icon && <span className="text-3xl">{icon}</span>}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 mt-3 ${trendInfo.className}`}>
          <span>{trendInfo.icon}</span>
        </div>
      )}
    </div>
  )
}
