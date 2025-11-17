import { useConnectionStore } from '../../stores/connection.store'

export default function ConnectionStatus() {
  const { status } = useConnectionStore()

  const statusConfig = {
    connected: {
      bg: 'bg-green-500',
      label: '실시간 연결됨',
      icon: '🟢',
    },
    connecting: {
      bg: 'bg-yellow-500',
      label: '연결 중...',
      icon: '🟡',
    },
    disconnected: {
      bg: 'bg-red-500',
      label: '연결 끊김',
      icon: '🔴',
    },
  }

  const config = statusConfig[status]

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm text-white ${config.bg} transition-colors`}
      title={config.label}
    >
      <span className="w-2 h-2 rounded-full bg-white" />
      <span className="hidden sm:inline text-xs font-medium">{config.label}</span>
      <span className="sm:hidden">{config.icon}</span>
    </div>
  )
}
