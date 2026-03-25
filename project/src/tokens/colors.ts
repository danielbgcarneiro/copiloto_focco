/**
 * Design Tokens — Cores
 * Fonte única de verdade para as cores customizadas do projeto.
 * Valores espelham tailwind.config.cjs para uso em lógica TypeScript.
 */

export const colors = {
  primary: '#127CA6',
  secondary: '#32A69A',
  accent: '#77F2E6',
  neutral: '#648C88',
} as const;

export type ColorKey = keyof typeof colors;
