/**
 * Tests para useVoiceAgent hook
 * Fase 4: Hook y Context
 */

import { renderHook, act } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { useVoiceAgent } from '../useVoiceAgent';
import { VoiceProvider } from '@/components/voice/VoiceProvider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock de dependencias
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
    firebaseUser: {
      getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
    },
  }),
}));

jest.mock('@/hooks/useOrganization', () => ({
  useOrganization: () => ({
    currentOrgId: 'org-123',
  }),
}));

jest.mock('@/infrastructure/voice-agent/RealtimeClient');
jest.mock('@/infrastructure/voice-agent/VoiceToolRegistry');
jest.mock('@/infrastructure/voice-agent/tools', () => ({
  registerAllTools: jest.fn(),
}));
jest.mock('@/infrastructure/di/DIContainer', () => ({
  DIContainer: {
    getInstance: jest.fn(() => ({
      setOrgId: jest.fn(),
    })),
  },
}));

// Mock de fetch global
global.fetch = jest.fn();

describe('useVoiceAgent', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(VoiceProvider, null, children)
    );
  };

  describe('Estado inicial', () => {
    it('debe iniciar en estado idle', () => {
      const { result } = renderHook(() => useVoiceAgent(), { wrapper });

      expect(result.current.state).toBe('idle');
      expect(result.current.isActive).toBe(false);
      expect(result.current.isRecording).toBe(false);
      expect(result.current.isProcessing).toBe(false);
      expect(result.current.isExecuting).toBe(false);
      expect(result.current.hasError).toBe(false);
    });

    it('debe indicar que está disponible cuando hay usuario y org', () => {
      const { result } = renderHook(() => useVoiceAgent(), { wrapper });

      expect(result.current.isAvailable).toBe(true);
    });

    it('debe tener comandos restantes inicializados en 10', () => {
      const { result } = renderHook(() => useVoiceAgent(), { wrapper });

      expect(result.current.commandsRemainingToday).toBe(10);
    });

    it('debe tener tiempo de grabación inicializado en 15 segundos', () => {
      const { result } = renderHook(() => useVoiceAgent(), { wrapper });

      expect(result.current.recordingTimeLeft).toBe(15);
    });

    it('debe tener transcript y response vacíos', () => {
      const { result } = renderHook(() => useVoiceAgent(), { wrapper });

      expect(result.current.transcript).toBe('');
      expect(result.current.response).toBe('');
    });

    it('debe tener error en null', () => {
      const { result } = renderHook(() => useVoiceAgent(), { wrapper });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Flags derivados', () => {
    it('isActive debe ser true cuando el estado no es idle', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ephemeralToken: 'test-token',
          commandsRemaining: 9,
        }),
      });

      const { result } = renderHook(() => useVoiceAgent(), { wrapper });

      await act(async () => {
        await result.current.startCommand();
      });

      // Después de startCommand, debería estar en estado 'connecting' o posterior
      expect(result.current.isActive).toBe(true);
    });

    it('isRecording debe ser true solo en estado recording', () => {
      const { result } = renderHook(() => useVoiceAgent(), { wrapper });

      expect(result.current.isRecording).toBe(false);
      
      // En estado idle, isRecording es false
      expect(result.current.state).toBe('idle');
      expect(result.current.isRecording).toBe(false);
    });
  });

  describe('Métodos del hook', () => {
    it('debe exponer startCommand como función', () => {
      const { result } = renderHook(() => useVoiceAgent(), { wrapper });

      expect(typeof result.current.startCommand).toBe('function');
    });

    it('debe exponer cancelCommand como función', () => {
      const { result } = renderHook(() => useVoiceAgent(), { wrapper });

      expect(typeof result.current.cancelCommand).toBe('function');
    });

    it('cancelCommand debe resetear el estado a idle', () => {
      const { result } = renderHook(() => useVoiceAgent(), { wrapper });

      act(() => {
        result.current.cancelCommand();
      });

      expect(result.current.state).toBe('idle');
      expect(result.current.isActive).toBe(false);
    });
  });

  describe('Integración con VoiceProvider', () => {
    it('debe lanzar error si se usa fuera del VoiceProvider', () => {
      // Suprimir console.error para este test
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useVoiceAgent());
      }).toThrow('useVoiceContext debe usarse dentro de VoiceProvider');

      consoleError.mockRestore();
    });

    it('debe funcionar correctamente dentro del VoiceProvider', () => {
      const { result } = renderHook(() => useVoiceAgent(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.state).toBe('idle');
    });
  });

  describe('Tipos de retorno', () => {
    it('debe retornar todas las propiedades esperadas', () => {
      const { result } = renderHook(() => useVoiceAgent(), { wrapper });

      // Propiedades base del context
      expect(result.current).toHaveProperty('state');
      expect(result.current).toHaveProperty('isAvailable');
      expect(result.current).toHaveProperty('startCommand');
      expect(result.current).toHaveProperty('cancelCommand');
      expect(result.current).toHaveProperty('transcript');
      expect(result.current).toHaveProperty('response');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('commandsRemainingToday');
      expect(result.current).toHaveProperty('recordingTimeLeft');

      // Flags derivados
      expect(result.current).toHaveProperty('isActive');
      expect(result.current).toHaveProperty('isRecording');
      expect(result.current).toHaveProperty('isProcessing');
      expect(result.current).toHaveProperty('isExecuting');
      expect(result.current).toHaveProperty('hasError');
    });
  });
});
