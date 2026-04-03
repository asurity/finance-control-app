/**
 * VoiceProvider - Context provider para el agente de voz con IA
 * Fase 4: Hook y Context
 * 
 * Responsabilidades:
 * - Manejar el ciclo de vida de RealtimeClient
 * - Solicitar ephemeral token del API route
 * - Coordinar el flujo de estados del agente de voz
 * - Ejecutar tools cuando OpenAI invoca function calls
 * - Invalidar React Query cache después de mutaciones
 */

'use client';

import { createContext, useContext, useCallback, useState, useRef, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useVoiceUsageLogger } from '@/application/hooks/useVoiceUsageLogger';
import { 
  RealtimeClient,
  type RealtimeClientState,
  type RealtimeFunctionCall,
  type RealtimeSessionConfig
} from '@/infrastructure/voice-agent/RealtimeClient';
import { VoiceToolRegistry } from '@/infrastructure/voice-agent/VoiceToolRegistry';
import { registerAllTools } from '@/infrastructure/voice-agent/tools';
import { DIContainer } from '@/infrastructure/di/DIContainer';

/**
 * Estado del agente de voz
 */
export type VoiceAgentState = 
  | 'idle'          // Sin actividad
  | 'connecting'    // Estableciendo conexión WebRTC
  | 'recording'     // Grabando audio del usuario
  | 'processing'    // OpenAI procesando el audio
  | 'executing'     // Ejecutando function calls
  | 'error';        // Error en el flujo

/**
 * Interfaz del contexto de voz
 */
