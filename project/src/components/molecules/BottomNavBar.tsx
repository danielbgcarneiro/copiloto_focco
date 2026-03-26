import { NavItem } from '../../config/navConfig'

interface BottomNavBarProps {
  items: NavItem[]
  activePath: string
  onNavigate: (path: string) => void
}

export function BottomNavBar({ items, activePath, onNavigate }: BottomNavBarProps) {
  function isActive(item: NavItem) {
    if (item.path === '/') return activePath === '/'
    return activePath === item.path || activePath.startsWith(item.path + '/')
  }

  return (
    <nav className="lg:hidden flex items-center justify-around h-16 px-2 bg-white border-t border-gray-200 shadow-lg">
      {items.map(item => {
        const active = isActive(item)
        const Icon = item.icon
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.path)}
            className={`flex flex-col items-center gap-0.5 flex-1 py-2 transition-colors ${
              active ? 'text-primary' : 'text-gray-500 hover:text-gray-700'
            }`}
            aria-label={item.label}
          >
            <Icon className={`h-5 w-5 ${active ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className={`text-xs ${active ? 'font-semibold' : 'font-normal'}`}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
