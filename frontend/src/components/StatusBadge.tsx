import type { EndpointStatus } from '../types/endpoint'

interface StatusBadgeProps {
  status: EndpointStatus
  size?: 'sm' | 'md' | 'lg'
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const statusConfig: Record<EndpointStatus, { label: string; emoji: string; bgColor: string; textColor: string }> = {
    UP: {
      label: '정상',
      emoji: '🟢',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
    },
    DOWN: {
      label: '다운',
      emoji: '🔴',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
    },
    DEGRADED: {
      label: '저하',
      emoji: '🟡',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
    },
    UNKNOWN: {
      label: '미확인',
      emoji: '⚫',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
    },
  }

  const config = statusConfig[status]
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${config.bgColor} ${config.textColor} ${sizeClasses[size]}`}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  )
}
