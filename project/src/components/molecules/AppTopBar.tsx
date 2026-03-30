import { ArrowLeft, LogOut, Menu, User } from 'lucide-react'
import { usePageTitle } from '../../contexts'
import { useAuth } from '../../contexts/AuthContext'

interface AppTopBarProps {
  showMenuButton?: boolean
  onMenuToggle?: () => void
}

export function AppTopBar({ showMenuButton, onMenuToggle }: AppTopBarProps) {
  const { title, onBack } = usePageTitle()
  const { user, logout } = useAuth()

  const displayName = user?.profile?.apelido || user?.nome || user?.email || ''

  return (
    <header className="flex items-center h-14 px-4 bg-primary text-white shadow-sm gap-1">
      {/* Esquerda: menu sempre fixo primeiro, back button depois */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {showMenuButton && (
          <button
            onClick={onMenuToggle}
            className="p-1 rounded hover:bg-white/20 transition-colors"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        {onBack && (
          <button
            onClick={onBack}
            className="p-1 rounded hover:bg-white/20 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Centro: título */}
      <span className="flex-1 text-center font-semibold text-base truncate px-2">
        {title}
      </span>

      {/* Direita: usuário + logout */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {displayName && (
          <div className="hidden sm:flex items-center gap-1 text-sm text-white/90">
            <User className="h-4 w-4" />
            <span className="max-w-[120px] truncate">{displayName}</span>
          </div>
        )}
        <button
          onClick={logout}
          className="p-1 rounded hover:bg-white/20 transition-colors"
          aria-label="Sair"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
