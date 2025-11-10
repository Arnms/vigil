import { Link } from 'react-router-dom'

export default function Header() {
  return (
    <header className="bg-white shadow-md">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl">📊</span>
            <span className="text-xl font-bold text-gray-900">Vigil</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
              도움말
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
              문서
            </a>
            <a href="#" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
              설정
            </a>
          </nav>
        </div>
      </div>
    </header>
  )
}
