/**
 * Budget Onboarding Tours
 * 
 * Defines interactive tours using react-joyride for guiding users through
 * the budget management system.
 */

import type { Step } from 'react-joyride';

/**
 * Main Budget Tour - Comprehensive walkthrough of budget creation and management
 * 10 steps covering: periods, categories, allocation, and summary
 */
export const MAIN_BUDGET_TOUR: Step[] = [
  {
    target: 'body',
    content: '¡Bienvenido al Sistema de Presupuestos! 👋 Te guiaré paso a paso para crear tu primer presupuesto y gestionar tus finanzas de manera efectiva. Este tour te tomará aproximadamente 2 minutos.',
    placement: 'center',
  },
  {
    target: '[data-tour="periods-tab"]',
    content: 'Aquí gestionas tus períodos de presupuesto. Un período es un rango de fechas (generalmente un mes) con un monto total asignado. Puedes tener múltiples períodos para diferentes meses o proyectos.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="new-period-btn"]',
    content: 'Haz clic aquí para crear tu primer período de presupuesto. Necesitarás definir: 1) Monto total disponible, 2) Fechas de inicio y fin del período.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="allocation-tab"]',
    content: 'Una vez que tengas un período creado, aquí distribuirás el presupuesto entre tus categorías de gastos (Alimentación, Transporte, Entretenimiento, etc.).',
    placement: 'bottom',
  },
  {
    target: '[data-tour="template-btn"]',
    content: 'Usa plantillas predefinidas para empezar rápidamente. Tenemos plantillas basadas en la regla 50/30/20, presupuestos familiares, freelancers y más.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="new-category-btn"]',
    content: 'Si no tienes categorías aún, créalas aquí. Sugerimos categorías como: Vivienda, Alimentación, Transporte, Salud, Entretenimiento, Ahorros.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="allocation-table"]',
    content: 'En esta tabla asignas el porcentaje del presupuesto a cada categoría. La suma de todos los porcentajes debe ser máximo 100%. El sistema calcula automáticamente el monto en pesos basado en el porcentaje.',
    placement: 'top',
  },
  {
    target: '[data-tour="distribute-btn"]',
    content: 'Usa este botón para distribuir el presupuesto equitativamente entre todas las categorías. Es un buen punto de partida que luego puedes ajustar manualmente.',
    placement: 'left',
  },
  {
    target: '[data-tour="summary-tab"]',
    content: 'En la pestaña Resumen verás gráficos de cómo estás gastando vs tu presupuesto planeado. Muy útil para monitorear tus finanzas.',
    placement: 'bottom',
  },
  {
    target: 'body',
    content: '¡Listo! 🎉 Ya conoces los conceptos básicos. Ahora puedes crear tu primer presupuesto. Recuerda: puedes volver a ver este tour desde el menú de ayuda.',
    placement: 'center',
  },
];

/**
 * Category Creation Tour - Quick guide for creating new categories
 */
export const CATEGORY_CREATION_TOUR: Step[] = [
  {
    target: '[data-tour="new-category-btn"]',
    content: 'Crea una nueva categoría de gasto. Por ejemplo: Alimentación, Transporte, Entretenimiento.',
    placement: 'bottom',
  },
  {
    target: 'body',
    content: 'Tip: Piensa en las categorías como "etiquetas" para organizar tus gastos. No necesitas muchas, entre 5-10 categorías suele ser suficiente.',
    placement: 'center',
  },
];

/**
 * Budget Allocation Tips - AdviceAdvice for allocation strategy
 */
export const BUDGET_ALLOCATION_TIPS: Step[] = [
  {
    target: 'body',
    content: '💡 Regla 50/30/20: Una estrategia popular es asignar 50% a necesidades (vivienda, comida), 30% a deseos (entretenimiento), y 20% a ahorros e inversiones.',
    placement: 'center',
  },
];

/**
 * Configuration for react-joyride component
 */
export const TOUR_CONFIG = {
  locale: {
    back: 'Atrás',
    close: 'Cerrar',
    last: 'Finalizar',
    next: 'Siguiente',
    open: 'Abrir',
    skip: 'Saltar',
  },
  styles: {
    options: {
      primaryColor: '#3b82f6',
    },
  },
};

/**
 * Tour types for identification
 */
export type TourType = 'main' | 'category-creation' | 'allocation-tips';

/**
 * Tour configuration map
 */
export const TOURS = {
  main: {
    steps: MAIN_BUDGET_TOUR,
    name: 'Tour Principal',
  },
  'category-creation': {
    steps: CATEGORY_CREATION_TOUR,
    name: 'Crear Categorías',
  },
  'allocation-tips': {
    steps: BUDGET_ALLOCATION_TIPS,
    name: 'Consejos de Asignación',
  },
} as const;
