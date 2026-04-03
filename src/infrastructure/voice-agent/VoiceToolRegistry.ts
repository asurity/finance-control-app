/**
 * Registry de herramientas del Voice Agent
 * Fase 0: Setup inicial - Stub
 */

import { VoiceTool } from './types';

/**
 * Registry centralizado de tools disponibles para el agente de voz
 * Patrón Singleton thread-safe
 * TODO: Implementar en Fase 2
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

  register(name: string, tool: VoiceTool): void {
    this.tools.set(name, tool);
  }

  getByName(name: string): VoiceTool | undefined {
    return this.tools.get(name);
  }

  getAll(): VoiceTool[] {
    return Array.from(this.tools.values());
  }

  getDeclarations(): unknown[] {
    return this.getAll().map(tool => tool.declaration);
  }

  clear(): void {
    this.tools.clear();
  }
}
