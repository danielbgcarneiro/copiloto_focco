import { ReactNode } from 'react'

export interface AppShellLayoutProps {
  topBar: ReactNode
  children: ReactNode
  bottomArea?: ReactNode
}

export function AppShellLayout({ topBar, children, bottomArea }: AppShellLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="sticky top-0 z-50">{topBar}</div>
      <main className={`flex-1 overflow-y-auto${bottomArea ? ' pb-16' : ''}`}>
        {children}
      </main>
      {bottomArea && (
        <div className="sticky bottom-0 z-50">{bottomArea}</div>
      )}
    </div>
  )
}
