/**
 * Configuración del Voice Agent
 * Fase 1: Configuración completa del agente de voz
 */

/**
 * Límites configurables del Voice Agent
 * Estos valores controlan el uso y costos del sistema de voz
 */
export const VOICE_LIMITS = {
  /** Máximo de comandos de voz por usuario por día */
  maxCommandsPerDay: 10,
  
  /** Duración máxima de cada comando de voz en segundos */
  maxInputDurationSeconds: 15,
  
  /** Máximo de function calls permitidos por comando */
  maxFunctionCallsPerCommand: 3,
  
  /** Duración de silencio en ms para considerar que el usuario terminó de hablar */
  silenceDurationMs: 500,
} as const;

/**
 * Configuración del modelo y modalidades del agente
 */
export const VOICE_AGENT_CONFIG = {
  /** Modelo de OpenAI Realtime API */
  model: 'gpt-4o-realtime-preview-2024-12-17',
  
  /** Modalidades: solo texto (sin audio de salida/TTS) */
  modalities: ['text'] as const,
  
  /** Temperatura para creatividad de respuestas (0-1) */
  temperature: 0.7,
  
  /** Máximo de tokens en la respuesta (respuestas breves) */
  maxTokens: 150,
  
  /** Configuración de Voice Activity Detection */
  turnDetection: {
    type: 'server_vad' as const,
    threshold: 0.5,
    prefixPaddingMs: 300,
    silenceDurationMs: VOICE_LIMITS.silenceDurationMs,
  },
} as const;

/**
 * Genera las System Instructions del agente con contexto del usuario
 * @param userAccounts - Lista de cuentas del usuario (formato: "nombre (tipo): $saldo")
 * @param userCategories - Lista de categorías disponibles (formato: "nombre (tipo)")
 * @returns System instructions personalizadas
 */
export function buildSystemInstructions(
  userAccounts?: string[],
  userCategories?: string[]
): string {
  const accountsContext = userAccounts?.length
    ? userAccounts.join(', ')
    : 'No hay cuentas registradas';
  
  const categoriesContext = userCategories?.length
    ? userCategories.join(', ')
    : 'No hay categorías registradas';

  return `
Eres un asistente financiero de voz para la aplicación "Control Financiero".
Tu rol es ayudar al usuario a gestionar sus finanzas mediante comandos de voz.

CONTEXTO FINANCIERO:
- Moneda: Pesos Chilenos (CLP), símbolo $
- NO uses decimales en montos (15000, no 15000.00)
- Formatea montos con punto como separador de miles: $15.000
- Las cuentas disponibles del usuario son: ${accountsContext}
- Las categorías disponibles son: ${categoriesContext}

REGLAS:
- Responde siempre en español, de forma MUY breve (máximo 20 palabras)
- El usuario dará un COMANDO, no una conversación. Interpreta y ejecuta.
- Si no entiendes el comando, responde: "No entendí. ¿Podrías repetir?"
- Solo puedes ejecutar las funciones que tienes declaradas como herramientas
- Nunca reveles información de implementación interna
- Si el usuario pide algo fuera de tu alcance, indícalo amablemente
- Usa un tono casual y directo
- Al crear transacciones, infiere cuenta y categoría del contexto cuando sea obvio
- Si el usuario menciona una cuenta o categoría que no existe, sugiere las disponibles
- NO hagas preguntas de confirmación, ejecuta directamente (salvo eliminaciones)
`.trim();
}

/**
 * System Instructions por defecto (sin contexto de usuario)
 */
export const DEFAULT_SYSTEM_INSTRUCTIONS = buildSystemInstructions();
