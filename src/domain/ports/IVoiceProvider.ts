/**
 * IVoiceProvider — Interfaz simplificada para proveedores de voz
 * 
 * Reemplaza a IAIRealtimeProvider con una interfaz más simple y clara.
 * Los componentes UI y hooks dependen SOLO de esta interfaz.
 * 
 * Principio: Dependency Inversion (Clean Architecture)
 * Simplificación: Solo métodos esenciales, sin métodos sin usar
 */

import type { VoiceError } from '@/infrastructure/voice-agent/VoiceErrorHandler';

/**
 * Estados posibles del proveedor de voz
 */
export type VoiceProviderState =
  | 'idle'
  | 'connecting'
  | 'ready'
  | 'recording'
  | 'processing'
  | 'executing'
  | 'error';

/**
 * Evento de function call recibido del proveedor
 */
export interface FunctionCall {
  callId: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Declaración de tool agnóstica (independiente del proveedor)
 */
export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Configuración de sesión para conectar con el proveedor
 */
export interface VoiceSessionConfig {
  ephemeralToken: string;
  tools: ToolDeclaration[];
  systemInstructions?: string;
  modalities?: ('text' | 'audio')[];
  temperature?: number;
  maxTokens?: number;
  voice?: string;
}

/**
 * Proveedores de voz soportados
 */
export type VoiceProviderType = 'openai' | 'gemini' | 'claude';

/**
 * Interfaz principal del proveedor de voz.
 * 
 * Lifecycle:
 *   connect() → startRecording() ⇄ stopRecording() → disconnect()
 *             └──── multi-turno (repetir) ────┘
 */
export interface IVoiceProvider {
  // --- Lifecycle ---
  
  /** Establece conexión con el proveedor */
  connect(config: VoiceSessionConfig): Promise<void>;

  /** Desconecta y limpia todos los recursos */
  disconnect(): void;

  // --- Recording ---
  
  /** Inicia grabación de audio del micrófono (push-to-talk down) */
  startRecording(): Promise<void>;

  /** Detiene grabación y envía audio a procesar (push-to-talk up) */
  stopRecording(): void;

  // --- Function calling ---
  
  /** Envía resultado de function call de vuelta al proveedor */
  sendFunctionResult(callId: string, result: unknown): void;

  // --- State ---
  
  /** Obtiene el estado actual del proveedor */
  getState(): VoiceProviderState;

  // --- Event listeners (simplificados) ---

  /** Cambios de estado del proveedor */
  onStateChange(cb: (state: VoiceProviderState) => void): void;

  /** Transcripción del audio del usuario */
  onTranscript(cb: (text: string) => void): void;

  /** Respuesta de texto del modelo */
  onResponse(cb: (text: string) => void): void;

  /** Function call recibido del proveedor */
  onFunctionCall(cb: (call: FunctionCall) => void): void;

  /** Error en el proveedor */
  onError(cb: (error: VoiceError) => void): void;

  /** Actualización del tiempo restante de grabación */
  onRecordingTimeUpdate(cb: (timeLeft: number) => void): void;
}
