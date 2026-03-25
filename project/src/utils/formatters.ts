/**
 * Formatters — Utilitários de formatação centralizados
 * Substitui as funções duplicadas em 8+ páginas do projeto.
 *
 * ⚠️ Nota de performance: Para uso em loops de renderização com listas grandes
 * (ex: Clientes.tsx com Intl.NumberFormat pré-instanciado), mantenha o cache
 * local no componente. Este formatter é para uso geral / chamadas eventuais.
 */

export const formatCurrency = (valor: number, semDecimais = false): string =>
  valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: semDecimais ? 0 : 2,
    maximumFractionDigits: semDecimais ? 0 : 2,
  });

export const formatDate = (date: string | Date): string =>
  new Date(date).toLocaleDateString('pt-BR');

export const formatDateShort = (date: string | Date): string => {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
};

export const formatPercent = (valor: number, casas = 1): string =>
  `${valor.toFixed(casas)}%`;

export const formatNumber = (valor: number): string =>
  valor.toLocaleString('pt-BR');
