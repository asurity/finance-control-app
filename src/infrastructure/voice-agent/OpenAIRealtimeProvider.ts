/**
 * OpenAIRealtimeProvider — Implementación de IAIRealtimeProvider para OpenAI Realtime API
 * 
 * Usa WebRTC + DataChannel para comunicación en tiempo real con OpenAI.
 * Soporta push-to-talk (turn_detection: null) y multi-turno.
 * 
 * Refactorizado desde RealtimeClient para cumplir la interfaz agnóstica.
 */

import type {
  IAIRealtimeProvider,
  AIProviderState,
  AIFunctionCall,
  AISessionConfig,
  AIToolDeclaration,
} from '@/domain/ports/IAIRealtimeProvider';
import type { OpenAIToolDeclaration } from './types';
import { ToolDeclarationMapper } from './ToolDeclarationMapper';
import { VOICE_LIMITS, VOICE_AGENT_CONFIG, buildSystemInstructions } from './config';

export class OpenAIRealtimeProvider implements IAIRealtimeProvider {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private mediaStream: MediaStream | null = null;
  private recordingTimer: NodeJS.Timeout | null = null;
  private recordingIntervalTimer: ReturnType<typeof setInterval> | null = null;
  private recordingStartTime: number | null = null;

  private state: AIProviderState = 'idle';

  // Contador de function calls pendientes para evitar transición prematura a 'ready'
  private pendingFunctionCalls = 0;

  // Event listeners
  private onStateChangeCallback?: (state: AIProviderState) => void;
  private onFunctionCallCallback?: (call: AIFunctionCall) => void;
  private onTranscriptCallback?: (transcript: string, isFinal: boolean) => void;
  private onTextResponseCallback?: (text: string, isFinal: boolean) => void;
  private onAudioResponseCallback?: (audioTrack: MediaStreamTrack) => void;
  private onErrorCallback?: (error: Error) => void;
  private onRecordingTimeUpdateCallback?: (timeLeft: number) => void;

  // --- Event listener setters ---

  onStateChange(callback: (state: AIProviderState) => void): void {
    this.onStateChangeCallback = callback;
  }

  onFunctionCall(callback: (call: AIFunctionCall) => void): void {
    this.onFunctionCallCallback = callback;
  }

  onTranscript(callback: (transcript: string, isFinal: boolean) => void): void {
    this.onTranscriptCallback = callback;
  }

  onTextResponse(callback: (text: string, isFinal: boolean) => void): void {
    this.onTextResponseCallback = callback;
  }

