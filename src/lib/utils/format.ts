/**
 * Utilidades de formato para la aplicación
 * Todos los formatos usan locale es-CL y moneda CLP
 */

/**
 * Formatea un número como moneda chilena (CLP)
 * @param amount - Monto a formatear
 * @returns String formateado con símbolo de peso chileno
 * @example formatCurrency(1500000) // "$1.500.000"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formatea una fecha en formato largo en español chileno
 * @param date - Fecha a formatear (Date o string ISO)
 * @returns String formateado en formato largo
 * @example formatDate(new Date()) // "3 de marzo de 2026"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

/**
 * Formatea una fecha en formato corto (DD/MM/YYYY)
 * @param date - Fecha a formatear (Date o string ISO)
 * @returns String formateado en formato corto
 * @example formatDateShort(new Date()) // "03/03/2026"
 */
export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Formatea una fecha y hora en formato completo
 * @param date - Fecha a formatear (Date o string ISO)
 * @returns String formateado con fecha y hora
 * @example formatDateTime(new Date()) // "03/03/2026, 14:30"
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Formatea un número con separadores de miles
 * @param num - Número a formatear
 * @returns String formateado con puntos como separadores
 * @example formatNumber(1500000) // "1.500.000"
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('es-CL').format(num);
}

/**
 * Formatea un número como porcentaje
 * @param num - Número a formatear (0-100)
 * @returns String formateado como porcentaje
 * @example formatPercent(75.5) // "75,5%"
 */
export function formatPercent(num: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(num / 100);
}

/**
 * Formatea un número decimal con precisión específica
 * @param num - Número a formatear
 * @param decimals - Número de decimales (default: 2)
 * @returns String formateado con decimales
 * @example formatDecimal(3.14159, 2) // "3,14"
 */
export function formatDecimal(num: number, decimals: number = 2): string {
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Formatea un rango de fechas
 * @param startDate - Fecha de inicio
 * @param endDate - Fecha de fin
 * @returns String formateado con el rango
 * @example formatDateRange(date1, date2) // "01/03/2026 - 31/03/2026"
 */
export function formatDateRange(startDate: Date | string, endDate: Date | string): string {
  return `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`;
}

/**
 * Formatea una fecha relativa (hace X tiempo)
 * @param date - Fecha a formatear
 * @returns String con tiempo relativo
 * @example formatRelativeDate(yesterday) // "hace 1 día"
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      if (diffMinutes === 0) {
        return 'hace un momento';
      }
      return `hace ${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`;
    }
    return `hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
  } else if (diffDays === 1) {
    return 'ayer';
  } else if (diffDays < 7) {
    return `hace ${diffDays} días`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `hace ${weeks} semana${weeks !== 1 ? 's' : ''}`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `hace ${months} mes${months !== 1 ? 'es' : ''}`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `hace ${years} año${years !== 1 ? 's' : ''}`;
  }
}

/**
 * Trunca un texto largo con elipsis
 * @param text - Texto a truncar
 * @param maxLength - Longitud máxima (default: 50)
 * @returns Texto truncado con "..."
 * @example truncateText("Un texto muy largo...", 10) // "Un texto v..."
 */
export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Capitaliza la primera letra de un string
 * @param text - Texto a capitalizar
 * @returns Texto con primera letra mayúscula
 * @example capitalize("hola mundo") // "Hola mundo"
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Formatea un nombre de archivo para ser seguro
 * @param filename - Nombre del archivo
 * @returns Nombre seguro sin caracteres especiales
 * @example sanitizeFilename("Mi Reporte 2024.pdf") // "mi-reporte-2024.pdf"
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.-]/g, '')
    .replace(/-+/g, '-');
}
