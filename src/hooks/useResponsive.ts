'use client';

import { useMediaQuery } from './useMediaQuery';

/**
 * useResponsive Hook
 * Expone breakpoints nombrados basados en Tailwind CSS defaults.
 * Reutiliza useMediaQuery internamente (DRY).
 *
 * Breakpoints:
 *  - isMobile:  < 640px  (por debajo de Tailwind `sm`)
 *  - isTablet:  640px – 1023px (entre `sm` y `lg`)
 *  - isDesktop: >= 1024px (Tailwind `lg` en adelante)
 */
export function useResponsive() {
  const isMobile = useMediaQuery('(max-width: 639px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTablet = !isMobile && !isDesktop;

  return { isMobile, isTablet, isDesktop } as const;
}
