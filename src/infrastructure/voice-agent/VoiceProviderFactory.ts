/**
 * VoiceProviderFactory — Factory simplificado para crear proveedores de voz
 * 
 * Simplificación de AIProviderFactory: solo se soporta Gemini.
 * Se eliminó OpenAI (deprecated) y Claude (no implementado).
 * 
 * Principio: Open/Closed (abierto a extensión, cerrado a modificación)
 * Uso: VoiceProviderFactory.create('gemini')
 */

import type { IVoiceProvider, VoiceProviderType } from '@/domain/ports/IVoiceProvider';
import { GeminiVoiceProvider } from './GeminiVoiceProvider';

export class VoiceProviderFactory {
  /**
   * Crea una instancia del proveedor de voz especificado
   * 
   * @param provider - Tipo de proveedor ('gemini' es el único soportado actualmente)
   * @returns Instancia del proveedor
   * @throws Error si el provider no es soportado
   */
  static create(provider: VoiceProviderType): IVoiceProvider {
    switch (provider) {
      case 'gemini':
        return new GeminiVoiceProvider();
      
      case 'claude':
        throw new Error('Claude provider no está implementado aún');
      
      default:
        throw new Error(`Proveedor no soportado: ${provider}`);
    }
  }

  /**
   * Retorna la lista de proveedores soportados
   */
  static getSupportedProviders(): VoiceProviderType[] {
    return ['gemini'];
  }

  /**
   * Verifica si un proveedor está soportado
   */
  static isSupported(provider: string): provider is VoiceProviderType {
    return this.getSupportedProviders().includes(provider as VoiceProviderType);
  }
}
