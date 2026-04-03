/**
 * Templates de categorías predefinidos para facilitar la configuración inicial
 * de presupuestos. Los usuarios pueden aplicar estos templates para crear
 * múltiples categorías de una vez.
 * 
 * SEGURIDAD: Los templates solo AGREGAN categorías nuevas, nunca modifican
 * ni eliminan las existentes. Se validan nombres duplicados antes de crear.
 */

export interface CategoryTemplate {
  name: string;
  description: string;
  icon: string;
  categories: Array<{
    name: string;
    type: 'INCOME' | 'EXPENSE';
    percentage: number;
    color: string;
    icon: string;
    description?: string;
  }>;
}

export const CATEGORY_TEMPLATES: Record<string, CategoryTemplate> = {
  personal: {
    name: 'Presupuesto Personal',
    description: 'Categorías esenciales para gestión de finanzas personales y familiares',
    icon: '👤',
    categories: [
      {
        name: 'Alimentación',
        type: 'EXPENSE',
        percentage: 30,
        color: '#10b981',
        icon: '🍽️',
        description: 'Supermercado, restaurantes, comida diaria'
      },
      {
        name: 'Vivienda',
        type: 'EXPENSE',
        percentage: 35,
        color: '#f59e0b',
        icon: '🏠',
        description: 'Renta/hipoteca, servicios, mantenimiento'
      },
      {
        name: 'Transporte',
        type: 'EXPENSE',
        percentage: 15,
        color: '#3b82f6',
        icon: '🚗',
        description: 'Gasolina, transporte público, mantenimiento vehículo'
      },
      {
        name: 'Entretenimiento',
        type: 'EXPENSE',
        percentage: 10,
        color: '#8b5cf6',
        icon: '🎬',
        description: 'Cine, suscripciones, hobbies, diversión'
      },
      {
        name: 'Salud',
        type: 'EXPENSE',
        percentage: 10,
        color: '#ef4444',
        icon: '❤️',
        description: 'Seguro médico, medicinas, consultas'
      }
    ]
  },
  
  business: {
    name: 'Presupuesto Empresarial',
    description: 'Categorías fundamentales para pequeñas y medianas empresas',
    icon: '💼',
    categories: [
      {
        name: 'Salarios y Nómina',
        type: 'EXPENSE',
        percentage: 40,
        color: '#10b981',
        icon: '💰',
        description: 'Sueldos, prestaciones, seguro social'
      },
      {
        name: 'Oficina y Operaciones',
        type: 'EXPENSE',
        percentage: 20,
        color: '#f59e0b',
        icon: '🏢',
        description: 'Renta, servicios, equipo, suministros'
      },
      {
        name: 'Marketing y Publicidad',
        type: 'EXPENSE',
        percentage: 15,
        color: '#3b82f6',
        icon: '📢',
        description: 'Campañas, publicidad digital, eventos'
      },
      {
        name: 'Tecnología y Software',
        type: 'EXPENSE',
        percentage: 15,
        color: '#8b5cf6',
        icon: '💻',
        description: 'Licencias, hosting, herramientas digitales'
      },
      {
        name: 'Legal y Contable',
        type: 'EXPENSE',
        percentage: 10,
        color: '#ef4444',
        icon: '⚖️',
        description: 'Contador, abogado, impuestos, trámites'
      }
    ]
  },
  
  family: {
    name: 'Presupuesto Familiar',
    description: 'Categorías completas para hogares con hijos y mascotas',
    icon: '👨‍👩‍👧‍👦',
    categories: [
      {
        name: 'Hogar y Servicios',
        type: 'EXPENSE',
        percentage: 35,
        color: '#10b981',
        icon: '🏡',
        description: 'Renta/hipoteca, agua, luz, gas, internet'
      },
      {
        name: 'Alimentación Familiar',
        type: 'EXPENSE',
        percentage: 25,
        color: '#f59e0b',
        icon: '🛒',
        description: 'Supermercado, mercado, comidas escolares'
      },
      {
        name: 'Educación de los Hijos',
        type: 'EXPENSE',
        percentage: 20,
        color: '#3b82f6',
        icon: '📚',
        description: 'Colegiaturas, útiles, uniformes, cursos'
      },
      {
        name: 'Transporte Familiar',
        type: 'EXPENSE',
        percentage: 10,
        color: '#8b5cf6',
        icon: '🚙',
        description: 'Auto familiar, gasolina, transporte escolar'
      },
      {
        name: 'Ocio y Vacaciones',
        type: 'EXPENSE',
        percentage: 10,
        color: '#ec4899',
        icon: '✈️',
        description: 'Salidas, paseos, vacaciones familiares'
      }
    ]
  }
};

/**
 * Valida que las categorías de un template sumen exactamente 100%
 */
export function validateTemplatePercentages(templateKey: string): boolean {
  const template = CATEGORY_TEMPLATES[templateKey];
  if (!template) return false;
  
  const total = template.categories.reduce((sum, cat) => sum + cat.percentage, 0);
  return Math.abs(total - 100) < 0.01; // Tolerancia para errores de punto flotante
}

/**
 * Obtiene lista de nombres de categorías de un template (útil para validar duplicados)
 */
export function getTemplateCategoryNames(templateKey: string): string[] {
  const template = CATEGORY_TEMPLATES[templateKey];
  return template?.categories.map(cat => cat.name) || [];
}
