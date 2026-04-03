/**
 * VoiceProvider - Context provider para el agente de voz conversacional
 * Fase 4: Refactorizado para multi-turno con push-to-talk
 * 
 * Responsabilidades:
 * - Gestionar ciclo de vida del proveedor de IA (vía AIProviderFactory)
 * - Separar conexión de sesión de la grabación (push-to-talk)
 * - Mantener historial de conversación multi-turno
 * - Validar transcript vacío antes de procesar
 * - Ejecutar tools cuando la IA invoca function calls
 * - Invalidar React Query cache después de mutaciones
 * - NO auto-cerrar después de ejecución (sesión persiste)
 */

'use client';

import { createContext, useContext, useCallback, useState, useRef, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useVoiceUsageLogger } from '@/application/hooks/useVoiceUsageLogger';
import { AIProviderFactory } from '@/infrastructure/voice-agent/AIProviderFactory';
import type { IAIRealtimeProvider, AIProviderState, AIFunctionCall } from '@/domain/ports/IAIRealtimeProvider';
import { VoiceToolRegistry } from '@/infrastructure/voice-agent/VoiceToolRegistry';
import { registerAllTools } from '@/infrastructure/voice-agent/tools';
import { DIContainer } from '@/infrastructure/di/DIContainer';
import { APP_CONFIG } from '@/lib/constants/config';
import type { ConversationMessage } from './VoiceConversationHistory';

/**
 * Estado del agente de voz
 */
export type VoiceAgentState = 
  | 'idle'          // Sin actividad
  | 'connecting'    // Estableciendo conexión WebRTC
  | 'ready'         // Conectado, esperando push-to-talk
  | 'recording'     // Grabando audio del usuario
  | 'processing'    // IA procesando el audio
  | 'executing'     // Ejecutando function calls
  | 'error';        // Error en el flujo

/**
 * Interfaz del contexto de voz
 */
interface VoiceContextType {
  // Estado
  state: VoiceAgentState;
  isAvailable: boolean;
  isSessionActive: boolean;
  isModalOpen: boolean;

  // Acciones
  openModal: () => void;
  closeModal: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  endSession: () => void;

  // Datos
  transcript: string;
  response: string;
  error: string | null;
  commandsRemainingToday: number;
  recordingTimeLeft: number;
  conversationHistory: ConversationMessage[];

  // Backward compat (deprecados)
  startCommand: () => Promise<void>;
  cancelCommand: () => void;
  forceCommitAudio: () => void;
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

  // Proveedor de IA (singleton por sesión)
  const providerRef = useRef<IAIRealtimeProvider | null>(null);
  
  // Refs para mantener valores actualizados en callbacks (evita stale closures)
  const userRef = useRef(user);
  const orgIdRef = useRef(currentOrgId);
  
  // Actualizar refs cuando cambian los valores
  useEffect(() => {
    userRef.current = user;
    orgIdRef.current = currentOrgId;
  }, [user, currentOrgId]);
  
  // Estado del agente
  const [state, setState] = useState<VoiceAgentState>('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [commandsRemainingToday, setCommandsRemainingToday] = useState(10);
  const [recordingTimeLeft, setRecordingTimeLeft] = useState(15);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);

  // Ref para ID de mensajes
  const messageIdRef = useRef(0);
  const nextId = useCallback(() => {
    messageIdRef.current += 1;
    return `msg-${messageIdRef.current}`;
  }, []);

