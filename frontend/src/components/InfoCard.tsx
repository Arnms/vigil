interface InfoCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: string
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'gray'
  size?: 'sm' | 'md' | 'lg'
}

export default function InfoCard({
  title,
  value,
  subtitle,
  icon,
  color = 'blue',
  size = 'md',
}: InfoCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    gray: 'bg-gray-50 border-gray-200',
  }

  const textColorClasses = {
    blue: 'text-blue-900',
    green: 'text-green-900',
    red: 'text-red-900',
    yellow: 'text-yellow-900',
    gray: 'text-gray-900',
  }

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }

  return (
    <div
      className={`border rounded-lg ${colorClasses[color]} ${sizeClasses[size]} flex items-start gap-4`}
    >
      {icon && <span className="text-2xl">{icon}</span>}
      <div className="flex-1">
        <p className="text-sm text-gray-600 font-medium">{title}</p>
        <p className={`text-2xl font-bold ${textColorClasses[color]} mt-1`}>
          {value}
        </p>
        {subtitle && <p className="text-xs text-gray-500 mt-2">{subtitle}</p>}
      </div>
    </div>
  )
}
