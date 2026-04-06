/**
 * Registry de herramientas del Voice Agent
 * Fase 2: Implementación completa del patrón Registry
 */

import { VoiceTool, OpenAIToolDeclaration } from './types';

/**
 * Registry centralizado de tools disponibles para el agente de voz
 * Patrón Singleton thread-safe
 */
export class VoiceToolRegistry {
  private static instance: VoiceToolRegistry;
  private tools: Map<string, VoiceTool> = new Map();

  private constructor() {
    // Singleton
  }

  static getInstance(): VoiceToolRegistry {
    if (!VoiceToolRegistry.instance) {
      VoiceToolRegistry.instance = new VoiceToolRegistry();
    }
    return VoiceToolRegistry.instance;
  }

  /**
   * Registra un nuevo tool en el registry
   * @param name - Nombre único del tool
   * @param tool - Definición del tool
   */
  register(name: string, tool: VoiceTool): void {
    this.tools.set(name, tool);
  }

  /**
   * Obtiene un tool por su nombre
   * @param name - Nombre del tool
   * @returns Tool o undefined si no existe
   */
  getByName(name: string): VoiceTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Obtiene todos los tools registrados
   * @returns Array de tools
   */
  getAll(): VoiceTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Obtiene solo las declaraciones de los tools (schemas para OpenAI)
   * @returns Array de declaraciones para enviar a OpenAI Realtime API
   */
  getDeclarations(): OpenAIToolDeclaration[] {
    return this.getAll().map(tool => tool.declaration);
  }

  /**
   * Limpia todos los tools registrados (útil para testing)
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * Obtiene el número de tools registrados
   * @returns Cantidad de tools
   */
  count(): number {
    return this.tools.size;
  }
}
