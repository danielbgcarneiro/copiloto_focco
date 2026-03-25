import React from 'react';
import { SearchX } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: 'sm' | 'md';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  size = 'md',
}) => {
  const isSm = size === 'sm';

  return (
    <div className={`flex flex-col items-center justify-center text-center ${isSm ? 'py-8' : 'py-12'}`}>
      <div className={`text-gray-400 mb-3 ${isSm ? 'h-8 w-8' : 'h-12 w-12'}`}>
        {icon ?? <SearchX className={isSm ? 'h-8 w-8' : 'h-12 w-12'} aria-hidden="true" />}
      </div>
      <p className="text-base font-medium text-gray-600">{title}</p>
      {description && (
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
