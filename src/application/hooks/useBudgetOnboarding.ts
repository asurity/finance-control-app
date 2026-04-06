/**
 * Hook para manejar el onboarding de presupuestos
 * TODO: Implementar completamente
 */

import type { Step } from 'react-joyride';

interface BudgetTour {
  steps: Step[];
  name: string;
}

export function useBudgetOnboarding() {
  return {
    currentTour: null as BudgetTour | null,
    isRunning: false,
    stepIndex: 0,
    startMainTour: () => {
      console.warn('useBudgetOnboarding not fully implemented');
    },
    handleJoyrideCallback: (_data: unknown) => {
      // No-op
    },
  };
}
