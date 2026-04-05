/**
 * GeminiTextProvider — Implementación de IAIRealtimeProvider para Gemini API + Web Speech API
 * 
 * FASE 3: Provider completo con Web Speech API (STT/TTS) + HTTP REST (Gemini function calling)
 * 
 * Arquitectura:
 * - STT: Web Speech API (SpeechRecognition) - GRATIS
 * - Function Calling: Gemini 2.5 Flash-Lite vía HTTP POST - GRATIS (tier gratuito)
 * - TTS: Web Speech API (speechSynthesis) - GRATIS
 * 
 * Diferencias vs OpenAIRealtimeProvider:
 * - No usa WebRTC/DataChannel → Usa fetch() a /api/voice/gemini
 * - No usa MediaStream para TTS → Usa speechSynthesis
 * - Multi-turno manual con conversationParts[] → No hay sesión persistente en servidor
 */

import type {
  IAIRealtimeProvider,
  AIProviderState,
  AIFunctionCall,
  AISessionConfig,
  AIToolDeclaration,
} from '@/domain/ports/IAIRealtimeProvider';
import type { GeminiContentPart } from '@/app/api/voice/gemini/route';
import { VOICE_LIMITS } from './config';

// Web Speech API types
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

export class GeminiTextProvider implements IAIRealtimeProvider {
  private recognition: SpeechRecognition | null = null;
  private idToken: string | null = null;
  private tools: AIToolDeclaration[] = [];
  private conversationParts: GeminiContentPart[] = [];
  private turnIndex: number = 0;
  private pendingFunctionCalls: number = 0;
  private functionCallMap: Map<string, string> = new Map(); // callId -> functionName
  
  private recordingTimer: NodeJS.Timeout | null = null;
  private recordingIntervalTimer: ReturnType<typeof setInterval> | null = null;
  private recordingStartTime: number | null = null;
  private currentTranscript: string = '';
  
  private state: AIProviderState = 'idle';

  // Event callbacks
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
    // No usado en Gemini (speechSynthesis es directo)
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  onRecordingTimeUpdate(callback: (timeLeft: number) => void): void {
    this.onRecordingTimeUpdateCallback = callback;
  }

  // --- Private utility methods (used by public methods) ---

  private setState(newState: AIProviderState): void {
    if (this.state === newState) return;
    
    console.log(`[GeminiTextProvider] Estado: ${this.state} → ${newState}`);
    this.state = newState;

    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(newState);
    }

