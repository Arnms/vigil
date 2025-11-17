import { useToastStore } from '../../stores/toast.store'

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  const typeConfig = {
    success: {
      bg: 'bg-green-500',
      icon: '✅',
    },
    error: {
      bg: 'bg-red-500',
      icon: '❌',
    },
    warning: {
      bg: 'bg-yellow-500',
      icon: '⚠️',
    },
    info: {
      bg: 'bg-blue-500',
      icon: 'ℹ️',
    },
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const config = typeConfig[toast.type]
        return (
          <div
            key={toast.id}
            className={`${config.bg} text-white px-4 py-3 rounded-lg shadow-lg pointer-events-auto animate-in slide-in-from-top-2 duration-300`}
            role="alert"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{config.icon}</span>
                <span className="text-sm font-medium">{toast.message}</span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-2 text-lg hover:opacity-75 transition-opacity"
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