  // Registrar tools al montar
  useEffect(() => {
    registerAllTools();
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (providerRef.current) {
        providerRef.current.disconnect();
        providerRef.current = null;
      }
    };
  }, []);

  /**
   * Agrega un mensaje al historial de conversación
   */
  const addMessage = useCallback((role: 'user' | 'assistant', text: string) => {
    setConversationHistory((prev) => [
      ...prev,
      { id: nextId(), role, text, timestamp: new Date() },
    ]);
  }, [nextId]);

  /**
   * Registra listeners en el proveedor de IA
   */
  const setupProviderListeners = useCallback((provider: IAIRealtimeProvider) => {
    provider.onStateChange((providerState: AIProviderState) => {
      setState(providerState as VoiceAgentState);
    });

    provider.onTranscript((text: string) => {
      setTranscript(text);
    });

    provider.onTextResponse((text: string, isFinal: boolean) => {
      setResponse((prev) => (isFinal ? text : prev + text));
      if (isFinal && text.trim()) {
        addMessage('assistant', text);
      }
    });

    provider.onError((err: Error) => {
      console.error('[VoiceProvider] Error:', err);
      setError(err.message);
      setState('error');
    });

    provider.onRecordingTimeUpdate((timeLeft: number) => {
      setRecordingTimeLeft(timeLeft);
    });

    provider.onFunctionCall(async (functionCall: AIFunctionCall) => {
      await handleFunctionCall(functionCall);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addMessage]);

  /**
   * Maneja la ejecución de function calls
   */
  const handleFunctionCall = useCallback(async (functionCall: AIFunctionCall) => {
    const currentUser = userRef.current;
    const currentOrg = orgIdRef.current;
    
    if (!currentUser || !currentOrg || !providerRef.current) {
      console.error('[VoiceProvider] handleFunctionCall: Missing user or orgId');
      return;
    }

    setState('executing');

    try {
      const registry = VoiceToolRegistry.getInstance();
      const tool = registry.getByName(functionCall.name);

      if (!tool) {
        throw new Error(`Tool no encontrado: ${functionCall.name}`);
      }

      console.log('[VoiceProvider] Ejecutando tool:', functionCall.name, 'con args:', functionCall.arguments);

      const container = DIContainer.getInstance();
      container.setOrgId(currentOrg);
      
      const result = await tool.execute(functionCall.arguments, {
        userId: currentUser.id,
        orgId: currentOrg,
        container,
      });

      console.log('[VoiceProvider] Tool ejecutado exitosamente:', functionCall.name, result);

      // Enviar resultado de vuelta a la IA
      providerRef.current.sendFunctionResult(functionCall.callId, result);

      // Invalidar React Query cache si el tool modificó datos
      invalidateCacheForTool(functionCall.name, currentOrg);

      // Toast de confirmación
      if (result.success) {
        showSuccessToast(functionCall.name, result.message);
      }

      // Log async
      logCommand(currentUser.id, {
        transcription: transcript,
        toolsExecuted: [functionCall.name],
        tokensUsed: 0,
        success: true,
      }).catch((err) => {
        console.error('[VoiceProvider] Error al guardar log:', err);
      });

    } catch (err) {
      console.error('[VoiceProvider] Error ejecutando tool:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Error al ejecutar la acción';
      
      if (providerRef.current) {
        providerRef.current.sendFunctionResult(functionCall.callId, {
          success: false,
          message: errorMessage,
        });
      }

      toast.error('Error al ejecutar acción', { description: errorMessage });

      logCommand(userRef.current?.id || '', {
        transcription: transcript,
        toolsExecuted: [functionCall.name],
        tokensUsed: 0,
        success: false,
        errorMessage,
      }).catch(() => {});

      setError(errorMessage);
      // NO poner error state — la sesión sigue activa para retry
    }
  }, [transcript, logCommand]);

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
    toast.success(config.title, { description: message, icon: config.icon, duration: 3000 });
  }, []);

  const invalidateCacheForTool = useCallback((toolName: string, orgId: string) => {
    const invalidationMap: Record<string, string[][]> = {
      'create_expense': [['transactions', orgId], ['accounts', orgId], ['dashboard', orgId]],
      'create_income': [['transactions', orgId], ['accounts', orgId], ['dashboard', orgId]],
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
  }, [queryClient]);

  // =====================
  // Acciones públicas
  // =====================

  /**
   * Conectar sesión con la IA (solicita token + WebRTC)
   * Se llama automáticamente al primer push-to-talk
   */
  const connectSession = useCallback(async () => {
    const currentUser = userRef.current;
    const currentOrg = orgIdRef.current;
    
    if (!currentUser || !firebaseUser || !currentOrg) {
      const errorMsg = 'Usuario no autenticado o organización no seleccionada';
      setError(errorMsg);
      toast.error('No disponible', { description: errorMsg });
      throw new Error(errorMsg);
    }

    setState('connecting');

    // Crear proveedor si no existe
    if (!providerRef.current) {
      providerRef.current = AIProviderFactory.create(APP_CONFIG.aiProvider);
      setupProviderListeners(providerRef.current);
    }

    try {
      const idToken = await firebaseUser.getIdToken();
      
      const res = await fetch('/api/voice/session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider: APP_CONFIG.aiProvider }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          const errorData = await res.json();
          const resetDate = errorData.resetAt ? new Date(errorData.resetAt) : null;
          const resetTime = resetDate ? resetDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : 'mañana';
          throw new Error(`Límite diario alcanzado. Disponible nuevamente a las ${resetTime}.`);
        }
        if (res.status === 401) throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        if (res.status === 503) throw new Error('Servicio de voz temporalmente no disponible.');
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al iniciar sesión de voz');
      }

      const sessionData = await res.json();
      setCommandsRemainingToday(sessionData.commandsRemaining);

      const registry = VoiceToolRegistry.getInstance();
      await providerRef.current.connect({
        ephemeralToken: sessionData.ephemeralToken,
        tools: registry.getDeclarations(),
      });

      setIsSessionActive(true);
      console.log('[VoiceProvider] Sesión conectada');

    } catch (err) {
      console.error('[VoiceProvider] Error conectando sesión:', err);
      
      let errorMessage = 'Error al iniciar comando de voz';
      let errorDescription = '';

      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.message.includes('Permission denied')) {
          errorMessage = 'Permisos de micrófono denegados';
          errorDescription = 'Por favor, permite el acceso al micrófono en la configuración de tu navegador.';
        } else if (err.name === 'NotFoundError' || err.message.includes('not found')) {
          errorMessage = 'Micrófono no encontrado';
          errorDescription = 'No se detectó ningún micrófono en tu dispositivo.';
        } else if (err.message.includes('Failed to fetch') || err.message.includes('Network')) {
          errorMessage = 'Error de conexión';
          errorDescription = 'Verifica tu conexión a internet e intenta nuevamente.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      setState('error');
      toast.error(errorMessage, errorDescription ? { description: errorDescription } : undefined);
      throw err;
    }
  }, [firebaseUser, setupProviderListeners]);

  /**
   * Iniciar grabación (push-to-talk DOWN)
   * Conecta sesión automáticamente si no está conectada
   */
  const startRecording = useCallback(async () => {
    setError(null);
    setTranscript('');
    setResponse('');
    setRecordingTimeLeft(15);

    if (!isSessionActive || !providerRef.current) {
      await connectSession();
    }

    if (providerRef.current) {
      await providerRef.current.startAudioCapture();
    }
  }, [isSessionActive, connectSession]);

  /**
   * Detener grabación (push-to-talk UP)
   * Valida transcript vacío — si vacío, no gasta tokens
   */
  const stopRecording = useCallback(() => {
    if (!providerRef.current || state !== 'recording') return;

    providerRef.current.stopAudioCaptureAndProcess();

    // Agregar transcripción del usuario al historial (se actualiza cuando llega el transcript final)
    // El transcript real llega async vía onTranscript callback
  }, [state]);

  /**
   * Cerrar sesión completa
   */
  const endSession = useCallback(() => {
    if (providerRef.current) {
      providerRef.current.disconnect();
      providerRef.current = null;
    }
    
    setIsSessionActive(false);
    setState('idle');
    setTranscript('');
    setResponse('');
    setError(null);
    setRecordingTimeLeft(15);
    setConversationHistory([]);
    messageIdRef.current = 0;
  }, []);

  /**
   * Abrir modal
   */
  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  /**
   * Cerrar modal (y sesión)
   */
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    endSession();
  }, [endSession]);

  // Agregar transcript del usuario al historial cuando pasa a processing
  useEffect(() => {
    if (state === 'processing' && transcript.trim().length > 0) {
      addMessage('user', transcript);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // =====================
  // Backward compat aliases
  // =====================
  const startCommand = startRecording;
  const cancelCommand = endSession;
  const forceCommitAudio = stopRecording;

  const isAvailable = Boolean(
    user && 
    currentOrgId && 
    commandsRemainingToday > 0 &&
    state !== 'error'
  );

  const value: VoiceContextType = {
    state,
    isAvailable,
    isSessionActive,
    isModalOpen,
    openModal,
    closeModal,
    startRecording,
    stopRecording,
    endSession,
    transcript,
    response,
    error,
    commandsRemainingToday,
    recordingTimeLeft,
    conversationHistory,
    // Backward compat
    startCommand,
    cancelCommand,
    forceCommitAudio,
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
