'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'

const navItems = [
  { href: '/admin/questions', label: 'Questions', icon: '📝' },
  { href: '/admin/questions/new', label: 'Add New', icon: '➕' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const isLoginPage = pathname === '/admin/login'
  if (isLoginPage) return <>{children}</>

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#09090f' }}>
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 flex flex-col" style={{ background: '#0f1117', borderRight: '1px solid #1f2035' }}>
        <div className="p-4 border-b" style={{ borderColor: '#1f2035' }}>
          <span className="text-indigo-400 font-black text-sm tracking-wide">⚡ ADMIN</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => {
            const active = pathname.startsWith(item.href) && !(item.href === '/admin/questions' && pathname === '/admin/questions/new')
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                style={{
                  background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: active ? '#a5b4fc' : '#52525b',
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t" style={{ borderColor: '#1f2035' }}>
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  )
}
