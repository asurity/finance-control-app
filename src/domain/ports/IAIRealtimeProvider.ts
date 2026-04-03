/**
 * IAIRealtimeProvider — Interfaz agnóstica para proveedores de IA en tiempo real
 * 
 * Cualquier proveedor (OpenAI, Gemini, Claude) debe implementar esta interfaz.
 * Los componentes UI y hooks dependen SOLO de esta interfaz, nunca del proveedor concreto.
 * 
 * Principio: Dependency Inversion (Clean Architecture)
 */

/**
 * Estados posibles del proveedor de IA
 */
export type AIProviderState =
  | 'idle'
  | 'connecting'
  | 'ready'
  | 'recording'
  | 'processing'
  | 'executing'
  | 'error';

/**
 * Evento de function call recibido del proveedor de IA
 */
export interface AIFunctionCall {
  callId: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Declaración de tool agnóstica (independiente del proveedor)
 * Se mapea al formato específico de cada proveedor via ToolDeclarationMapper
 */
export interface AIToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Configuración de sesión agnóstica para conectar con el proveedor de IA
 */
export interface AISessionConfig {
  ephemeralToken: string;
  tools: AIToolDeclaration[];
  systemInstructions?: string;
  modalities?: ('text' | 'audio')[];
  temperature?: number;
  maxTokens?: number;
  voice?: string;
}

/**
 * Proveedores de IA soportados
 */
export type AIProviderType = 'openai' | 'gemini' | 'claude';

/**
 * Interfaz principal del proveedor de IA en tiempo real.
 * 
 * Lifecycle:
 *   connect() → startAudioCapture() ⇄ stopAudioCaptureAndProcess() → disconnect()
 *             └─── multi-turno (repetir start/stop) ───┘
 */
export interface IAIRealtimeProvider {
  /** Establece conexión con el proveedor de IA */
  connect(config: AISessionConfig): Promise<void>;

  /** Desconecta y limpia todos los recursos */
  disconnect(): void;

  /** Inicia captura de audio del micrófono (push-to-talk down) */
  startAudioCapture(): Promise<void>;

  /** Detiene captura y envía audio a procesar (push-to-talk up) */
  stopAudioCaptureAndProcess(): void;

  /** Envía resultado de function call de vuelta al proveedor */
  sendFunctionResult(callId: string, result: unknown): void;

  /** Obtiene el estado actual del proveedor */
  getState(): AIProviderState;

  // --- Event listeners ---

  /** Cambios de estado del proveedor */
  onStateChange(cb: (state: AIProviderState) => void): void;

  /** Function call recibido del proveedor */
  onFunctionCall(cb: (call: AIFunctionCall) => void): void;

  /** Transcripción del audio del usuario (parcial o final) */
  onTranscript(cb: (text: string, isFinal: boolean) => void): void;

  /** Respuesta de texto del modelo (parcial o final) */
  onTextResponse(cb: (text: string, isFinal: boolean) => void): void;

  /** Audio track de respuesta del modelo (TTS) */
  onAudioResponse(cb: (audioTrack: MediaStreamTrack) => void): void;

  /** Error en el proveedor */
  onError(cb: (error: Error) => void): void;

  /** Actualización del tiempo restante de grabación */
  onRecordingTimeUpdate(cb: (timeLeft: number) => void): void;
}
