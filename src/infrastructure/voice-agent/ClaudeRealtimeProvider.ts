/**
 * ClaudeRealtimeProvider — Stub para futuro proveedor de Anthropic Claude
 * 
 * Implementación pendiente que usará:
 * - Claude API con HTTP Streaming (SSE)
 * - Modelo: claude-sonnet-4-20250514 (o superior)
 * - Protocolo: HTTP POST con Server-Sent Events para streaming
 * - Audio: Capturar con Web Audio API → transcribir localmente → enviar texto
 *   (Claude no tiene audio nativo, se necesita STT local o externo)
 * 
 * @see https://docs.anthropic.com/en/docs/build-with-claude/streaming
 * @see https://docs.anthropic.com/en/docs/build-with-claude/tool-use
 * 
 * Para implementar:
 * 1. Capturar audio y transcribir localmente (Web Speech API o Whisper.js)
 * 2. Enviar texto transcrito a Claude Messages API con streaming
 * 3. Manejar tool_use content blocks y enviar tool_result de vuelta
 * 4. Sintetizar audio de respuesta con Web Speech API TTS o servicio externo
 * 5. Gestionar historial de mensajes para multi-turno
 */

import type {
  IAIRealtimeProvider,
  AIProviderState,
  AIFunctionCall,
  AISessionConfig,
} from '@/domain/ports/IAIRealtimeProvider';

const NOT_IMPLEMENTED = 'ClaudeRealtimeProvider no está implementado aún.';

export class ClaudeRealtimeProvider implements IAIRealtimeProvider {
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
