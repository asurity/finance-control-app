/**
 * useBudgetTour Hook
 * Manages the interactive onboarding tour for the budgets page
 * Uses localStorage to track if user has completed the tour
 */

import { useState, useEffect } from 'react';
import type { Step } from 'react-joyride';

const TOUR_STORAGE_KEY = 'budget-tour-completed';

/**
 * Tour steps for budget flow
 * Guides users through: Period creation → Category allocation → Summary review
 */
export const BUDGET_TOUR_STEPS: Step[] = [
  {
    target: 'body',
    content: (
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">¡Bienvenido al Sistema de Presupuestos! 🎯</h3>
        <p>
          Te guiaremos paso a paso para crear tu primer presupuesto. 
          Este tour toma solo 2 minutos.
        </p>
      </div>
    ),
    placement: 'center',
  },
  {
    target: '[data-tour="periods-tab"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">1️⃣ Períodos de Presupuesto</h4>
        <p>
          Un <strong>período</strong> es un rango de fechas (ej: Abril 2026) 
          con un monto total a distribuir entre categorías.
        </p>
        <p className="text-sm text-muted-foreground">
          Puedes tener varios períodos activos (mes actual, próximo mes, etc.)
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="new-period-btn"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">Crear tu Primer Período</h4>
        <p>
          Haz clic aquí para crear un período. Solo necesitas:
        </p>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>Monto total mensual (ej: $50,000)</li>
          <li>Fechas de inicio y fin</li>
          <li>Nombre opcional (se auto-genera)</li>
        </ul>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-tour="allocation-tab"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">2️⃣ Asignación por Categoría</h4>
        <p>
          Aquí distribuyes el monto total entre tus <strong>categorías de gasto</strong> 
          usando porcentajes.
        </p>
        <p className="text-sm text-muted-foreground">
          Ejemplo: Alimentación 30%, Transporte 20%, Vivienda 35%
        </p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: '[data-tour="new-category-btn"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">Crear Categorías</h4>
        <p>
          Si no tienes categorías, créalas aquí. Ejemplos comunes:
        </p>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>🍔 Alimentación</li>
          <li>🚗 Transporte</li>
          <li>🏠 Vivienda</li>
          <li>🎬 Entretenimiento</li>
        </ul>
        <p className="text-xs text-muted-foreground mt-2">
          💡 Tip: Puedes usar templates predefinidos para ahorrar tiempo
        </p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-tour="allocation-table"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">Tabla de Asignación</h4>
        <p>
          Ingresa el porcentaje para cada categoría. 
          La barra de progreso muestra tu total.
        </p>
        <div className="bg-muted p-2 rounded text-sm mt-2">
          ✅ <strong>Válido:</strong> Total ≤ 100%<br />
          ❌ <strong>Inválido:</strong> Total &gt; 100%
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          💡 Tip: Usa el botón "Distribuir Equitativamente" para empezar
        </p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '[data-tour="distribute-btn"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">✨ Distribución Automática</h4>
        <p>
          Este botón divide el 100% en partes iguales entre todas tus categorías.
        </p>
        <p className="text-sm text-muted-foreground">
          Después puedes ajustar los porcentajes manualmente según tus prioridades.
        </p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '[data-tour="save-allocations-btn"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">Guardar Asignaciones</h4>
        <p>
          Una vez que el total sea válido (≤ 100%), guarda tus asignaciones.
        </p>
        <p className="text-sm text-muted-foreground">
          Los montos se calculan automáticamente: Monto = (Total × Porcentaje) / 100
        </p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '[data-tour="summary-tab"]',
    content: (
      <div className="space-y-2">
        <h4 className="font-semibold">3️⃣ Resumen</h4>
        <p>
          Aquí verás el estado de tu presupuesto:
        </p>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>Total presupuestado vs gastado</li>
          <li>Categorías excedidas o cerca del límite</li>
          <li>Gráficos visuales de progreso</li>
        </ul>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: 'body',
    content: (
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">¡Listo para Empezar! 🚀</h3>
        <p>
          Ahora sabes cómo usar el sistema de presupuestos. Recuerda:
        </p>
        <ol className="list-decimal list-inside text-sm space-y-1">
          <li>Crea un período con monto total</li>
          <li>Asigna porcentajes a categorías</li>
          <li>Revisa el resumen periódicamente</li>
        </ol>
        <p className="text-xs text-muted-foreground mt-3">
          Puedes volver a ver este tour desde Configuración → Ayuda
        </p>
      </div>
    ),
    placement: 'center',
  },
];

interface UseBudgetTourReturn {
  /** Whether the tour should run */
  runTour: boolean;
  /** Function to start the tour manually */
  startTour: () => void;
  /** Function to mark tour as completed */
  completeTour: () => void;
  /** Function to reset tour (show again) */
  resetTour: () => void;
  /** Tour steps */
  steps: Step[];
}

/**
 * Hook to manage budget onboarding tour state
 * 
 * @example
 * ```tsx
 * const { runTour, completeTour, steps } = useBudgetTour();
 * 
 * return (
 *   <>
 *     <Joyride
 *       steps={steps}
 *       run={runTour}
 *       callback={(data) => {
 *         if (data.status === 'finished' || data.status === 'skipped') {
 *           completeTour();
 *         }
 *       }}
 *     />
 *     {/* Rest of your component *\/}
 *   </>
 * );
 * ```
 */
export function useBudgetTour(): UseBudgetTourReturn {
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    // Check if user has completed tour
    const tourCompleted = localStorage.getItem(TOUR_STORAGE_KEY);
    
    // Run tour only if not completed and after delay (allow page to render)
    if (!tourCompleted) {
      const timer = setTimeout(() => {
        setRunTour(true);
      }, 1500); // 1.5 second delay

      return () => clearTimeout(timer);
    }
  }, []);

  // Auto-complete tour after it ends (manual completion via skip/finish)
  useEffect(() => {
    if (runTour) {
      const completionTimer = setTimeout(() => {
        // If tour is still running after 5 minutes, mark as completed
        localStorage.setItem(TOUR_STORAGE_KEY, 'true');
      }, 300000); // 5 minutes

      return () => clearTimeout(completionTimer);
    }
  }, [runTour]);

  const startTour = () => {
    setRunTour(true);
  };

  const completeTour = () => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    setRunTour(false);
  };

  const resetTour = () => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    setRunTour(true);
  };

  return {
    runTour,
    startTour,
    completeTour,
    resetTour,
    steps: BUDGET_TOUR_STEPS,
  };
}
