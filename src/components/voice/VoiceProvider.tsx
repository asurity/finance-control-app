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
import { useVoiceLogger } from '@/application/hooks/useVoiceLogger';
import { VoiceProviderFactory } from '@/infrastructure/voice-agent/VoiceProviderFactory';
import type { IVoiceProvider, VoiceProviderState, FunctionCall } from '@/domain/ports/IVoiceProvider';
import { VoiceToolRegistry } from '@/infrastructure/voice-agent/VoiceToolRegistry';
import { registerAllTools } from '@/infrastructure/voice-agent/tools';
import { APP_CONFIG } from '@/lib/constants/config';
import { VoiceErrorHandler, type VoiceError } from '@/infrastructure/voice-agent/VoiceErrorHandler';
import { VoiceStateMachine, type VoiceState } from '@/infrastructure/voice-agent/VoiceStateMachine';
import { VoiceToolExecutor } from '@/infrastructure/voice-agent/VoiceToolExecutor';
import { voiceMetrics, startTimer, VOICE_METRICS } from '@/infrastructure/voice-agent/VoiceMetrics';
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
  currentExecutingTool: string | null;

  // Acciones
  openModal: () => void;
  closeModal: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  endSession: () => void;
  prepareSession: () => Promise<void>; // Nueva: pre-conectar sesión

  // Datos
  transcript: string;
  response: string;
  error: VoiceError | null;
  commandsRemainingToday: number;
  recordingTimeLeft: number;
  conversationHistory: ConversationMessage[];
  audioStream: MediaStream | null;
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
  const { logCommand, logError } = useVoiceLogger();

  // State machine centralizado
  const stateMachineRef = useRef(new VoiceStateMachine());
  const toolExecutorRef = useRef(new VoiceToolExecutor());
  
  // Proveedor de IA (singleton por sesión)
  const providerRef = useRef<IVoiceProvider | null>(null);
  
  // Refs para mantener valores actualizados en callbacks (evita stale closures)
  const userRef = useRef(user);
  const orgIdRef = useRef(currentOrgId);
  // Ref para handleFunctionCall (evita stale closure en setupProviderListeners)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFunctionCallRef = useRef<((functionCall: any) => Promise<void>) | null>(null);
  
  // Actualizar refs cuando cambian los valores
  useEffect(() => {
    userRef.current = user;
    orgIdRef.current = currentOrgId;
  }, [user, currentOrgId]);
  
  // Estado centralizado en state machine
  const [machineState, setMachineState] = useState<VoiceState>(stateMachineRef.current.getState());
  
  // Suscribirse a cambios del state machine
  useEffect(() => {
    const unsubscribe = stateMachineRef.current.subscribe(setMachineState);
    return unsubscribe;
  }, []);
  
  // Derivar valores del state machine
  const state = machineState.status as VoiceAgentState;
  const transcript = machineState.status === 'recording' || machineState.status === 'processing' 
    ? machineState.transcript 
    : '';
  const response = machineState.status === 'responding' ? machineState.response : '';
  const error = machineState.status === 'error' ? machineState.error : null;
  const recordingTimeLeft = machineState.status === 'recording' ? machineState.timeLeft : 15;
  const currentExecutingTool = machineState.status === 'executing' ? machineState.toolName : null;
  
  // Estado adicional (no gestionado por state machine)
  const [commandsRemainingToday, setCommandsRemainingToday] = useState(10);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

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
   * Mapea eventos del provider a eventos del state machine
   */
  const setupProviderListeners = useCallback((provider: IVoiceProvider) => {
    const machine = stateMachineRef.current;
    
    provider.onStateChange((providerState: VoiceProviderState) => {
      // Mapear estados del provider a eventos del state machine
      if (providerState === 'connecting') {
        machine.send({ type: 'CONNECT' });
      } else if (providerState === 'ready') {
        machine.send({ type: 'CONNECTED' });
      }
    });

    provider.onTranscript((text: string) => {
      machine.send({
        type: 'TRANSCRIPT_UPDATE',
        transcript: text,
        timeLeft: recordingTimeLeft,
      });
    });

    provider.onResponse((text: string) => {
      // Todas las respuestas son finales en la interfaz simplificada
      if (text.trim()) {
        addMessage('assistant', text);
        machine.send({ type: 'RESPONSE', text });
        
        // Volver a ready después de mostrar la respuesta
        setTimeout(() => {
          machine.send({ type: 'READY' });
        }, 100);
      }
    });

    provider.onError((voiceError: VoiceError) => {
      console.error('[VoiceProvider] Error:', voiceError);
      machine.send({ type: 'ERROR', error: voiceError });
      
      // Toast con recovery action si existe
      toast.error(voiceError.message, {
        description: voiceError.description,
        action: voiceError.recoveryAction ? {
          label: voiceError.recoveryAction.label,
          onClick: voiceError.recoveryAction.handler,
        } : undefined,
      });
      
      // Log error
      logError(voiceError.code, voiceError.message).catch(console.error);
    });

    provider.onRecordingTimeUpdate((timeLeft: number) => {
      // Actualizar timeLeft en el estado de recording
      const currentState = machine.getState();
      if (currentState.status === 'recording') {
        machine.send({
          type: 'TRANSCRIPT_UPDATE',
          transcript: currentState.transcript,
          timeLeft,
        });
      }
    });

    provider.onFunctionCall(async (functionCall: FunctionCall) => {
      if (handleFunctionCallRef.current) {
        await handleFunctionCallRef.current(functionCall);
      }
    });

    /*
    // TODO: Consider removing if audio output is fully removed from provider
    if ('onAudioResponse' in provider) {
      (provider as any).onAudioResponse((audioTrack: MediaStreamTrack) => {
        const stream = new MediaStream([audioTrack]);
        setAudioStream(stream);
      });
    }
    */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addMessage, logError]);

  /**
   * Maneja la ejecución de function calls usando VoiceToolExecutor
   */
  const handleFunctionCall = useCallback(async (functionCall: FunctionCall) => {
    const currentUser = userRef.current;
    const currentOrg = orgIdRef.current;
    const machine = stateMachineRef.current;
    const toolExecutor = toolExecutorRef.current;
    const endTimer = startTimer(VOICE_METRICS.TOOL_EXECUTION_DURATION_MS.replace('_duration_ms', ''));
    
    if (!currentUser || !currentOrg || !providerRef.current) {
      console.error('[VoiceProvider] handleFunctionCall: Missing user or orgId');
      
      // Enviar error de vuelta al modelo
      if (providerRef.current) {
        providerRef.current.sendFunctionResult(functionCall.callId, {
          success: false,
          message: 'Contexto de usuario no disponible. Intenta de nuevo.',
        });
      }
      
      const voiceError = VoiceErrorHandler.handle(new Error('Contexto de usuario no disponible'));
      machine.send({ type: 'ERROR', error: voiceError });
      
      toast.error(voiceError.message, {
        description: voiceError.description,
      });
      
      voiceMetrics.track(VOICE_METRICS.TOOL_ERROR, 1, { 
        toolName: functionCall.name,
        error: 'Missing user context' 
      });
      
      return;
    }

    // Transición a estado executing con tool info
    const toolLabel = getToolLabel(functionCall.name);
    machine.send({
      type: 'FUNCTION_CALL',
      toolName: functionCall.name,
      toolLabel,
    });

    try {
      // Ejecutar tool usando VoiceToolExecutor
      const executionResult = await toolExecutor.execute(functionCall, {
        userId: currentUser.id,
        orgId: currentOrg,
      });

      // Formatear resultado para el modelo
      const outputForAI = toolExecutor.formatResult(executionResult);
      
      // Enviar resultado de vuelta a la IA
      providerRef.current.sendFunctionResult(functionCall.callId, outputForAI);

      // Invalidar cache de React Query automáticamente
      const queriesToInvalidate = toolExecutor.getQueriesToInvalidate(executionResult, currentOrg);
      queriesToInvalidate.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey });
      });

      // Toast de confirmación SOLO para tools de acción
      if (executionResult.result.success && executionResult.isActionTool) {
        showSuccessToast(functionCall.name, executionResult.result.message);
      }

      // Métricas de éxito
      voiceMetrics.track(VOICE_METRICS.TOOL_SUCCESS, 1, { toolName: functionCall.name });
      endTimer();

      // Log async
