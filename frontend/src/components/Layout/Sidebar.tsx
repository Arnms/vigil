import { Link, useLocation } from 'react-router-dom'

interface NavItem {
  label: string
  icon: string
  path: string
}

const navItems: NavItem[] = [
  { label: '대시보드', icon: '🏠', path: '/' },
  { label: '엔드포인트', icon: '📡', path: '/endpoints' },
  { label: '인시던트', icon: '🚨', path: '/incidents' },
  { label: '통계', icon: '📊', path: '/statistics' },
]

export default function Sidebar() {
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <aside className="bg-gray-900 text-white w-64 h-full">
      <nav className="mt-8">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center space-x-3 px-6 py-3 text-sm font-medium transition-colors ${
              isActive(item.path)
                ? 'bg-blue-600 text-white border-l-4 border-blue-400'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}
