/**
 * Design Tokens — Typography
 * Escala tipográfica baseada no uso real das 15 páginas auditadas.
 */

export const typography = {
  size: {
    '2xs': '0.5625rem', // 9px  — labels mínimos mobile (ex: "DSV", "Bairro")
    xs:    '0.75rem',   // 12px — captions, tags, badges
    sm:    '0.875rem',  // 14px — texto de corpo, selects, inputs
    base:  '1rem',      // 16px — texto padrão
    lg:    '1.125rem',  // 18px — título de header, títulos de seção
    xl:    '1.25rem',   // 20px — valores de métricas grandes
    '2xl': '1.5rem',    // 24px — valores de métricas destaque
  },
  weight: {
    normal:   '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
  },
  lineHeight: {
    none:    '1',
    tight:   '1.25',
    normal:  '1.5',
    relaxed: '1.75',
  },
} as const;

export type TypographySize = keyof typeof typography.size;
export type TypographyWeight = keyof typeof typography.weight;
