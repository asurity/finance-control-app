/**
 * Configuración específica de Gemini para Voice Agent
 * Fase 1: Setup base con SDK de Gemini
 * 
 * Ref: https://ai.google.dev/gemini-api/docs/function-calling?hl=es-419
 */

import { FunctionCallingConfigMode } from '@google/genai';

/**
 * Configuración del modelo Gemini para Voice Agent
 * Optimizada para function calling determinístico y bajo costo
 */
export const GEMINI_VOICE_CONFIG = {
  /** Modelo más económico con function calling */
  model: 'gemini-2.5-flash-lite',
  
  /** Temperatura baja para function calling determinístico */
  temperature: 0.1,
  
  /** Respuestas ultra-cortas para minimizar tokens */
  maxOutputTokens: 100,
  
  /** 
   * Sin tokens de pensamiento = ahorro de costos
   * Ref: https://ai.google.dev/gemini-api/docs/thinking?hl=es-419
   */
  reasoningEffort: 'none' as const,
  
  /** 
   * FUERZA function calling (no chatear sin función)
   * Ref: https://ai.google.dev/gemini-api/docs/function-calling?hl=es-419#function-calling-modes
   */
  functionCallingMode: FunctionCallingConfigMode.ANY,
  
  /** Fallback a AUTO para preguntas aclaratorias */
  fallbackMode: FunctionCallingConfigMode.AUTO,
} as const;

/**
 * System Instructions optimizadas para Gemini
 * Objetivo: ~500 tokens (vs ~2000 de OpenAI)
 * 
 * Gemini es más eficiente con instrucciones concisas y estructuradas.
 */
export function buildGeminiSystemInstructions(): string {
  return `Asistente financiero por voz. Español. Brevedad extrema.

REGLAS CRÍTICAS:
1. SIEMPRE ejecuta get_organization_context PRIMERO (PASO 0 OBLIGATORIO)
2. Luego list_accounts y list_categories para contexto interno
3. Usa el campo 'id' de las listas, NUNCA el 'name'
   Ejemplo: accountId: "IjUIHQgtnvC8EmUmMwbT" ✅
            accountId: "Visa" ❌
4. Si falta cuenta, pregunta: "¿En qué cuenta?"
5. Si falta categoría, infiere la más lógica según descripción
6. Descripciones: 3-8 palabras narrativas
   Ejemplo: "Café en Starbucks por la mañana" ✅
            "Café" ❌
7. Confirmaciones: MAX 3 palabras
   Ejemplos: "Registrado", "Listo", "Hecho"
   Evita: "Perfecto, he registrado tu gasto de..."
8. Montos: sin decimales
   Ejemplo: 15000 ✅
            15000.00 ❌

FLUJO:
- Info completa → Ejecutar inmediatamente
- Info incompleta → Preguntar brevemente (2-4 palabras)
- Éxito → Confirmar con máximo 3 palabras`;
}

/**
 * Re-export del SDK para mayor claridad
 */
export { FunctionCallingConfigMode } from '@google/genai';
export type GeminiFunctionCallingMode = typeof FunctionCallingConfigMode[keyof typeof FunctionCallingConfigMode];

/**
 * Crea la configuración de herramientas para Gemini
 * @param mode Modo de function calling
 * @param allowedFunctions Lista opcional de funciones permitidas (solo con mode ANY)
 */
export function createGeminiToolConfig(
  mode: GeminiFunctionCallingMode = FunctionCallingConfigMode.ANY,
  allowedFunctions?: string[]
) {
  const config: any = {
    functionCallingConfig: { mode },
  };

  if (allowedFunctions && allowedFunctions.length > 0) {
    config.functionCallingConfig.allowedFunctionNames = allowedFunctions;
  }

  return config;
}
