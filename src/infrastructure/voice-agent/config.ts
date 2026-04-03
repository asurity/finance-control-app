/**
 * Configuración del Voice Agent
 * Fase 0: Setup inicial - Stub
 */

/**
 * Configuración del modelo y voz del agente
 * TODO: Implementar completamente en Fase 1
 */
export const VOICE_AGENT_CONFIG = {
  model: 'gpt-4o-realtime-preview',
  voice: 'alloy',
  temperature: 0.7,
  maxTokens: 300,
} as const;

/**
 * System Instructions del agente
 * TODO: Completar en Fase 1 con contexto dinámico del usuario
 */
export const SYSTEM_INSTRUCTIONS = `
Eres un asistente financiero de voz para la aplicación "Control Financiero".
Tu rol es ayudar al usuario a gestionar sus finanzas mediante comandos de voz.

TODO: Completar instrucciones en Fase 1
`.trim();
