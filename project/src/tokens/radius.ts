/**
 * Design Tokens — Border Radius
 * Valores mapeados das classes rounded-* usadas nas páginas.
 */

export const radius = {
  sm:   '0.375rem', // 6px  — badges, tags (rounded-md)
  md:   '0.5rem',   // 8px  — cards, inputs, selects, botões (rounded-lg)
  lg:   '0.75rem',  // 12px — cards interativos clicáveis (rounded-xl)
  xl:   '1rem',     // 16px — modais, drawers (rounded-2xl)
  full: '9999px',   // circular — icon buttons, pill badges (rounded-full)
} as const;

export type RadiusKey = keyof typeof radius;