const currentState = machine.getState();
      const currentTranscript = currentState.status === 'executing'
        ? ''
        : (currentState.status === 'processing' && 'transcript' in currentState ? currentState.transcript : '');
      
      logCommand({
        transcription: currentTranscript,
        toolsExecuted: [functionCall.name],
        tokensUsed: 0,
        success: true,
      }).catch((err) => {
        console.error('[VoiceProvider] Error al guardar log:', err);
      });

    } catch (err) {
      console.error('[VoiceProvider] Error ejecutando tool:', err);
      
      const errorObj = err instanceof Error ? err : new Error('Error desconocido');
      const voiceError = VoiceErrorHandler.handle(errorObj);
      const errorMessage = voiceError.description || voiceError.message;
      
      // Métricas de error
      voiceMetrics.track(VOICE_METRICS.TOOL_ERROR, 1, { 
        toolName: functionCall.name,
        errorCode: voiceError.code,
        errorMessage: voiceError.message 
      });
      
      // Enviar error al modelo
      if (providerRef.current) {
        providerRef.current.sendFunctionResult(functionCall.callId, {
          success: false,
          message: errorMessage,
        });
      }

      // Mostrar error al usuario
      toast.error(voiceError.message, { 
        description: voiceError.description,
        action: voiceError.recoveryAction ? {
          label: voiceError.recoveryAction.label,
          onClick: voiceError.recoveryAction.handler,
        } : undefined,
      });

      // Log error
      logCommand({
        transcription: '',
        toolsExecuted: [functionCall.name],
        tokensUsed: 0,
        success: false,
        errorMessage,
      }).catch(() => {});

      // Transición a error
      machine.send({ type: 'ERROR', error: voiceError });
    }
  }, [logCommand, queryClient]);

  // Mantener ref actualizado para evitar stale closures en listeners del provider
  useEffect(() => {
    handleFunctionCallRef.current = handleFunctionCall;
  }, [handleFunctionCall]);

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

  const getToolLabel = useCallback((toolName: string): string => {
    const labels: Record<string, string> = {
      'create_expense': 'Registrando gasto...',
      'create_income': 'Registrando ingreso...',
      'get_balance': 'Consultando saldo...',
      'get_dashboard_summary': 'Cargando resumen...',
      'list_accounts': 'Listando cuentas...',
      'list_categories': 'Listando categorías...',
      'navigate_to': 'Navegando...',
    };
    return labels[toolName] || 'Ejecutando acción...';
  }, []);

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
    const machine = stateMachineRef.current;
    const endTimer = startTimer(VOICE_METRICS.CONNECTION_DURATION_MS.replace('_duration_ms', ''));
    
    if (!currentUser || !firebaseUser || !currentOrg) {
      const errorObj = new Error('Usuario no autenticado o organización no seleccionada');
      const voiceError = VoiceErrorHandler.handle(errorObj);
      machine.send({ type: 'ERROR', error: voiceError });
      toast.error(voiceError.message, { description: voiceError.description });
      voiceMetrics.track(VOICE_METRICS.CONNECTION_ERROR, 1, { error: 'No authenticated user' });
      throw errorObj;
    }

    machine.send({ type: 'CONNECT' });

    // Crear proveedor si no existe
    if (!providerRef.current) {
      providerRef.current = VoiceProviderFactory.create(APP_CONFIG.aiProvider);
      setupProviderListeners(providerRef.current);
    }

    try {
      const idToken = await firebaseUser.getIdToken();
      
      // URL de la función de voz (Firebase Cloud Function)
      const voiceSessionUrl = process.env.NEXT_PUBLIC_VOICE_SESSION_URL || '/api/voice/session';
      
      const res = await fetch(voiceSessionUrl, {
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
      
      // Métricas de éxito
      voiceMetrics.track(VOICE_METRICS.CONNECTION_SUCCESS, 1);
      endTimer();

    } catch (err) {
      console.error('[VoiceProvider] Error conectando sesión:', err);
      
      const errorObj = err instanceof Error ? err : new Error('Error al iniciar comando de voz');
      const voiceError = VoiceErrorHandler.handle(errorObj);

      machine.send({ type: 'ERROR', error: voiceError });
      toast.error(voiceError.message, {
        description: voiceError.description,
        action: voiceError.recoveryAction ? {
          label: voiceError.recoveryAction.label,
          onClick: voiceError.recoveryAction.handler,
        } : undefined,
      });
      
      // Métricas de error
      voiceMetrics.track(VOICE_METRICS.CONNECTION_ERROR, 1, { 
        errorCode: voiceError.code,
        errorMessage: voiceError.message 
      });
      
      // Log error
      logError(voiceError.code, voiceError.message).catch(console.error);
      
      throw err;
    }
  }, [firebaseUser, setupProviderListeners, logError]);

  /**
   * Iniciar grabación (push-to-talk DOWN)
   * Conecta sesión automáticamente si no está conectada
   */
  const startRecording = useCallback(async () => {
    const machine = stateMachineRef.current;

    // Solo conectar si no hay sesión activa
    if (!isSessionActive || !providerRef.current) {
      await connectSession();
    }

    // Iniciar captura de audio
    if (providerRef.current) {
      machine.send({ type: 'START_RECORDING' });
      voiceMetrics.track(VOICE_METRICS.RECORDING_STARTED, 1);
      await providerRef.current.startRecording();
    }
  }, [isSessionActive, connectSession]);

  /**
   * Pre-conectar sesión sin iniciar grabación
   * Se llama automáticamente al cargar la página cuando user/org están disponibles
   * y también al abrir el modal como fallback
   */
  const prepareSession = useCallback(async () => {
    // Si ya hay sesión activa, no hacer nada
    if (isSessionActive) return;
    
    // Si hay un provider roto (de un intento fallido previo), limpiarlo
    if (providerRef.current && !isSessionActive) {
      providerRef.current.disconnect();
      providerRef.current = null;
    }
    
    await connectSession();
  }, [isSessionActive, connectSession]);

  /**
   * Detener grabación (push-to-talk UP)
   * Valida transcript vacío — si vacío, no gasta tokens
   */
  const stopRecording = useCallback(() => {
    if (!providerRef.current) return;
    
    const machine = stateMachineRef.current;
    const currentState = machine.getState();
    
    // Solo detener si estamos grabando (evita múltiples llamadas)
    if (currentState.status !== 'recording') {
      return;
    }

    // Enviar evento de stop con el transcript actual
    machine.send({
      type: 'STOP_RECORDING',
      transcript: currentState.transcript,
    });

    providerRef.current.stopRecording();

    // Agregar transcripción del usuario al historial
    if (currentState.transcript.trim()) {
      addMessage('user', currentState.transcript);
    }
  }, [addMessage]);

  /**
   * Cerrar sesión completa
   */
  const endSession = useCallback(() => {
    const machine = stateMachineRef.current;
    
    if (providerRef.current) {
      providerRef.current.disconnect();
      providerRef.current = null;
    }
    
    setIsSessionActive(false);
    machine.send({ type: 'DISCONNECT' });
    setConversationHistory([]);
    setAudioStream(null);
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

  // =====================
  // Backward compat aliases
  // =====================
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
    currentExecutingTool,
    openModal,
    closeModal,
    startRecording,
    stopRecording,
    endSession,
    prepareSession,
    transcript,
    response,
    error,
    commandsRemainingToday,
    recordingTimeLeft,
    conversationHistory,
    audioStream,
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
