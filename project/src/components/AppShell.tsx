import { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageTitleProvider } from '../contexts'
import { AppTopBar } from './molecules/AppTopBar'
import { BottomNavBar } from './molecules/BottomNavBar'
import { SidebarNav } from './molecules/SidebarNav'
import { useNavItems } from '../config/navConfig'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const navItems = useNavItems()

  return (
    <PageTitleProvider>
      <div className="flex min-h-screen bg-gray-50">
        {/* Sidebar — desktop only (lg+) */}
        <SidebarNav
          items={navItems}
          activePath={location.pathname}
          onNavigate={navigate}
        />

        {/* Conteúdo principal */}
        <div className="flex-1 flex flex-col min-w-0">
          <AppTopBar />

          <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
            {children}
          </main>

          {/* Bottom nav — mobile only (< lg) */}
          <BottomNavBar
            items={navItems}
            activePath={location.pathname}
            onNavigate={navigate}
          />
        </div>
      </div>
    </PageTitleProvider>
  )
}
