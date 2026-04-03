/**
 * Budget Category Templates
 * 
 * Predefined category templates for different budget types.
 * Users can apply these templates to quickly set up their budgets.
 */

export interface CategoryTemplate {
  name: string;
  percentage: number;
  color: string;
  description?: string;
}

export interface BudgetTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  categories: CategoryTemplate[];
  totalPercentage: number;
}

/**
 * Personal Budget Template (50/30/20 Rule)
 * Based on the popular budgeting method
 */
export const PERSONAL_BUDGET_TEMPLATE: BudgetTemplate = {
  id: 'personal-50-30-20',
  name: 'Presupuesto Personal (Regla 50/30/20)',
  description: '50% necesidades, 30% deseos, 20% ahorros - Ideal para individuos',
  icon: '👤',
  categories: [
    // Necesidades (50%)
    {
      name: 'Vivienda',
      percentage: 25,
      color: '#ef4444',
      description: 'Renta, hipoteca, servicios del hogar',
    },
    {
      name: 'Alimentación',
      percentage: 15,
      color: '#10b981',
      description: 'Supermercado y alimentos básicos',
    },
    {
      name: 'Transporte',
      percentage: 10,
      color: '#3b82f6',
      description: 'Gasolina, transporte público, mantenimiento',
    },
    // Deseos (30%)
    {
      name: 'Entretenimiento',
      percentage: 10,
      color: '#8b5cf6',
      description: 'Cine, streaming, hobbies',
    },
    {
      name: 'Restaurantes',
      percentage: 10,
      color: '#f59e0b',
      description: 'Comidas fuera de casa',
    },
    {
      name: 'Compras Personales',
      percentage: 10,
      color: '#ec4899',
      description: 'Ropa, accesorios, tecnología',
    },
    // Ahorros (20%)
    {
      name: 'Ahorros',
      percentage: 15,
      color: '#14b8a6',
      description: 'Fondo de emergencia e inversiones',
    },
    {
      name: 'Deudas',
      percentage: 5,
      color: '#f97316',
      description: 'Pago de tarjetas de crédito y préstamos',
    },
  ],
  totalPercentage: 100,
};

/**
 * Family Budget Template
 * Designed for households with children
 */
export const FAMILY_BUDGET_TEMPLATE: BudgetTemplate = {
  id: 'family',
  name: 'Presupuesto Familiar',
  description: 'Ideal para familias con hijos',
  icon: '👨‍👩‍👧‍👦',
  categories: [
    {
      name: 'Vivienda',
      percentage: 30,
      color: '#ef4444',
      description: 'Hipoteca, servicios, mantenimiento',
    },
    {
      name: 'Alimentación',
      percentage: 20,
      color: '#10b981',
      description: 'Supermercado y alimentos para la familia',
    },
    {
      name: 'Educación',
      percentage: 15,
      color: '#3b82f6',
      description: 'Colegiatura, útiles, actividades',
    },
    {
      name: 'Salud',
      percentage: 10,
      color: '#14b8a6',
      description: 'Seguro médico, medicamentos, consultas',
    },
    {
      name: 'Transporte',
      percentage: 10,
      color: '#8b5cf6',
      description: 'Gasolina, mantenimiento de vehículos',
    },
    {
      name: 'Entretenimiento',
      percentage: 5,
      color: '#f59e0b',
      description: 'Actividades familiares, vacaciones',
    },
    {
      name: 'Ahorros',
      percentage: 10,
      color: '#ec4899',
      description: 'Fondo de emergencia y educación',
    },
  ],
  totalPercentage: 100,
};

/**
 * Freelancer Budget Template
 * For independent contractors and self-employed
 */
export const FREELANCER_BUDGET_TEMPLATE: BudgetTemplate = {
  id: 'freelancer',
  name: 'Presupuesto Freelancer',
  description: 'Para trabajadores independientes',
  icon: '💼',
  categories: [
    {
      name: 'Gastos Operativos',
      percentage: 20,
      color: '#3b82f6',
      description: 'Software, herramientas, servicios',
    },
    {
      name: 'Marketing',
      percentage: 10,
      color: '#f59e0b',
      description: 'Publicidad, networking, sitio web',
    },
    {
      name: 'Impuestos',
      percentage: 25,
      color: '#ef4444',
      description: 'Reserva para impuestos trimestrales',
    },
    {
      name: 'Vivienda',
      percentage: 15,
      color: '#10b981',
      description: 'Renta/hipoteca, home office',
    },
    {
      name: 'Alimentación',
      percentage: 10,
      color: '#14b8a6',
      description: 'Comida y bebidas',
    },
    {
      name: 'Salud',
      percentage: 5,
      color: '#8b5cf6',
      description: 'Seguro médico privado',
    },
    {
      name: 'Ahorros',
      percentage: 10,
      color: '#ec4899',
      description: 'Retiro y fondo de emergencia',
    },
    {
      name: 'Personal',
      percentage: 5,
      color: '#f97316',
      description: 'Entretenimiento y varios',
    },
  ],
  totalPercentage: 100,
};

