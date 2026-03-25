import React from 'react';
import { Card } from '../atoms/Card';

export interface LoadingCardProps {
  rows?: number;
  showHeader?: boolean;
  className?: string;
}

export const LoadingCard: React.FC<LoadingCardProps> = ({
  rows = 2,
  showHeader = true,
  className = '',
}) => (
  <Card variant="default" padding="md" className={className}>
    <div className="animate-pulse space-y-3">
      {showHeader && (
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      )}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`h-3 bg-gray-200 rounded ${i % 2 === 0 ? 'w-full' : 'w-2/3'}`}
        />
      ))}
    </div>
  </Card>
);
