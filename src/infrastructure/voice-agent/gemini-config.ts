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
 * El contexto (cuentas y categorías) se incluye directamente en cada request.
 */
export function buildGeminiSystemInstructions(): string {
  return `Asistente financiero por voz. Español. Brevedad extrema.

CONTEXTO DISPONIBLE:
El campo 'context' en el request incluye:
- accounts: [{ id, name, balance }]
- categories: [{ id, name, type }]
- defaultAccountId: ID de cuenta preferida

REGLAS CRÍTICAS:
1. USA SIEMPRE el campo 'id', NUNCA 'name'
   Ejemplo: accountId: "IjUIHQgtnvC8EmUmMwbT" ✅
            accountId: "Visa" ❌

2. Si usuario NO especifica cuenta:
   - USA defaultAccountId del contexto
   - Si no hay default, usa la cuenta con más saldo

3. Si usuario NO especifica categoría:
   - INFIERE de la descripción
   - Ejemplos:
     * "café" → categoría "Café" o "Alimentación"
     * "uber" → categoría "Transporte"
     * "netflix" → categoría "Entretenimiento"

4. Descripciones: 3-8 palabras narrativas
   Ejemplo: "Café en Starbucks por la mañana" ✅
            "Café" ❌

5. Confirmaciones: MAX 3 palabras
   Ejemplos: "Registrado", "Listo", "Hecho"
   Evita: "Perfecto, he registrado tu gasto de..."

6. Montos: sin decimales
   Ejemplo: 15000 ✅
            15000.00 ❌

FLUJO:
- Info completa → Ejecutar INMEDIATAMENTE (1 solo function call)
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
