import React from 'react';
import { ArrowLeft, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface PageHeaderProps {
  title: string;
  icon?: React.ReactNode;
  showBack?: boolean;
  onBack?: () => void;
  userName?: string;
  onLogout?: () => void;
  rightAction?: React.ReactNode;
  variant?: 'default' | 'centered';
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  icon,
  showBack = false,
  onBack,
  userName,
  onLogout,
  rightAction,
  variant = 'centered',
}) => {
  const navigate = useNavigate();
  const handleBack = onBack ?? (() => navigate(-1));
  const hasLeftContent = showBack || !!icon;

  return (
    <header className="bg-primary text-white shadow-lg">
      <div className="w-full sm:max-w-7xl sm:mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between h-14${variant === 'centered' ? ' relative' : ''}`}>

          {/* Left slot — só renderiza quando há conteúdo para evitar title centralizado indesejado */}
          {hasLeftContent && (
            <div className="flex items-center">
              {showBack && (
                <button
                  onClick={handleBack}
                  className="p-1.5 hover:bg-white/10 rounded-full transition-colors mr-2"
                  aria-label="Voltar"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              {!showBack && icon && (
                <span className="mr-2">{icon}</span>
              )}
            </div>
          )}

          {/* Title */}
          {variant === 'centered' ? (
            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center">
              <h1 className="text-base sm:text-lg font-bold">{title}</h1>
            </div>
          ) : (
            <h1 className="text-base sm:text-lg font-bold">{title}</h1>
          )}

          {/* Right slot */}
          <div className="flex items-center space-x-2">
            {rightAction}
            {userName && (
              <div className="flex items-center space-x-1.5">
                <User className="h-4 w-4" aria-hidden="true" />
                <span className="text-xs sm:text-sm hidden sm:inline">{userName}</span>
              </div>
            )}
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
