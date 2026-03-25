import React from 'react';
import { Badge, BadgeVariant } from './Badge';

// Status de Inadimplência (domínio: dias em atraso)
export type StatusInadimplencia = 'em-dia' | 'atencao' | 'alerta' | 'critico';

// Status de Perfil RFM
export type StatusPerfil = 'campeon' | 'regular' | 'em-risco' | 'inativo' | 'potencial';

export interface StatusBadgeProps {
  type: 'inadimplencia' | 'perfil';
  status: StatusInadimplencia | StatusPerfil;
  className?: string;
}

const inadimplenciaMap: Record<StatusInadimplencia, { label: string; variant: BadgeVariant }> = {
  'em-dia':  { label: 'Em dia',   variant: 'success' },
  'atencao': { label: 'Atenção',  variant: 'warning' },
  'alerta':  { label: 'Alerta',   variant: 'warning' },
  'critico': { label: 'Crítico',  variant: 'danger' },
};

const perfilMap: Record<StatusPerfil, { label: string; variant: BadgeVariant }> = {
  'campeon':   { label: 'Campeão',   variant: 'primary' },
  'regular':   { label: 'Regular',   variant: 'neutral' },
  'em-risco':  { label: 'Em Risco',  variant: 'warning' },
  'inativo':   { label: 'Inativo',   variant: 'neutral' },
  'potencial': { label: 'Potencial', variant: 'success' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, status, className }) => {
  const map = type === 'inadimplencia'
    ? inadimplenciaMap[status as StatusInadimplencia]
    : perfilMap[status as StatusPerfil];

  if (!map) return null;

  return (
    <Badge variant={map.variant} className={className}>
      {map.label}
    </Badge>
  );
};
