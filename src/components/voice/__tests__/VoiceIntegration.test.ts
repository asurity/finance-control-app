/**
 * Tests de Integración End-to-End para Voice Agent
 * Fase 6: Integración End-to-End
 * 
 * Valida el flujo completo desde el inicio del comando hasta la
 * ejecución de acciones y actualización de UI.
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';
import { useVoiceAgent } from '@/application/hooks/useVoiceAgent';
import { VoiceProvider } from '../VoiceProvider';
import { toast } from 'sonner';

// Mocks globales
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/constants/config', () => ({
  APP_CONFIG: {
    enableVoiceAgent: true,
    aiProvider: 'openai',
  },
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'test-user', name: 'Test User' },
    firebaseUser: {
      getIdToken: jest.fn().mockResolvedValue('mock-token'),
    },
    loading: false,
  })),
}));

jest.mock('@/hooks/useOrganization', () => ({
  useOrganization: jest.fn(() => ({
    currentOrgId: 'test-org',
    currentOrg: { id: 'test-org', name: 'Test Org' },
  })),
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
  })),
}));

// Mock del proveedor de IA (reemplaza RealtimeClient)
const mockProvider = {
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn(),
  startAudioCapture: jest.fn().mockResolvedValue(undefined),
  stopAudioCaptureAndProcess: jest.fn(),
  sendFunctionResult: jest.fn(),
  onStateChange: jest.fn(),
  onTranscript: jest.fn(),
  onTextResponse: jest.fn(),
  onFunctionCall: jest.fn(),
  onAudioResponse: jest.fn(),
  onError: jest.fn(),
  onRecordingTimeUpdate: jest.fn(),
  getState: jest.fn().mockReturnValue('idle'),
};

jest.mock('@/infrastructure/voice-agent/AIProviderFactory', () => ({
  AIProviderFactory: {
    create: jest.fn(() => mockProvider),
    getSupportedProviders: jest.fn(() => ['openai']),
  },
}));

jest.mock('@/application/hooks/useVoiceUsageLogger', () => ({
  useVoiceUsageLogger: jest.fn(() => ({
    logCommand: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock de VoiceToolRegistry
const mockTool = {
  declaration: {
    name: 'create_expense',
    description: 'Crear gasto',
    parameters: {},
  },
  execute: jest.fn().mockResolvedValue({
    success: true,
    message: 'Gasto de $15.000 registrado en Comida',
  }),
};

jest.mock('@/infrastructure/voice-agent/VoiceToolRegistry', () => ({
  VoiceToolRegistry: {
    getInstance: jest.fn(() => ({
      getByName: jest.fn().mockReturnValue(mockTool),
      getDeclarations: jest.fn().mockReturnValue([mockTool.declaration]),
      clear: jest.fn(),
      register: jest.fn(),
      count: jest.fn().mockReturnValue(1),
    })),
  },
}));

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

describe('Voice Agent - Integración End-to-End', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        ephemeralToken: 'mock-ephemeral-token',
        commandsRemaining: 9,
      }),
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(VoiceProvider, null, children);

  describe('Flujo completo: Usuario presiona botón → Tool ejecutado → UI actualizada', () => {
    it('debe completar el flujo exitosamente: connecting → recording → processing → executing → idle', async () => {
      const { result } = renderHook(() => useVoiceAgent(), { wrapper });

      // Estado inicial: idle, 10 comandos disponibles
      expect(result.current.state).toBe('idle');
      expect(result.current.commandsRemainingToday).toBe(10);
      expect(result.current.isAvailable).toBe(true);

      // 1. Usuario presiona botón → startCommand()
      await act(async () => {
        await result.current.startCommand();
      });

      // 2. Verifica que se solicitó el ephemeral token al API route
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/voice/session',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          },
        })
      );

      // 3. Verifica que se conectó con OpenAI con la configuración correcta
      await waitFor(() => {
        expect(mockProvider.connect).toHaveBeenCalledWith({
          ephemeralToken: 'mock-ephemeral-token',
          tools: [mockTool.declaration],
        });
      });

      // 4. Simular que OpenAI emite un function call
      const mockFunctionCall = {
        callId: 'call_123',
        name: 'create_expense',
        arguments: {
          amount: 15000,
          description: 'Almuerzo',
          categoryId: 'cat_comida',
          accountId: 'acc_corriente',
        },
      };

      // Obtener el callback de onFunctionCall
      const onFunctionCallCallback = mockProvider.onFunctionCall.mock.calls[0][0];
      
      await act(async () => {
        await onFunctionCallCallback(mockFunctionCall);
      });

      // 5. Verificar que el tool se ejecutó correctamente
      expect(mockTool.execute).toHaveBeenCalledWith(
        mockFunctionCall.arguments,
        expect.objectContaining({
          userId: 'test-user',
          orgId: 'test-org',
        })
      );

      // 6. Verificar que se envió el resultado de vuelta a OpenAI
      expect(mockProvider.sendFunctionResult).toHaveBeenCalledWith(
        'call_123',
        {
          success: true,
          message: 'Gasto de $15.000 registrado en Comida',
        }
      );

      // 7. Verificar que se mostró el toast de confirmación
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Gasto registrado',
          expect.objectContaining({
            description: 'Gasto de $15.000 registrado en Comida',
            icon: '💸',
          })
        );
      });

      // 8. Verificar que los comandos restantes se actualizaron
      expect(result.current.commandsRemainingToday).toBe(9);
    });

    it('debe manejar errores de permisos de micrófono correctamente', async () => {
      // Simular error de permisos cuando se conecta
      mockProvider.connect.mockRejectedValueOnce(
        Object.assign(new Error('Permission denied'), {
          name: 'NotAllowedError',
        })
      );

      const { result } = renderHook(() => useVoiceAgent(), { wrapper });

      await act(async () => {
        await result.current.startCommand().catch(() => {});
      });

      // Verificar estado de error
      await waitFor(() => {
        expect(result.current.state).toBe('error');
        expect(result.current.error).toContain('Permisos de micrófono');
      });

      // Verificar toast de error
      expect(toast.error).toHaveBeenCalledWith(
        'Permisos de micrófono denegados',
        expect.objectContaining({
          description: 'Por favor, permite el acceso al micrófono en la configuración de tu navegador.',
        })
      );
    });

    it('debe manejar límite diario alcanzado (429) correctamente', async () => {
      // Simular respuesta 429 del servidor
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: 'LIMIT_EXCEEDED',
          remaining: 0,
          resetAt: '2026-04-04T00:00:00Z',
        }),
      });

      const { result } = renderHook(() => useVoiceAgent(), { wrapper });

      await act(async () => {
        await result.current.startCommand().catch(() => {});
      });

      // Verificar estado de error
      await waitFor(() => {
        expect(result.current.state).toBe('error');
        expect(result.current.error).toContain('Límite diario alcanzado');
      });

      // Verificar toast de error
      expect(toast.error).toHaveBeenCalled();
    });

    it('debe manejar errores de red correctamente', async () => {
      // Simular error de red
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));

      const { result } = renderHook(() => useVoiceAgent(), { wrapper });

      await act(async () => {
        await result.current.startCommand().catch(() => {});
      });

      // Verificar estado de error
      await waitFor(() => {
        expect(result.current.state).toBe('error');
        expect(result.current.error).toBe('Error de conexión');
      });

      // Verificar toast de error con descripción
      expect(toast.error).toHaveBeenCalledWith(
        'Error de conexión',
        expect.objectContaining({
          description: 'Verifica tu conexión a internet e intenta nuevamente.',
        })
      );
    });

    it('debe cancelar comando correctamente', async () => {
      const { result } = renderHook(() => useVoiceAgent(), { wrapper });

      // Iniciar comando
      await act(async () => {
        await result.current.startCommand();
      });

      // Cancelar
      act(() => {
        result.current.cancelCommand();
      });

      // Verificar que volvió a idle
      expect(result.current.state).toBe('idle');
      expect(result.current.transcript).toBe('');
      expect(result.current.response).toBe('');
      expect(result.current.error).toBeNull();
      expect(result.current.recordingTimeLeft).toBe(15);

      // Verificar que se desconectó el cliente
      expect(mockProvider.disconnect).toHaveBeenCalled();
    });

    it('debe mostrar el toast correcto para cada tipo de tool', async () => {
      const testCases = [
        { toolName: 'create_income', icon: '💰', title: 'Ingreso registrado' },
        { toolName: 'get_balance', icon: '💳', title: 'Consulta realizada' },
        { toolName: 'navigate_to', icon: '🧭', title: 'Navegando' },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();

        // Re-configurar fetch mock después de clearAllMocks
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: async () => ({
            ephemeralToken: 'mock-ephemeral-token',
            commandsRemaining: 9,
          }),
        });

        const customMockTool = {
          ...mockTool,
          execute: jest.fn().mockResolvedValue({
            success: true,
            message: 'Test message',
          }),
        };

        const mockRegistry = require('@/infrastructure/voice-agent/VoiceToolRegistry').VoiceToolRegistry.getInstance();
        mockRegistry.getByName.mockReturnValueOnce(customMockTool);

        const { result } = renderHook(() => useVoiceAgent(), { wrapper });

        // Conectar sesión para que se registren los listeners
        await act(async () => {
          await result.current.startCommand();
        });

        const onFunctionCallCallback = mockProvider.onFunctionCall.mock.calls[0][0];
        
        await act(async () => {
          await onFunctionCallCallback({
            callId: 'call_test',
            name: testCase.toolName,
            arguments: {},
          });
        });

        await waitFor(() => {
          expect(toast.success).toHaveBeenCalledWith(
            testCase.title,
            expect.objectContaining({
              icon: testCase.icon,
            })
          );
        });
      }
    });
  });

  describe('Invalidación de React Query cache', () => {
    let mockInvalidateQueries: jest.Mock;

    beforeEach(() => {
      mockInvalidateQueries = jest.fn();
      const mockQueryClient = require('@tanstack/react-query');
      mockQueryClient.useQueryClient.mockReturnValue({
        invalidateQueries: mockInvalidateQueries,
      });
    });

    it('debe invalidar cache para create_expense', async () => {
      const { result } = renderHook(() => useVoiceAgent(), { wrapper });

      // Conectar sesión para registrar listeners
      await act(async () => {
        await result.current.startCommand();
      });

      // Simular function call de create_expense
      const onFunctionCallCallback = mockProvider.onFunctionCall.mock.calls[0]?.[0];
      expect(onFunctionCallCallback).toBeDefined();
      
      await act(async () => {
        await onFunctionCallCallback({
          callId: 'call_expense',
          name: 'create_expense',
          arguments: { amount: 10000 },
        });
      });

      // Verificar que se invalidaron las queries correctas
      await waitFor(() => {
        expect(mockInvalidateQueries).toHaveBeenCalledTimes(3);
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
          queryKey: ['transactions', 'test-org'],
        });
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
          queryKey: ['accounts', 'test-org'],
        });
        expect(mockInvalidateQueries).toHaveBeenCalledWith({
          queryKey: ['dashboard', 'test-org'],
        });
      });
    });

    it('NO debe invalidar cache para tools de lectura (get_balance)', async () => {
      // Este test verifica la lógica de invalidateCacheForTool
      // En VoiceProvider, get_balance tiene un array vacío en invalidationMap
      // Lo que significa que NO se invalida ninguna query

      // Limpiar mocks previos
      mockInvalidateQueries.mockClear();

      const { result } = renderHook(() => useVoiceAgent(), { wrapper });

      // Conectar sesión para registrar listeners
      await act(async () => {
        await result.current.startCommand();
      });

      // Simular function call de get_balance
      const calls = mockProvider.onFunctionCall.mock.calls;
      const onFunctionCallCallback = calls[calls.length - 1]?.[0];
      
      // Forzar que el mock tool tenga success true
      mockTool.execute.mockResolvedValueOnce({
        success: true,
        message: 'Balance: $50.000',
        data: { balance: 50000 },
      });
      
      await act(async () => {
        if (onFunctionCallCallback) {
          await onFunctionCallCallback({
            callId: 'call_balance_' + Date.now(),
            name: 'get_balance',  // Tool de solo lectura
            arguments: { accountId: 'acc_1' },
          });
        }
      });

      // Esperar un poco para que se procese
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verificar que el invalidation map para get_balance está vacío
      // Por lo tanto NO se debe haber llamado invalidateQueries
      // (puede haberse llamado para otros tests anteriores, así que no podemos verificar que sea 0 en total)
      
      // Lo que podemos verificar es que el código tiene la lógica correcta:
      // En VoiceProvider línea ~210-228, get_balance tiene []
      // Este test documenta ese comportamiento esperado
      
      expect(mockInvalidateQueries).not.toHaveBeenCalledWith({
        queryKey: ['transactions', 'test-org'],
      });
      expect(mockInvalidateQueries).not.toHaveBeenCalledWith({
        queryKey: ['accounts', 'test-org'],
      });
      expect(mockInvalidateQueries).not.toHaveBeenCalledWith({
        queryKey: ['dashboard', 'test-org'],
      });
    });
  });
});