interface VoiceContextType {
  state: VoiceAgentState;
  isAvailable: boolean;
  startCommand: () => Promise<void>;
  cancelCommand: () => void;
  transcript: string;
  response: string;
  error: string | null;
  commandsRemainingToday: number;
  recordingTimeLeft: number;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

interface VoiceProviderProps {
  children: ReactNode;
}

/**
 * Provider del agente de voz
 * Solo se renderiza si el feature flag está activo
 */
export function VoiceProvider({ children }: VoiceProviderProps) {
  const { user, firebaseUser } = useAuth();
  const { currentOrgId } = useOrganization();
  const queryClient = useQueryClient();
  const { logCommand } = useVoiceUsageLogger();

  // RealtimeClient singleton
  const clientRef = useRef<RealtimeClient | null>(null);
  
  // Estado del agente
  const [state, setState] = useState<VoiceAgentState>('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [commandsRemainingToday, setCommandsRemainingToday] = useState(10);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(15);

  // Registrar tools al montar
  useEffect(() => {
    registerAllTools();
  }, []);

  // Inicializar RealtimeClient
  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = new RealtimeClient();
    }

    return () => {
      // Cleanup al desmontar
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
    };
  }, []);

  // Escuchar cambios de estado del RealtimeClient
  useEffect(() => {
    if (!clientRef.current) return;

    const client = clientRef.current;

    // Estado del cliente
    client.onStateChange((clientState: RealtimeClientState) => {
      // Mapear estados del cliente a estados del agente
      if (clientState === 'idle') setState('idle');
      else if (clientState === 'connecting') setState('connecting');
      else if (clientState === 'recording') setState('recording');
      else if (clientState === 'processing') setState('processing');
      else if (clientState === 'executing') setState('executing');
      else if (clientState === 'error') setState('error');
    });

    // Transcripción
    client.onTranscript((text: string, isFinal: boolean) => {
      setTranscript(text);
    });

    // Respuesta de texto
    client.onTextResponse((text: string, isFinal: boolean) => {
      setResponse(text);
    });

    // Errores
    client.onError((err: Error) => {
      console.error('[VoiceProvider] Error:', err);
      setError(err.message);
      setState('error');
    });

    // Tiempo de grabación
    client.onRecordingTimeUpdate((timeLeft: number) => {
      setRecordingTimeLeft(timeLeft);
    });

    // Function calls
    client.onFunctionCall(async (functionCall: RealtimeFunctionCall) => {
      await handleFunctionCall(functionCall);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Maneja la ejecución de function calls
   */
  const handleFunctionCall = useCallback(async (functionCall: RealtimeFunctionCall) => {
    if (!user || !currentOrgId || !clientRef.current) {
      console.error('[VoiceProvider] handleFunctionCall: Missing user or orgId');
      return;
    }

    setState('executing');

    try {
      // Buscar el tool en el registry
      const registry = VoiceToolRegistry.getInstance();
      const tool = registry.getByName(functionCall.name);

      if (!tool) {
        throw new Error(`Tool no encontrado: ${functionCall.name}`);
      }

      // Ejecutar el tool
      const container = DIContainer.getInstance();
      container.setOrgId(currentOrgId);
      
      const result = await tool.execute(functionCall.arguments, {
        userId: user.id,
        orgId: currentOrgId,
        container,
      });

      // Enviar resultado de vuelta a OpenAI
      clientRef.current.sendFunctionResult(functionCall.callId, result);

      // Invalidar React Query cache si el tool modificó datos
      invalidateCacheForTool(functionCall.name, currentOrgId);

      // Mostrar toast de confirmación para acciones exitosas
      if (result.success) {
        showSuccessToast(functionCall.name, result.message);
      }

      // Registrar comando ejecutado en Firestore (async, no bloquea)
      logCommand({
        transcription: transcript,
        toolsExecuted: [functionCall.name],
        tokensUsed: 0, // TODO: Capturar usage real de la respuesta de OpenAI
        success: true,
      }).catch((err) => {
        console.error('[VoiceProvider] Error al guardar log:', err);
      });

      console.log('[VoiceProvider] Tool ejecutado:', functionCall.name, result);

    } catch (err) {
      console.error('[VoiceProvider] Error ejecutando tool:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Error al ejecutar la acción';
      
      // Enviar error a OpenAI
      if (clientRef.current) {
        clientRef.current.sendFunctionResult(functionCall.callId, {
          success: false,
          message: errorMessage,
        });
      }

      // Mostrar toast de error
      toast.error('Error al ejecutar acción', {
        description: errorMessage,
      });

      // Registrar error en Firestore (async, no bloquea)
      logCommand({
        transcription: transcript,
        toolsExecuted: [functionCall.name],
        tokensUsed: 0,
        success: false,
        errorMessage,
      }).catch((err) => {
        console.error('[VoiceProvider] Error al guardar log de error:', err);
      });

      setError(errorMessage);
      setState('error');
    }
  }, [user, currentOrgId, transcript, logCommand]);

  /**
   * Muestra toast de confirmación según el tipo de acción
   */
  const showSuccessToast = useCallback((toolName: string, message: string) => {
    const toastConfig: Record<string, { icon: string; title: string }> = {
      'create_expense': { icon: '💸', title: 'Gasto registrado' },
      'create_income': { icon: '💰', title: 'Ingreso registrado' },
      'get_balance': { icon: '💳', title: 'Consulta realizada' },
      'get_dashboard_summary': { icon: '📊', title: 'Resumen obtenido' },
      'list_accounts': { icon: '🏦', title: 'Cuentas listadas' },
      'list_categories': { icon: '🏷️', title: 'Categorías listadas' },
      'navigate_to': { icon: '🧭', title: 'Navegando' },
    };

    const config = toastConfig[toolName] || { icon: '✅', title: 'Acción completada' };

    toast.success(config.title, {
      description: message,
      icon: config.icon,
      duration: 3000,
    });
  }, []);

  /**
   * Invalida cache de React Query según el tool ejecutado
   */
  const invalidateCacheForTool = useCallback((toolName: string, orgId: string) => {
    const invalidationMap: Record<string, string[][]> = {
      'create_expense': [
        ['transactions', orgId],
        ['accounts', orgId],
        ['dashboard', orgId],
      ],
      'create_income': [
        ['transactions', orgId],
        ['accounts', orgId],
        ['dashboard', orgId],
      ],
      // Tools de lectura no invalidan cache
      'get_balance': [],
      'get_dashboard_summary': [],
      'list_accounts': [],
      'list_categories': [],
      'navigate_to': [],
    };

    const queryKeys = invalidationMap[toolName] || [];
    
    queryKeys.forEach((queryKey) => {
      queryClient.invalidateQueries({ queryKey });
    });

    if (queryKeys.length > 0) {
      console.log('[VoiceProvider] Cache invalidado para:', toolName, queryKeys);
    }
  }, [queryClient]);

  /**
   * Inicia un comando de voz
   */
  const startCommand = useCallback(async () => {
    if (!user || !firebaseUser || !currentOrgId || !clientRef.current) {
      const errorMsg = 'Usuario no autenticado o organización no seleccionada';
      setError(errorMsg);
      toast.error('No disponible', { description: errorMsg });
      return;
    }

    // Reset de estados
    setTranscript('');
    setResponse('');
    setError(null);
    setState('connecting');

    try {
      // Solicitar ephemeral token del API route
      const idToken = await firebaseUser.getIdToken();
      
      const response = await fetch('/api/voice/session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Manejar errores específicos del servidor
        if (response.status === 429) {
          const errorData = await response.json();
          const resetDate = errorData.resetAt ? new Date(errorData.resetAt) : null;
          const resetTime = resetDate ? resetDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : 'mañana';
          
          throw new Error(`Límite diario alcanzado (10 comandos/día). Disponible nuevamente a las ${resetTime}.`);
        }
        
        if (response.status === 401) {
          throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        }
        
        if (response.status === 503) {
          throw new Error('Servicio de voz temporalmente no disponible. Intenta nuevamente en unos minutos.');
        }

        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al iniciar sesión de voz');
      }

      const sessionData = await response.json();
      
      // Actualizar comandos restantes
      setCommandsRemainingToday(sessionData.commandsRemaining);

      // Preparar configuración de la sesión
      const registry = VoiceToolRegistry.getInstance();
      const config: RealtimeSessionConfig = {
        ephemeralToken: sessionData.ephemeralToken,
        tools: registry.getDeclarations(),
      };

      // Conectar con OpenAI Realtime API
      await clientRef.current.connect(config);

      console.log('[VoiceProvider] Sesión de voz iniciada');

    } catch (err) {
      console.error('[VoiceProvider] Error iniciando comando:', err);
      
      let errorMessage = 'Error al iniciar comando de voz';
      let errorDescription = '';

      if (err instanceof Error) {
        // Errores específicos de permisos de micrófono
        if (err.name === 'NotAllowedError' || err.message.includes('Permission denied')) {
          errorMessage = 'Permisos de micrófono denegados';
          errorDescription = 'Por favor, permite el acceso al micrófono en la configuración de tu navegador.';
        }
        // Errores de dispositivo no disponible
        else if (err.name === 'NotFoundError' || err.message.includes('not found')) {
          errorMessage = 'Micrófono no encontrado';
          errorDescription = 'No se detectó ningún micrófono en tu dispositivo.';
        }
        // Errores de red
        else if (err.message.includes('Failed to fetch') || err.message.includes('Network')) {
          errorMessage = 'Error de conexión';
          errorDescription = 'Verifica tu conexión a internet e intenta nuevamente.';
        }
        // Errores personalizados del servidor
        else if (err.message.includes('Límite diario') || err.message.includes('Sesión expirada') || err.message.includes('no disponible')) {
          errorMessage = err.message;
        }
        // Otros errores con mensaje descriptivo
        else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      setState('error');

      // Mostrar toast de error
      toast.error(errorMessage, errorDescription ? { description: errorDescription } : undefined);
    }
  }, [user, firebaseUser, currentOrgId]);

  /**
   * Cancela el comando de voz en curso
   */
  const cancelCommand = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
    
    setState('idle');
    setTranscript('');
    setResponse('');
    setError(null);
    setRecordingTimeLeft(15);
  }, []);

  /**
   * Verifica si el agente de voz está disponible
   */
  const isAvailable = Boolean(
    user && 
    currentOrgId && 
    commandsRemainingToday > 0 &&
    state !== 'error'
  );

  const value: VoiceContextType = {
    state,
    isAvailable,
    startCommand,
    cancelCommand,
    transcript,
    response,
    error,
    commandsRemainingToday,
    recordingTimeLeft,
  };

  return (
    <VoiceContext.Provider value={value}>
      {children}
    </VoiceContext.Provider>
  );
}

/**
 * Hook para usar el contexto de voz
 * Lanza error si se usa fuera del provider
 */
export function useVoiceContext() {
  const context = useContext(VoiceContext);
  
  if (context === undefined) {
    throw new Error('useVoiceContext debe usarse dentro de VoiceProvider');
  }
  
  return context;
}
