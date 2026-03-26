import { ReactNode, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageTitleProvider } from '../contexts'
import { AppTopBar } from './molecules/AppTopBar'
import { useNavItems } from '../config/navConfig'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const navItems = useNavItems()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <PageTitleProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <AppTopBar
          showMenuButton={navItems.length > 0}
          onMenuToggle={() => setMenuOpen(v => !v)}
        />

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Drawer — overlay universal, só quando há navItems */}
        {menuOpen && navItems.length > 0 && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <nav className="fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 flex flex-col">
              <div className="h-14 px-4 bg-primary text-white flex items-center">
                <span className="font-semibold text-base">Menu</span>
              </div>
              <div className="flex-1 py-2 overflow-y-auto">
                {navItems.map(item => {
                  const Icon = item.icon
                  const active = location.pathname === item.path ||
                    location.pathname.startsWith(item.path + '/')
                  return (
                    <button
                      key={item.id}
                      onClick={() => { navigate(item.path); setMenuOpen(false) }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        active
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      aria-label={item.label}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                      <span className="text-sm">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </nav>
          </>
        )}
      </div>
    </PageTitleProvider>
  )
}