  onAudioResponse(callback: (audioTrack: MediaStreamTrack) => void): void {
    this.onAudioResponseCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  onRecordingTimeUpdate(callback: (timeLeft: number) => void): void {
    this.onRecordingTimeUpdateCallback = callback;
  }

  // --- Core methods ---

  async connect(config: AISessionConfig): Promise<void> {
    try {
      this.setState('connecting');

      // 1. Crear RTCPeerConnection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      // 2. Escuchar audio remoto (TTS del modelo)
      this.peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteStream) {
          const audioTrack = remoteStream.getAudioTracks()[0];
          if (audioTrack) {
            if (this.onAudioResponseCallback) {
              this.onAudioResponseCallback(audioTrack);
            }
          }
        }
      };

      // 3. Capturar audio del micrófono
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 4. Iniciar con audio muteado (push-to-talk: solo se activa al presionar)
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });

      // 5. Agregar tracks de audio al peer connection
      this.mediaStream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, this.mediaStream!);
      });

      // 6. Crear DataChannel para eventos
      this.dataChannel = this.peerConnection.createDataChannel('oai-events');
      this.setupDataChannelListeners();

      // 7. Crear offer SDP
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // 8. Esperar ICE gathering completo (WHIP compliance)
      await this.waitForIceGatheringComplete();

      // 9. Intercambiar SDP con OpenAI (usar localDescription con ICE candidates)
      const answer = await this.exchangeSDPWithOpenAI(
        config.ephemeralToken,
        this.peerConnection.localDescription!.sdp
      );

      // 10. Establecer remote description
      await this.peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: answer,
      });

      // 11. Esperar DataChannel abierto
      await this.waitForDataChannelOpen();

      // 12. Configurar sesión con tools y config
      this.sendSessionUpdate(config);

      // 13. Listo para recibir push-to-talk
      this.setState('ready');
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  disconnect(): void {
    this.stopRecordingTimers();
    this.pendingFunctionCalls = 0;

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.setState('idle');
  }

  async startAudioCapture(): Promise<void> {
    if (!this.mediaStream || !this.peerConnection) {
      throw new Error('No hay conexión activa. Llama a connect() primero.');
    }

    // Unmute audio tracks
    this.mediaStream.getAudioTracks().forEach((track) => {
      track.enabled = true;
    });

    this.setState('recording');
    this.startRecordingTimer();
  }

  stopAudioCaptureAndProcess(): void {
    // Prevenir múltiples llamadas
    if (this.state !== 'recording') {
      console.warn('[OpenAIRealtimeProvider] stopAudioCaptureAndProcess llamado pero no estamos grabando (estado:', this.state, ')');
      return;
    }

    // Cambiar estado INMEDIATAMENTE para prevenir race conditions
    this.setState('processing');

    // Mute audio tracks (no destruir stream para reutilizar en multi-turno)
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
    }

    this.stopRecordingTimers();

    // Commit audio buffer y solicitar respuesta
    this.sendEvent({ type: 'input_audio_buffer.commit' });
    this.sendEvent({ type: 'response.create' });
  }

  sendFunctionResult(callId: string, result: unknown): void {
    this.sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(result),
      },
    });

    this.sendEvent({ type: 'response.create' });

    // Decrementar contador de function calls pendientes
    this.pendingFunctionCalls = Math.max(0, this.pendingFunctionCalls - 1);
    // Transicionar a ready si ya no hay function calls pendientes
    this.transitionToReadyIfDone();
  }

  getState(): AIProviderState {
    return this.state;
  }

  // --- Backward compatibility (deprecated, use stopAudioCaptureAndProcess) ---

  forceCommitAudio(): void {
    if (this.state !== 'recording') {
      console.warn('No se puede hacer commit: no hay grabación activa');
      return;
    }
    this.stopAudioCaptureAndProcess();
  }

  // --- Private methods ---

  private async exchangeSDPWithOpenAI(
    ephemeralToken: string,
    offer: string
  ): Promise<string> {
    const formData = new FormData();
    formData.set('sdp', offer);

    const response = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ephemeralToken}`,
        // No set Content-Type manually; browser sets multipart/form-data with boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error('[OpenAIRealtimeProvider] SDP exchange error:', response.status, errorBody);
      throw new Error(`OpenAI SDP exchange failed: ${response.status} ${errorBody}`);
    }

    return await response.text();
  }

  private waitForIceGatheringComplete(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.peerConnection) {
        reject(new Error('No peer connection'));
        return;
      }

      if (this.peerConnection.iceGatheringState === 'complete') {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        this.peerConnection?.removeEventListener('icegatheringstatechange', checkState);
        // Resolve anyway — partial candidates may still work
        resolve();
      }, 5000);

      const checkState = () => {
        if (this.peerConnection?.iceGatheringState === 'complete') {
          clearTimeout(timeout);
          this.peerConnection.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }
      };

      this.peerConnection.addEventListener('icegatheringstatechange', checkState);
    });
  }

  private waitForDataChannelOpen(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.dataChannel?.readyState === 'open') {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('DataChannel open timeout'));
      }, 10000);

      this.dataChannel!.addEventListener('open', () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
    });
  }

  private setupDataChannelListeners(): void {
    if (!this.dataChannel) return;

    this.dataChannel.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleServerEvent(data);
      } catch (error) {
        console.error('[OpenAIRealtimeProvider] Error parsing DataChannel message:', error);
      }
    });

    this.dataChannel.addEventListener('error', () => {
      this.handleError(new Error('DataChannel error'));
    });

    this.dataChannel.addEventListener('close', () => {
      // DataChannel closed - connection ended
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleServerEvent(event: any): void {
    switch (event.type) {
      case 'input_audio_buffer.speech_started':
        // En modo push-to-talk, ya estamos en recording. Ignorar VAD start.
        if (this.state !== 'recording') {
          this.setState('recording');
        }
        break;

      case 'input_audio_buffer.speech_stopped':
        // VAD auto-commit - ignorar en push-to-talk (manejamos manualmente)
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (this.onTranscriptCallback) {
          this.onTranscriptCallback(event.transcript, true);
        }
        if (this.state === 'recording') {
          this.setState('processing');
        }
        break;

      case 'conversation.item.input_audio_transcription.delta':
        if (this.onTranscriptCallback) {
          this.onTranscriptCallback(event.delta, false);
        }
        break;

      case 'response.function_call_arguments.done':
        this.pendingFunctionCalls++;
        this.setState('executing');
        if (this.onFunctionCallCallback) {
          this.onFunctionCallCallback({
            callId: event.call_id,
            name: event.name,
            arguments: JSON.parse(event.arguments),
          });
        }
        break;

      // --- Respuestas de texto (modalities: ['text'] sin audio) ---
      case 'response.text.delta':
        if (this.onTextResponseCallback) {
          this.onTextResponseCallback(event.delta, false);
        }
        break;

      case 'response.text.done':
        if (this.onTextResponseCallback) {
          this.onTextResponseCallback(event.text, true);
        }
        this.transitionToReadyIfDone();
        break;

      // --- Respuestas de audio+texto (modalities: ['text', 'audio']) ---
      // Cuando TTS está habilitado, el texto viene como audio_transcript
      case 'response.audio_transcript.delta':
        if (this.onTextResponseCallback) {
          this.onTextResponseCallback(event.delta, false);
        }
        break;

      case 'response.audio_transcript.done':
        if (this.onTextResponseCallback) {
          this.onTextResponseCallback(event.transcript, true);
        }
        // No transicionar aquí — response.done se encarga
        break;

      case 'response.audio.delta':
        // Audio incremental del modelo - manejado via ontrack (WebRTC)
        break;

      case 'response.done':
        // Respuesta completa (puede incluir texto + audio + function calls)
        this.transitionToReadyIfDone();
        break;

      case 'error':
        this.handleError(new Error(event.error?.message || 'OpenAI error'));
        break;

      default:
        // Event received: event.type
        break;
    }
  }

  /**
   * Transiciona a 'ready' si estamos en un estado post-procesamiento.
   * Permite al usuario hacer otro push-to-talk.
   */
  private transitionToReadyIfDone(): void {
    // No transicionar si hay function calls pendientes
    if (this.pendingFunctionCalls > 0) {
      return;
    }
    if (this.state === 'processing' || this.state === 'executing') {
      this.setState('ready');
    }
  }

  private sendSessionUpdate(config: AISessionConfig): void {
    // Mapear tools agnósticos → formato OpenAI
    const openaiTools: OpenAIToolDeclaration[] = config.tools.map(
      (tool) => ToolDeclarationMapper.toOpenAI(tool)
    );

    this.sendEvent({
      type: 'session.update',
      session: {
        type: 'realtime',
        output_modalities: ['audio'],
        instructions: config.systemInstructions || buildSystemInstructions(),
        audio: {
          input: {
            format: { type: 'audio/pcm', rate: 24000 },
            transcription: {
              model: 'whisper-1',
            },
            // Push-to-talk: deshabilitar VAD, control manual
            turn_detection: null,
          },
          output: {
            format: { type: 'audio/pcm', rate: 24000 },
            voice: (config.voice || VOICE_AGENT_CONFIG.voice || 'alloy') as string,
          },
        },
        tools: openaiTools,
        tool_choice: 'auto',
        max_output_tokens: config.maxTokens ?? 300,
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sendEvent(event: any): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.warn('[OpenAIRealtimeProvider] DataChannel not open, cannot send event');
      return;
    }
    this.dataChannel.send(JSON.stringify(event));
  }

  private startRecordingTimer(): void {
    this.recordingStartTime = Date.now();
    const maxSeconds = VOICE_LIMITS.maxInputDurationSeconds;

    // Actualizar cada segundo
    this.recordingIntervalTimer = setInterval(() => {
      if (!this.recordingStartTime) {
        this.stopRecordingTimers();
        return;
      }

      const elapsed = Date.now() - this.recordingStartTime;
      const timeLeft = Math.max(0, maxSeconds - Math.floor(elapsed / 1000));

      if (this.onRecordingTimeUpdateCallback) {
        this.onRecordingTimeUpdateCallback(timeLeft);
      }
    }, 1000);

    // Hard limit
    this.recordingTimer = setTimeout(() => {
      this.stopAudioCaptureAndProcess();
    }, maxSeconds * 1000);
  }

  private stopRecordingTimers(): void {
    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
      this.recordingTimer = null;
    }
    if (this.recordingIntervalTimer) {
      clearInterval(this.recordingIntervalTimer);
      this.recordingIntervalTimer = null;
    }
    this.recordingStartTime = null;
  }

  private setState(newState: AIProviderState): void {
    if (this.state !== newState) {
      this.state = newState;
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(newState);
      }
    }
  }

  private handleError(error: Error): void {
    console.error('[OpenAIRealtimeProvider] Error:', error);
    this.setState('error');
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }
}
