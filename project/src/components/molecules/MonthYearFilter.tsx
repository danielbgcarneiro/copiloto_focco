import React, { useMemo } from 'react';

export interface MonthYearFilterProps {
  mes: number;
  ano: number;
  onMesChange: (mes: number) => void;
  onAnoChange: (ano: number) => void;
  label?: string;
  yearsBack?: number;
  layout?: 'inline' | 'card';
}

const selectClass =
  'px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg ' +
  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent';

export const MonthYearFilter: React.FC<MonthYearFilterProps> = ({
  mes,
  ano,
  onMesChange,
  onAnoChange,
  label,
  yearsBack = 5,
  layout = 'inline',
}) => {
  const meses = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({
      valor: i + 1,
      nome: new Date(0, i).toLocaleString('pt-BR', { month: 'long' }),
    })),
    [],
  );

  const anos = useMemo(
    () => Array.from({ length: yearsBack }, (_, i) => new Date().getFullYear() - i),
    [yearsBack],
  );

  const selects = (
    <div className="flex items-center space-x-2 sm:space-x-4">
      <select
        value={mes}
        onChange={(e) => onMesChange(Number(e.target.value))}
        className={selectClass}
        aria-label="Mês"
      >
        {meses.map((m) => (
          <option key={m.valor} value={m.valor}>{m.nome}</option>
        ))}
      </select>
      <select
        value={ano}
        onChange={(e) => onAnoChange(Number(e.target.value))}
        className={selectClass}
        aria-label="Ano"
      >
        {anos.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
    </div>
  );

  if (layout === 'card') {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          {label && (
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">{label}</h3>
          )}
          <div className="mt-4 sm:mt-0">{selects}</div>
        </div>
      </div>
    );
  }

  return selects;
};
