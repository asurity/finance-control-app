/**
 * GeminiRealtimeProvider — Stub para futuro proveedor de Google Gemini
 * 
 * Implementación pendiente que usará:
 * - Gemini Live API (WebSocket bidireccional)
 * - Modelo: gemini-2.0-flash (o superior)
 * - Protocolo: WebSocket con audio streaming
 * 
 * @see https://ai.google.dev/gemini-api/docs/live
 * @see https://ai.google.dev/gemini-api/docs/function-calling
 * 
 * Para implementar:
 * 1. Establecer WebSocket a wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent
 * 2. Enviar setup message con model, tools, systemInstruction
 * 3. Streaming de audio via WebSocket (base64 PCM chunks)
 * 4. Manejar tool_call responses y enviar tool_response de vuelta
 * 5. Recibir audio/texto de respuesta del modelo
 */

import type {
  IAIRealtimeProvider,
  AIProviderState,
  AIFunctionCall,
  AISessionConfig,
} from '@/domain/ports/IAIRealtimeProvider';

const NOT_IMPLEMENTED = 'GeminiRealtimeProvider no está implementado aún.';

export class GeminiRealtimeProvider implements IAIRealtimeProvider {
  async connect(_config: AISessionConfig): Promise<void> {
    throw new Error(NOT_IMPLEMENTED);
  }

  disconnect(): void {
    throw new Error(NOT_IMPLEMENTED);
  }

  async startAudioCapture(): Promise<void> {
    throw new Error(NOT_IMPLEMENTED);
  }

  stopAudioCaptureAndProcess(): void {
    throw new Error(NOT_IMPLEMENTED);
  }

  sendFunctionResult(_callId: string, _result: unknown): void {
    throw new Error(NOT_IMPLEMENTED);
  }

  getState(): AIProviderState {
    return 'idle';
  }

  onStateChange(_cb: (state: AIProviderState) => void): void { /* stub */ }
  onFunctionCall(_cb: (call: AIFunctionCall) => void): void { /* stub */ }
  onTranscript(_cb: (text: string, isFinal: boolean) => void): void { /* stub */ }
  onTextResponse(_cb: (text: string, isFinal: boolean) => void): void { /* stub */ }
  onAudioResponse(_cb: (audioTrack: MediaStreamTrack) => void): void { /* stub */ }
  onError(_cb: (error: Error) => void): void { /* stub */ }
  onRecordingTimeUpdate(_cb: (timeLeft: number) => void): void { /* stub */ }
}
