import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  fullPage = false,
}) => {
  const spinner = (
    <div
      className={`animate-spin rounded-full border-b-2 border-primary ${sizeMap[size]}`}
      role="status"
      aria-label="Carregando..."
    />
  );

  if (fullPage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-64">
      {spinner}
    </div>
  );
};
