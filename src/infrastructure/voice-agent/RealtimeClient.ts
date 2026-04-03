/**
 * RealtimeClient — Cliente WebRTC para OpenAI Realtime API
 * Fase 3: WebRTC Client
 * 
 * Encapsula toda la lógica de conexión WebRTC con OpenAI Realtime API.
 * Maneja audio input, eventos del DataChannel y estados de la sesión.
 */

import { OpenAIToolDeclaration } from './types';

/**
 * Estados posibles del cliente
 */
export type RealtimeClientState = 
  | 'idle'           // Sin conexión
  | 'connecting'     // Estableciendo WebRTC
  | 'ready'          // Conectado, esperando comando de voz
  | 'recording'      // Grabando audio del usuario
  | 'processing'     // OpenAI procesando el audio
  | 'executing'      // Ejecutando function call
  | 'error';         // Error ocurrido

/**
 * Evento de function call recibido de OpenAI
 */
export interface RealtimeFunctionCall {
  callId: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Configuración para iniciar sesión
 */
export interface RealtimeSessionConfig {
  ephemeralToken: string;
  tools: OpenAIToolDeclaration[];
  systemInstructions?: string;
}

/**
 * Cliente WebRTC para OpenAI Realtime API
 * Gestiona conexión, audio, eventos y estados
 */
export class RealtimeClient {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private mediaStream: MediaStream | null = null;
  private recordingTimer: NodeJS.Timeout | null = null;
  private recordingStartTime: number | null = null;

  private state: RealtimeClientState = 'idle';
  
  // Event listeners
  private onStateChangeCallback?: (state: RealtimeClientState) => void;
  private onFunctionCallCallback?: (call: RealtimeFunctionCall) => void;
  private onTranscriptCallback?: (transcript: string, isFinal: boolean) => void;
  private onTextResponseCallback?: (text: string, isFinal: boolean) => void;
  private onErrorCallback?: (error: Error) => void;
  private onRecordingTimeUpdateCallback?: (timeLeft: number) => void;

  /**
   * Configura listener para cambios de estado
   */
  onStateChange(callback: (state: RealtimeClientState) => void): void {
    this.onStateChangeCallback = callback;
  }

  /**
   * Configura listener para function calls de OpenAI
   */
  onFunctionCall(callback: (call: RealtimeFunctionCall) => void): void {
    this.onFunctionCallCallback = callback;
  }

  /**
   * Configura listener para transcripciones
   */
  onTranscript(callback: (transcript: string, isFinal: boolean) => void): void {
    this.onTranscriptCallback = callback;
  }

  /**
   * Configura listener para respuestas de texto
   */
  onTextResponse(callback: (text: string, isFinal: boolean) => void): void {
    this.onTextResponseCallback = callback;
  }

  /**
   * Configura listener para errores
   */
  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  /**
   * Configura listener para actualizaciones del tiempo de grabación
   */
  onRecordingTimeUpdate(callback: (timeLeft: number) => void): void {
    this.onRecordingTimeUpdateCallback = callback;
  }

  /**
   * Establece conexión WebRTC con OpenAI Realtime API
   */
  async connect(config: RealtimeSessionConfig): Promise<void> {
    try {
      this.setState('connecting');

      // 1. Crear RTCPeerConnection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      // 2. Capturar audio del micrófono
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 3. Agregar track de audio al peer connection
      this.mediaStream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, this.mediaStream!);
      });

      // 4. Crear DataChannel para eventos
      this.dataChannel = this.peerConnection.createDataChannel('oai-events');
      this.setupDataChannelListeners();

      // 5. Crear offer SDP
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // 6. Enviar offer a OpenAI y obtener answer
      const answer = await this.exchangeSDPWithOpenAI(
        config.ephemeralToken,
        offer.sdp!
      );

