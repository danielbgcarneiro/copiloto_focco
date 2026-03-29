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
    <header className="flex items-center justify-between h-14 px-4 bg-primary text-white shadow-sm">
      {/* Esquerda: back button, hamburger ou espaço */}
      <div className="w-10 flex-shrink-0">
        {onBack ? (
          <button
            onClick={onBack}
            className="p-1 rounded hover:bg-white/20 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : showMenuButton ? (
          <button
            onClick={onMenuToggle}
            className="p-1 rounded hover:bg-white/20 transition-colors"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      {/* Centro: título */}
      <span className="flex-1 text-center font-semibold text-base truncate px-2">
        {title}
      </span>

      {/* Direita: hamburger (em subpages) + usuário + logout */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Hambúrguer no lado direito quando há botão voltar — garante acesso ao menu em qualquer tela */}
        {onBack && showMenuButton && (
          <button
            onClick={onMenuToggle}
            className="p-1 rounded hover:bg-white/20 transition-colors"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
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
