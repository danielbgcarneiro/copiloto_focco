import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'interactive' | 'flat';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

const variantMap = {
  default:     'bg-white rounded-lg shadow-md border border-gray-200',
  interactive: 'bg-white rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer overflow-hidden',
  flat:        'bg-white rounded-lg border border-gray-200',
};

const paddingMap = {
  none: '',
  sm:   'p-3 sm:p-4',
  md:   'p-4 sm:p-6',
  lg:   'p-6 sm:p-8',
};

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'none',
  className = '',
  onClick,
}) => {
  const base = variantMap[variant];
  const pad  = paddingMap[padding];

  return (
    <div
      className={`${base} ${pad} ${className}`.trim()}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {children}
    </div>
  );
};