/**
 * Small Business Budget Template
 */
export const BUSINESS_BUDGET_TEMPLATE: BudgetTemplate = {
  id: 'small-business',
  name: 'Pequeño Negocio',
  description: 'Para negocios con menos de 10 empleados',
  icon: '🏢',
  categories: [
    {
      name: 'Salarios',
      percentage: 40,
      color: '#10b981',
      description: 'Nómina de empleados',
    },
    {
      name: 'Renta',
      percentage: 15,
      color: '#ef4444',
      description: 'Oficina, local comercial',
    },
    {
      name: 'Marketing',
      percentage: 15,
      color: '#f59e0b',
      description: 'Publicidad, promociones, redes sociales',
    },
    {
      name: 'Tecnología',
      percentage: 10,
      color: '#3b82f6',
      description: 'Software, hardware, IT',
    },
    {
      name: 'Inventario',
      percentage: 10,
      color: '#8b5cf6',
      description: 'Compra de productos/materiales',
    },
    {
      name: 'Servicios',
      percentage: 5,
      color: '#14b8a6',
      description: 'Legal, contabilidad, seguros',
    },
    {
      name: 'Varios',
      percentage: 5,
      color: '#ec4899',
      description: 'Gastos misceláneos',
    },
  ],
  totalPercentage: 100,
};

/**
 * Student Budget Template
 */
export const STUDENT_BUDGET_TEMPLATE: BudgetTemplate = {
  id: 'student',
  name: 'Presupuesto Estudiantil',
  description: 'Para estudiantes universitarios',
  icon: '🎓',
  categories: [
    {
      name: 'Alojamiento',
      percentage: 35,
      color: '#ef4444',
      description: 'Dormitorio, apartamento, servicios',
    },
    {
      name: 'Alimentación',
      percentage: 25,
      color: '#10b981',
      description: 'Comida y bebidas',
    },
    {
      name: 'Libros y Materiales',
      percentage: 15,
      color: '#3b82f6',
      description: 'Libros de texto, útiles escolares',
    },
    {
      name: 'Transporte',
      percentage: 10,
      color: '#8b5cf6',
      description: 'Transporte público, bicicleta',
    },
    {
      name: 'Entretenimiento',
      percentage: 10,
      color: '#f59e0b',
      description: 'Ocio, vida social',
    },
    {
      name: 'Ahorros',
      percentage: 5,
      color: '#14b8a6',
      description: 'Fondo de emergencia pequeño',
    },
  ],
  totalPercentage: 100,
};

/**
 * Zero-Based Budget Template
 * Every dollar is assigned a job
 */
export const ZERO_BASED_BUDGET_TEMPLATE: BudgetTemplate = {
  id: 'zero-based',
  name: 'Presupuesto Base Cero',
  description: 'Asigna el 100% a categorías específicas',
  icon: '🎯',
  categories: [
    {
      name: 'Vivienda',
      percentage: 25,
      color: '#ef4444',
    },
    {
      name: 'Alimentación',
      percentage: 15,
      color: '#10b981',
    },
    {
      name: 'Transporte',
      percentage: 10,
      color: '#3b82f6',
    },
    {
      name: 'Servicios',
      percentage: 10,
      color: '#f59e0b',
    },
    {
      name: 'Seguro',
      percentage: 10,
      color: '#8b5cf6',
    },
    {
      name: 'Ahorros',
      percentage: 15,
      color: '#14b8a6',
    },
    {
      name: 'Entretenimiento',
      percentage: 5,
      color: '#ec4899',
    },
    {
      name: 'Personal',
      percentage: 5,
      color: '#f97316',
    },
    {
      name: 'Varios',
      percentage: 5,
      color: '#6b7280',
    },
  ],
  totalPercentage: 100,
};

/**
 * All available templates
 */
export const ALL_BUDGET_TEMPLATES: BudgetTemplate[] = [
  PERSONAL_BUDGET_TEMPLATE,
  FAMILY_BUDGET_TEMPLATE,
  FREELANCER_BUDGET_TEMPLATE,
  BUSINESS_BUDGET_TEMPLATE,
  STUDENT_BUDGET_TEMPLATE,
  ZERO_BASED_BUDGET_TEMPLATE,
];

/**
 * Get a template by ID
 */
export function getBudgetTemplateById(id: string): BudgetTemplate | undefined {
  return ALL_BUDGET_TEMPLATES.find((template) => template.id === id);
}

/**
 * Get recommended template based on organization type or user preferences
 */
export function getRecommendedTemplate(organizationType?: string): BudgetTemplate {
  switch (organizationType?.toLowerCase()) {
    case 'business':
    case 'empresa':
      return BUSINESS_BUDGET_TEMPLATE;
    case 'freelancer':
    case 'autonomo':
      return FREELANCER_BUDGET_TEMPLATE;
    case 'family':
    case 'familia':
      return FAMILY_BUDGET_TEMPLATE;
    case 'student':
    case 'estudiante':
      return STUDENT_BUDGET_TEMPLATE;
    default:
      return PERSONAL_BUDGET_TEMPLATE;
  }
}
