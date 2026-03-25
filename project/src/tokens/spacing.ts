/**
 * Design Tokens — Spacing
 * Escala semântica mapeada das classes Tailwind usadas nas páginas.
 */

export const spacing = {
  xs:   '0.25rem',  // 4px
  sm:   '0.5rem',   // 8px
  md:   '1rem',     // 16px — gap padrão, card padding
  lg:   '1.5rem',   // 24px — card padding desktop
  xl:   '2rem',     // 32px — container padding lg
  '2xl':'3rem',     // 48px

  // Aliases semânticos
  cardPaddingSm: '0.75rem',  // p-3
  cardPaddingMd: '1rem',     // p-4
  cardPaddingLg: '1.5rem',   // p-6
  sectionGap:    '1rem',     // gap-4
  sectionGapSm:  '0.75rem',  // gap-3
  pageGutterSm:  '0.75rem',  // px-3
  pageGutterMd:  '1.5rem',   // px-6
  pageGutterLg:  '2rem',     // px-8
  headerHeight:  '3.5rem',   // h-14 (56px)
} as const;

export type SpacingKey = keyof typeof spacing;