    // Si transicionamos a error, limpiar timers
    if (newState === 'error') {
      this.stopRecordingTimers();
    }
  }

  private handleError(error: Error): void {
    console.error('[GeminiTextProvider] Error:', error);
    this.setState('error');

    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }

    // Auto-recover a ready después de 2 segundos
    setTimeout(() => {
      if (this.state === 'error') {
        this.setState('ready');
      }
    }, 2000);
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

  private startRecordingTimer(): void {
    this.recordingStartTime = Date.now();
    const maxDuration = VOICE_LIMITS.maxInputDurationSeconds * 1000;

    // Timer para detener grabación automáticamente
    this.recordingTimer = setTimeout(() => {
      console.log('[GeminiTextProvider] Tiempo máximo de grabación alcanzado');
      this.stopAudioCaptureAndProcess();
    }, maxDuration);

    // Interval para actualizar UI con tiempo restante
    this.recordingIntervalTimer = setInterval(() => {
      if (!this.recordingStartTime) return;
      
      const elapsed = Date.now() - this.recordingStartTime;
      const timeLeft = Math.max(0, maxDuration - elapsed) / 1000;
      
      if (this.onRecordingTimeUpdateCallback) {
        this.onRecordingTimeUpdateCallback(timeLeft);
      }
    }, 100);
  }

  private setupRecognitionListeners(): void {
    if (!this.recognition) return;

    this.recognition.onresult = (event) => {
      const results = event.results;
      let transcript = '';
      let isFinal = false;

      // Concatenar todos los resultados
      for (let i = 0; i < results.length; i++) {
        transcript += results[i][0].transcript;
        if (results[i].isFinal) {
          isFinal = true;
        }
      }

      this.currentTranscript = transcript;

      // Emitir transcripción
      if (this.onTranscriptCallback) {
        this.onTranscriptCallback(transcript.trim(), isFinal);
      }

      // Si es final, procesar
      if (isFinal) {
        this.processTranscript(transcript.trim());
      }
    };

    this.recognition.onerror = (event) => {
      console.error('[GeminiTextProvider] Recognition error:', event.error);
      
      // Manejar errores específicos
      if (event.error === 'no-speech') {
        this.handleError(new Error('No se detectó audio. Intenta hablar más fuerte o verifica tu micrófono.'));
      } else if (event.error === 'audio-capture') {
        this.handleError(new Error('Error al capturar audio. Verifica que tu micrófono esté conectado.'));
      } else if (event.error === 'not-allowed') {
        this.handleError(new Error('Permiso de micrófono denegado.'));
      } else {
        this.handleError(new Error(`Error de reconocimiento de voz: ${event.error}`));
      }
    };

    this.recognition.onend = () => {
      // Recognition terminó - si aún estamos en recording y no hay transcript, error
      if (this.state === 'recording') {
        if (!this.currentTranscript || this.currentTranscript.trim().length === 0) {
          this.handleError(new Error('No se detectó audio. Intenta de nuevo.'));
        }
        // Si hay transcript, el procesamiento ya se disparó en onresult
      }
    };
  }

  async connect(config: AISessionConfig): Promise<void> {
    try {
      this.setState('connecting');

      // 1. Verificar soporte de Web Speech API
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionClass) {
        throw new Error(
          'Tu navegador no soporta reconocimiento de voz. Por favor usa Chrome, Edge o Safari.'
        );
      }

      // 2. Guardar token para requests HTTP
      this.idToken = config.ephemeralToken;
      this.tools = config.tools;

      // 3. Solicitar permiso de micrófono
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Detener stream inmediatamente (solo queríamos permiso)
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        throw new Error('Permiso de micrófono denegado. Habilita el micrófono para usar el comando de voz.');
      }

      // 4. Inicializar SpeechRecognition
      this.recognition = new SpeechRecognitionClass();
      this.recognition.lang = 'es-ES';
      this.recognition.continuous = false; // Una sola captura por push-to-talk
      this.recognition.interimResults = true; // Mostrar transcripción parcial
      this.recognition.maxAlternatives = 1;

      this.setupRecognitionListeners();

      // 5. Verificar soporte de speechSynthesis para TTS
      if (!window.speechSynthesis) {
        console.warn('[GeminiTextProvider] speechSynthesis no disponible. TTS deshabilitado.');
      } else {
        // Cargar voces (necesario en algunos navegadores)
        if (speechSynthesis.getVoices().length === 0) {
          await new Promise<void>((resolve) => {
            speechSynthesis.addEventListener('voiceschanged', () => resolve(), { once: true });
            // Timeout en caso de que nunca se dispare
            setTimeout(() => resolve(), 1000);
          });
        }
      }

      this.setState('ready');
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  disconnect(): void {
    this.stopRecordingTimers();
    this.pendingFunctionCalls = 0;
    this.conversationParts = [];
    this.turnIndex = 0;
    this.currentTranscript = '';
    this.functionCallMap.clear();

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        // Ignorar error si ya estaba detenido
      }
      this.recognition = null;
    }

    if (window.speechSynthesis) {
      speechSynthesis.cancel();
    }

    this.setState('idle');
  }

  async startAudioCapture(): Promise<void> {
    if (!this.recognition) {
      throw new Error('No hay conexión activa. Llama a connect() primero.');
    }

    if (this.state === 'recording') {
      console.warn('[GeminiTextProvider] Ya hay una grabación en curso');
      return;
    }

    this.currentTranscript = '';
    this.setState('recording');
    this.startRecordingTimer();

    try {
      this.recognition.start();
    } catch (error) {
      // Si ya estaba iniciado, ignorar
      if ((error as Error).message?.includes('already started')) {
        console.warn('[GeminiTextProvider] Recognition ya estaba iniciado');
      } else {
        throw error;
      }
    }
  }

  stopAudioCaptureAndProcess(): void {
    if (this.state !== 'recording') {
      console.warn('[GeminiTextProvider] stopAudioCaptureAndProcess llamado pero no estamos grabando');
      return;
    }

    this.stopRecordingTimers();

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.warn('[GeminiTextProvider] Error stopping recognition:', error);
      }
    }

    // El processing se maneja en el evento onresult del recognition
  }

  sendFunctionResult(callId: string, result: unknown): void {
    // Obtener el nombre de la función del mapa
    const functionName = this.functionCallMap.get(callId);
    if (!functionName) {
      console.error('[GeminiTextProvider] No se encontró función para callId:', callId);
      return;
    }

    // Agregar resultado de función a conversationParts
    this.conversationParts.push({
      role: 'user',
      parts: [{
        functionResponse: {
          name: functionName,
          response: { result },
        },
      }],
    });

    // Limpiar del mapa
    this.functionCallMap.delete(callId);

    this.pendingFunctionCalls = Math.max(0, this.pendingFunctionCalls - 1);

    // Si ya no hay function calls pendientes, solicitar nueva respuesta del modelo
    if (this.pendingFunctionCalls === 0) {
      this.continueConversationAfterFunctions();
    }
  }

  getState(): AIProviderState {
    return this.state;
  }

  // --- Private methods ---

  private async processTranscript(text: string): Promise<void> {
    if (!text || text.length === 0) {
      this.handleError(new Error('Transcripción vacía'));
      return;
    }

    this.setState('processing');

    try {
      // Agregar mensaje del usuario a conversationParts
      this.conversationParts.push({
        role: 'user',
        parts: [{ text }],
      });

      // Llamar al API de Gemini
      const response = await this.callGeminiAPI(text);

      // Parsear respuesta
      if (response.type === 'function_call' && response.functionCalls) {
        this.setState('executing');
        this.pendingFunctionCalls = response.functionCalls.length;

        // Guardar function calls en mapa (callId -> functionName)
        for (const fc of response.functionCalls) {
          this.functionCallMap.set(fc.callId, fc.name);
        }

        // Agregar function calls del modelo a conversationParts
        this.conversationParts.push({
          role: 'model',
          parts: response.functionCalls.map((fc: AIFunctionCall) => ({
            functionCall: {
              name: fc.name,
              args: fc.arguments,
            },
          })),
        });

        // Emitir cada function call
        for (const fc of response.functionCalls) {
          if (this.onFunctionCallCallback) {
            this.onFunctionCallCallback(fc);
          }
        }
      } else if (response.type === 'text' && response.textResponse) {
        // Agregar respuesta de texto del modelo a conversationParts
        this.conversationParts.push({
          role: 'model',
          parts: [{ text: response.textResponse }],
        });

        // Emitir texto
        if (this.onTextResponseCallback) {
          this.onTextResponseCallback(response.textResponse, true);
        }

        // Hablar con TTS
        this.speak(response.textResponse);

        this.transitionToReadyIfDone();
      } else {
        // Sin respuesta válida
        this.handleError(new Error('Respuesta inválida del modelo'));
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private async continueConversationAfterFunctions(): Promise<void> {
    try {
      this.setState('processing');

      // Llamar nuevamente al API con historial actualizado
      const response = await this.callGeminiAPI('', true);

      if (response.type === 'function_call' && response.functionCalls) {
        // Más function calls (composición)
        this.setState('executing');
        this.pendingFunctionCalls = response.functionCalls.length;

        // Guardar function calls en mapa
        for (const fc of response.functionCalls) {
          this.functionCallMap.set(fc.callId, fc.name);
        }

        this.conversationParts.push({
          role: 'model',
          parts: response.functionCalls.map((fc: AIFunctionCall) => ({
            functionCall: {
              name: fc.name,
              args: fc.arguments,
            },
          })),
        });
          
        for (const fc of response.functionCalls) {
          if (this.onFunctionCallCallback) {
            this.onFunctionCallCallback(fc);
          }
        }
      } else if (response.type === 'text' && response.textResponse) {
        // Respuesta final
        this.conversationParts.push({
          role: 'model',
          parts: [{ text: response.textResponse }],
        });

        if (this.onTextResponseCallback) {
          this.onTextResponseCallback(response.textResponse, true);
        }

        this.speak(response.textResponse);
        this.transitionToReadyIfDone();
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private async callGeminiAPI(text: string, isContinuation: boolean = false): Promise<any> {
    const response = await fetch('/api/voice/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.idToken}`,
      },
      body: JSON.stringify({
        text: isContinuation ? '' : text,
        conversationHistory: isContinuation ? this.conversationParts : this.conversationParts.slice(0, -1),
        turnIndex: this.turnIndex++,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API error: ${response.status}`);
    }

    return await response.json();
  }

  private speak(text: string): void {
    if (!text || text.length < 2) return;
    if (!window.speechSynthesis) {
      console.warn('[GeminiTextProvider] speechSynthesis no disponible');
      return;
    }

    // Cancelar cualquier síntesis anterior
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 1.1; // Ligeramente más rápido
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Seleccionar voz en español si está disponible
    const voices = speechSynthesis.getVoices();
    const spanishVoice = voices.find(v => 
      v.lang.startsWith('es') && v.lang.includes('ES')
    ) || voices.find(v => v.lang.startsWith('es'));
    
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.onend = () => {
      console.log('[GeminiTextProvider] TTS completed');
    };

    utterance.onerror = (event) => {
      console.error('[GeminiTextProvider] TTS error:', event.error);
    };

    speechSynthesis.speak(utterance);
  }

  private transitionToReadyIfDone(): void {
    if (this.pendingFunctionCalls === 0 && this.state !== 'ready') {
      this.setState('ready');
    }
  }
}
