/**
 * AIProviderFactory — Factory para crear instancias de proveedores de IA
 * 
 * Centraliza la creación de proveedores. Los consumidores (VoiceProvider, hooks)
 * solo dependen de IAIRealtimeProvider, nunca de una implementación concreta.
 * 
 * Para agregar un nuevo proveedor:
 * 1. Crear la clase que implemente IAIRealtimeProvider
 * 2. Agregar el case en create()
 * 3. Agregar a getSupportedProviders()
 */

import type { IAIRealtimeProvider, AIProviderType } from '@/domain/ports/IAIRealtimeProvider';
import { OpenAIRealtimeProvider } from './OpenAIRealtimeProvider';
import { GeminiTextProvider } from './GeminiTextProvider';

export class AIProviderFactory {
  /**
   * Crea una instancia del proveedor de IA especificado
   */
  static create(provider: AIProviderType): IAIRealtimeProvider {
    switch (provider) {
      case 'openai':
        return new OpenAIRealtimeProvider();

      case 'gemini':
        return new GeminiTextProvider();

      case 'claude':
        throw new Error(
          'Claude provider no está implementado aún. ' +
          'Implementar ClaudeRealtimeProvider con HTTP Streaming API. ' +
          'Ver: https://docs.anthropic.com/en/docs/build-with-claude/streaming'
        );

      default: {
        const _exhaustive: never = provider;
        throw new Error(`Proveedor de IA desconocido: ${_exhaustive}`);
      }
    }
  }

  /**
   * Retorna la lista de proveedores actualmente soportados
   */
  static getSupportedProviders(): AIProviderType[] {
    return ['openai', 'gemini'];
  }

  /**
   * Verifica si un proveedor está soportado
   */
  static isSupported(provider: string): provider is AIProviderType {
    return AIProviderFactory.getSupportedProviders().includes(provider as AIProviderType);
  }
}
