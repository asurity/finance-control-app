/**
 * Tipos e interfaces del módulo de Voice Agent
 * Fase 2: Tipos completos para herramientas y OpenAI Function Calling
 */

import { DIContainer } from '@/infrastructure/di/DIContainer';

/**
 * Schema de declaración de herramienta para OpenAI Function Calling
 * Basado en la especificación de OpenAI function tools
 */
export interface OpenAIToolDeclaration {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, OpenAIParameterSchema>;
    required?: string[];
  };
}

/**
 * Schema de parámetro individual
 */
export interface OpenAIParameterSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  items?: OpenAIParameterSchema;
  properties?: Record<string, OpenAIParameterSchema>;
}

/**
 * Contexto que se pasa a cada tool al ejecutarse
 */
export interface VoiceToolContext {
  /** ID de la organización del usuario */
  orgId: string;
  /** ID del usuario que ejecuta el comando */
  userId: string;
  /** DIContainer para acceder a Use Cases */
  container: DIContainer;
}

/**
 * Resultado de la ejecución de un tool
 */
export interface VoiceToolResult {
  /** Indica si la ejecución fue exitosa */
  success: boolean;
  /** Datos resultantes (opcional) */
  data?: unknown;
  /** Mensaje descriptivo para que OpenAI genere respuesta al usuario */
  message: string;
}

/**
 * Metadata de un tool para comportamientos automáticos
 */
export interface VoiceToolMetadata {
  /** Tipo de tool: acción (modifica datos) o query (obtiene datos) */
  type: 'action' | 'query';
  /** Query keys a invalidar después de ejecución exitosa */
  invalidates?: string[];
  /** Función opcional para generar mensaje de confirmación automático */
  confirmationMessage?: (args: Record<string, unknown>) => string;
}

/**
 * Definición completa de una herramienta de voz
 */
export interface VoiceTool {
  /** Declaración del tool para OpenAI (schema de function calling) */
  declaration: OpenAIToolDeclaration;
  /** Metadata opcional para comportamientos automáticos */
  metadata?: VoiceToolMetadata;
  /** Función que ejecuta la lógica del tool */
  execute: (args: Record<string, unknown>, context: VoiceToolContext) => Promise<VoiceToolResult>;
}

/**
 * Estados del agente de voz (modelo de comandos)
 * - idle: Esperando que el usuario presione el botón
 * - recording: Grabando comando de voz (max 15s)
 * - processing: OpenAI transcribiendo y analizando intención
 * - executing: Ejecutando function calls y use cases
 * - error: Error en cualquier parte del flujo
 */
export type VoiceAgentState = 
  | 'idle' 
  | 'recording' 
  | 'processing' 
  | 'executing' 
  | 'error';
