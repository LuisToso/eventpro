import { useAuth } from '../contexts/AuthContext'
import BottomNav from './BottomNav'

export default function Layout({ title, children, action }) {
  const { currentUser, logout } = useAuth()

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white safe-top sticky top-0 z-40 shadow-md">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">EventPro</span>
            {title && (
              <>
                <span className="text-blue-300 text-lg">/</span>
                <span className="text-sm font-medium text-blue-100 truncate max-w-[140px]">{title}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {action}
            <div className="flex items-center gap-1">
              <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold border border-blue-400">
                {currentUser?.displayName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <button onClick={logout} className="p-1.5 rounded-lg hover:bg-blue-700 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full pb-24 page-enter">{children}</main>
      <BottomNav />
    </div>
  )
}