      // 7. Establecer remote description con el answer
      await this.peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: answer,
      });

      // 8. Esperar a que DataChannel esté abierto
      await this.waitForDataChannelOpen();

      // 9. Configurar sesión (tools, VAD, modalities)
      this.sendSessionUpdate(config);

      // 10. Establecer estado ready - esperando que el usuario hable
      this.setState('ready');

      // Nota: La grabación se iniciará automáticamente cuando el VAD detecte voz,
      // o puede iniciarse manualmente con startRecordingManually()

    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Intercambia SDP offer/answer con OpenAI
   */
  private async exchangeSDPWithOpenAI(
    ephemeralToken: string,
    offer: string
  ): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/realtime', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ephemeralToken}`,
        'Content-Type': 'application/sdp',
      },
      body: offer,
    });

    if (!response.ok) {
      throw new Error(`OpenAI SDP exchange failed: ${response.statusText}`);
    }

    return await response.text();
  }

  /**
   * Espera a que el DataChannel esté abierto
   */
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

  /**
   * Configura listeners del DataChannel para eventos de OpenAI
   */
  private setupDataChannelListeners(): void {
    if (!this.dataChannel) return;

    this.dataChannel.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleServerEvent(data);
      } catch (error) {
        console.error('Error parsing DataChannel message:', error);
      }
    });

    this.dataChannel.addEventListener('error', (event) => {
      this.handleError(new Error('DataChannel error'));
    });

    this.dataChannel.addEventListener('close', () => {
      console.log('DataChannel closed');
    });
  }

  /**
   * Maneja eventos recibidos del servidor OpenAI
   */
  private handleServerEvent(event: any): void {
    switch (event.type) {
      case 'input_audio_buffer.speech_started':
        // VAD detectó que el usuario empezó a hablar
        this.startRecording();
        break;

      case 'input_audio_buffer.speech_stopped':
        // VAD detectó que el usuario dejó de hablar (auto-commit)
        // El commit se maneja automáticamente por el VAD
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // Transcripción completa del audio del usuario
        if (this.onTranscriptCallback) {
          this.onTranscriptCallback(event.transcript, true);
        }
        this.setState('processing');
        break;

      case 'conversation.item.input_audio_transcription.delta':
        // Transcripción parcial (en vivo)
        if (this.onTranscriptCallback) {
          this.onTranscriptCallback(event.delta, false);
        }
        break;

      case 'response.function_call_arguments.done':
        // OpenAI quiere llamar una función
        this.setState('executing');
        if (this.onFunctionCallCallback) {
          this.onFunctionCallCallback({
            callId: event.call_id,
            name: event.name,
            arguments: JSON.parse(event.arguments),
          });
        }
        break;

      case 'response.text.delta':
        // Respuesta de texto incremental
        if (this.onTextResponseCallback) {
          this.onTextResponseCallback(event.delta, false);
        }
        break;

      case 'response.text.done':
        // Respuesta de texto completa
        if (this.onTextResponseCallback) {
          this.onTextResponseCallback(event.text, true);
        }
        break;

      case 'error':
        this.handleError(new Error(event.error?.message || 'OpenAI error'));
        break;

      default:
        // Log otros eventos para debugging
        console.log('OpenAI event:', event.type);
    }
  }

  /**
   * Envía actualización de sesión con configuración
   */
  private sendSessionUpdate(config: RealtimeSessionConfig): void {
    this.sendEvent({
      type: 'session.update',
      session: {
        modalities: ['text'],  // SOLO texto de salida, sin TTS
        instructions: config.systemInstructions || '',
        voice: 'alloy',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.8,  // Aumentado para reducir sensibilidad al ruido
          prefix_padding_ms: 500,  // Más contexto antes de la voz
          silence_duration_ms: 1000,  // Más tiempo de silencio para confirmar fin
        },
        tools: config.tools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_response_output_tokens: 150,
      },
    });
  }

  /**
   * Inicia grabación con timer de 15 segundos
   * Puede ser llamado automáticamente por VAD o manualmente
   */
  private startRecording(): void {
    if (this.state === 'recording') return; // Ya está grabando
    
    this.setState('recording');
    this.recordingStartTime = Date.now();

    // Timer que actualiza el tiempo restante cada segundo
    const updateInterval = setInterval(() => {
      if (!this.recordingStartTime) {
        clearInterval(updateInterval);
        return;
      }

      const elapsed = Date.now() - this.recordingStartTime;
      const timeLeft = Math.max(0, 15 - Math.floor(elapsed / 1000));

      if (this.onRecordingTimeUpdateCallback) {
        this.onRecordingTimeUpdateCallback(timeLeft);
      }
    }, 1000);

    // Timeout de 15 segundos (hard limit)
    this.recordingTimer = setTimeout(() => {
      clearInterval(updateInterval);
      this.stopRecording('timeout');
    }, 15000);
  }

  /**
   * Detiene la grabación
   */
  private stopRecording(reason: 'timeout' | 'manual' | 'vad'): void {
    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
      this.recordingTimer = null;
    }
    this.recordingStartTime = null;

    // Commit audio buffer para que OpenAI lo procese
    this.sendEvent({
      type: 'input_audio_buffer.commit',
    });

    // Solicitar respuesta
    this.sendEvent({
      type: 'response.create',
    });

    this.setState('processing');
  }

  /**
   * Envía resultado de function call a OpenAI
   */
  sendFunctionResult(callId: string, result: any): void {
    this.sendEvent({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(result),
      },
    });

    // Solicitar que genere respuesta basada en el resultado
    this.sendEvent({
      type: 'response.create',
    });
  }

  /**
   * Envía evento por el DataChannel
   */
  private sendEvent(event: any): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.warn('DataChannel not open, cannot send event');
      return;
    }

    this.dataChannel.send(JSON.stringify(event));
  }

  /**
   * Fuerza el commit del audio buffer actual
   * Útil cuando el usuario quiere enviar manualmente sin esperar al VAD
   */
  forceCommitAudio(): void {
    if (this.state !== 'recording') {
      console.warn('No se puede hacer commit: no hay grabación activa');
      return;
    }

    this.stopRecording('manual');
  }

  /**
   * Desconecta y limpia todos los recursos
   */
  disconnect(): void {
    // Detener grabación si está activa
    if (this.recordingTimer) {
      clearTimeout(this.recordingTimer);
      this.recordingTimer = null;
    }

    // Cerrar DataChannel
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    // Cerrar tracks de audio
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    // Cerrar peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.setState('idle');
  }

  /**
   * Obtiene el estado actual
   */
  getState(): RealtimeClientState {
    return this.state;
  }

  /**
   * Establece el estado y notifica a listeners
   */
  private setState(newState: RealtimeClientState): void {
    if (this.state !== newState) {
      this.state = newState;
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(newState);
      }
    }
  }

  /**
   * Maneja errores y notifica a listeners
   */
  private handleError(error: Error): void {
    console.error('RealtimeClient error:', error);
    this.setState('error');
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }
}
