import { NavItem } from '../../config/navConfig'

interface SidebarNavProps {
  items: NavItem[]
  activePath: string
  onNavigate: (path: string) => void
}

export function SidebarNav({ items, activePath, onNavigate }: SidebarNavProps) {
  function isActive(item: NavItem) {
    if (item.path === '/') return activePath === '/'
    return activePath === item.path || activePath.startsWith(item.path + '/')
  }

  return (
    <aside className="hidden lg:flex lg:flex-col w-56 min-h-full py-4 gap-1 bg-white border-r border-gray-200">
      {items.map(item => {
        const active = isActive(item)
        const Icon = item.icon
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.path)}
            className={`w-full flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-left transition-colors ${
              active
                ? 'bg-primary/10 text-primary font-semibold border-r-2 border-primary'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            style={{ width: 'calc(100% - 1rem)' }}
            aria-label={item.label}
          >
            <Icon className={`h-5 w-5 flex-shrink-0 ${active ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-sm">{item.label}</span>
          </button>
        )
      })}
    </aside>
  )
}
