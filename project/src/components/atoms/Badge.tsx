import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'primary' | 'loading';

export interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantMap: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-700 border border-green-300',
  warning: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
  danger:  'bg-red-100 text-red-700 border border-red-300',
  neutral: 'bg-gray-100 text-gray-600 border border-gray-300',
  primary: 'bg-blue-100 text-blue-700 border border-blue-300',
  loading: 'bg-gray-100 text-gray-400 border border-gray-300 animate-pulse',
};

export const Badge: React.FC<BadgeProps> = ({ variant, children, className = '' }) => (
  <span
    className={`text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-1 rounded-md whitespace-nowrap ${variantMap[variant]} ${className}`.trim()}
  >
    {children}
  </span>
);
