/**
 * Tests para AIProviderFactory
 * FASE 7: Tests del sistema de voz conversacional
 */

import { AIProviderFactory } from '../AIProviderFactory';
import { OpenAIRealtimeProvider } from '../OpenAIRealtimeProvider';

describe('AIProviderFactory', () => {
  describe('create', () => {
    it('debe crear instancia de OpenAIRealtimeProvider para "openai"', () => {
      const provider = AIProviderFactory.create('openai');
      expect(provider).toBeInstanceOf(OpenAIRealtimeProvider);
    });

    it('debe lanzar error descriptivo para "gemini"', () => {
      expect(() => AIProviderFactory.create('gemini')).toThrow(
        'Gemini provider no está implementado aún'
      );
    });

    it('debe lanzar error descriptivo para "claude"', () => {
      expect(() => AIProviderFactory.create('claude')).toThrow(
        'Claude provider no está implementado aún'
      );
    });

    it('debe crear instancias independientes en cada llamada', () => {
      const provider1 = AIProviderFactory.create('openai');
      const provider2 = AIProviderFactory.create('openai');
      expect(provider1).not.toBe(provider2);
    });
  });

  describe('getSupportedProviders', () => {
    it('debe incluir "openai" en la lista', () => {
      const supported = AIProviderFactory.getSupportedProviders();
      expect(supported).toContain('openai');
    });

    it('debe retornar un array no vacío', () => {
      const supported = AIProviderFactory.getSupportedProviders();
      expect(supported.length).toBeGreaterThan(0);
    });
  });
});
