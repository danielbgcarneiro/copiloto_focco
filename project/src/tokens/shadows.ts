/**
 * Design Tokens — Shadows
 * Níveis de sombra mapeados do uso real nas páginas.
 */

export const shadows = {
  none:        'none',
  card:        '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',    // shadow-md
  elevated:    '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',  // shadow-lg
  interactive: '0 10px 15px -3px rgba(0,0,0,0.15), 0 4px 6px -4px rgba(0,0,0,0.1)', // hover:shadow-lg
} as const;

export type ShadowKey = keyof typeof shadows;
