/**
 * GeminiVoiceProvider — Implementación de IVoiceProvider para Gemini API + Web Speech API
 * 
 * Provider completo con Web Speech API (STT/TTS) + HTTP REST (Gemini function calling)
 * 
 * Arquitectura:
 * - STT: Web Speech API (SpeechRecognition) - GRATIS
 * - Function Calling: Gemini 2.5 Flash-Lite vía HTTP POST - GRATIS (tier gratuito)
 * - TTS: Web Speech API (speechSynthesis) - GRATIS
 * 
 * Diferencias vs OpenAIRealtimeProvider (deprecated):
 * - No usa WebRTC/DataChannel → Usa fetch() a /api/voice/gemini
 * - No usa MediaStream para TTS → Usa speechSynthesis
 * - Multi-turno manual con conversationParts[] → No hay sesión persistente en servidor
 */

import type {
  IVoiceProvider,
  VoiceProviderState,
  FunctionCall,
  VoiceSessionConfig,
  ToolDeclaration,
} from '@/domain/ports/IVoiceProvider';
import { VoiceErrorHandler, type VoiceError } from './VoiceErrorHandler';
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

export class GeminiVoiceProvider implements IVoiceProvider {
  private recognition: SpeechRecognition | null = null;
  private idToken: string | null = null;
  private tools: ToolDeclaration[] = [];
  private conversationParts: GeminiContentPart[] = [];
  private turnIndex: number = 0;
  private pendingFunctionCalls: number = 0;
  private functionCallMap: Map<string, string> = new Map(); // callId -> functionName
  
  private recordingTimer: NodeJS.Timeout | null = null;
  private recordingIntervalTimer: ReturnType<typeof setInterval> | null = null;
  private recordingStartTime: number | null = null;
  private currentTranscript: string = '';
  
  private state: VoiceProviderState = 'idle';

  // Event callbacks (sin isFinal en las firmas)
  private onStateChangeCallback?: (state: VoiceProviderState) => void;
  private onFunctionCallCallback?: (call: FunctionCall) => void;
  private onTranscriptCallback?: (transcript: string) => void;
  private onResponseCallback?: (text: string) => void;
  private onErrorCallback?: (error: VoiceError) => void;
  private onRecordingTimeUpdateCallback?: (timeLeft: number) => void;

  // --- Event listener setters (interfaz IVoiceProvider) ---

  onStateChange(callback: (state: VoiceProviderState) => void): void {
    this.onStateChangeCallback = callback;
  }

  onFunctionCall(callback: (call: FunctionCall) => void): void {
    this.onFunctionCallCallback = callback;
  }

  onTranscript(callback: (transcript: string) => void): void {
    this.onTranscriptCallback = callback;
  }

  onResponse(callback: (text: string) => void): void {
    this.onResponseCallback = callback;
  }

  onError(callback: (error: VoiceError) => void): void {
    this.onErrorCallback = callback;
  }

  onRecordingTimeUpdate(callback: (timeLeft: number) => void): void {
    this.onRecordingTimeUpdateCallback = callback;
  }

  // --- Private utility methods (used by public methods) ---

  private setState(newState: VoiceProviderState): void {
    if (this.state === newState) return;
    
    console.log(`[GeminiVoiceProvider] Estado: ${this.state} → ${newState}`);
    this.state = newState;

    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(newState);
    }

    // Si transicionamos a error, limpiar timers
    if (newState === 'error') {
      this.stopRecordingTimers();
    }
  }

  private handleError(error: VoiceError): void {
    console.error('[GeminiVoiceProvider] Error:', error);
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
      console.log('[GeminiVoiceProvider] Tiempo máximo de grabación alcanzado');
      this.stopRecording();
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

      // Emitir transcripción (sin parámetro isFinal en callback)
      if (this.onTranscriptCallback) {
        this.onTranscriptCallback(transcript.trim());
      }

      // Si es final, procesar
      if (isFinal) {
        this.processTranscript(transcript.trim());
      }
    };

    this.recognition.onerror = (event) => {
      console.error('[GeminiVoiceProvider] Recognition error:', event.error);
      
      // Convertir errores de recognition a Error estándar para VoiceErrorHandler
      let errorMessage: string;
      
      if (event.error === 'no-speech') {
        errorMessage = 'No se detectó audio. Intenta hablar más fuerte o verifica tu micrófono.';
      } else if (event.error === 'audio-capture') {
        errorMessage = 'Error al capturar audio. Verifica que tu micrófono esté conectado.';
      } else if (event.error === 'not-allowed') {
        errorMessage = 'Permission denied: micrófono bloqueado';
      } else {
        errorMessage = `Error de reconocimiento de voz: ${event.error}`;
      }
      
      const voiceError = VoiceErrorHandler.handle(new Error(errorMessage));
      this.handleError(voiceError);
    };

    this.recognition.onend = () => {
      // Recognition terminó - si aún estamos en recording y no hay transcript, error
      if (this.state === 'recording') {
        if (!this.currentTranscript || this.currentTranscript.trim().length === 0) {
          const error = VoiceErrorHandler.handle(new Error('No se detectó audio. Intenta de nuevo.'));
          this.handleError(error);
        }
        // Si hay transcript, el procesamiento ya se disparó en onresult
      }
    };
  }

  async connect(config: VoiceSessionConfig): Promise<void> {
    try {
      this.setState('connecting');

      // 1. Verificar soporte de Web Speech API
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionClass) {
        throw new Error('Tu navegador no soporta reconocimiento de voz. Por favor usa Chrome, Edge o Safari.');
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
        const permissionError = new Error('Permission denied: micrófono bloqueado');
        permissionError.name = 'NotAllowedError';
        throw permissionError;
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
        console.warn('[GeminiVoiceProvider] speechSynthesis no disponible. TTS deshabilitado.');
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
      const voiceError = VoiceErrorHandler.handle(error as Error);
      this.handleError(voiceError);
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

  async startRecording(): Promise<void> {
    if (!this.recognition) {
      throw new Error('Sesión expirada. No hay conexión activa.');
    }

    if (this.state === 'recording') {
      console.warn('[GeminiVoiceProvider] Ya hay una grabación en curso');
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
        console.warn('[GeminiVoiceProvider] Recognition ya estaba iniciado');
      } else {
        throw error;
      }
    }
  }

  stopRecording(): void {
    if (this.state !== 'recording') {
      console.warn('[GeminiVoiceProvider] stopRecording llamado pero no estamos grabando');
      return;
    }

    this.stopRecordingTimers();

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.warn('[GeminiVoiceProvider] Error stopping recognition:', error);
      }
    }

    // El processing se maneja en el evento onresult del recognition
  }

  sendFunctionResult(callId: string, result: unknown): void {
    // Obtener el nombre de la función del mapa
    const functionName = this.functionCallMap.get(callId);
    if (!functionName) {
      console.error('[GeminiVoiceProvider] No se encontró función para callId:', callId);
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

  getState(): VoiceProviderState {
    return this.state;
  }

  // --- Private methods ---

  private async processTranscript(text: string): Promise<void> {
    if (!text || text.length === 0) {
      const error = VoiceErrorHandler.handle(new Error('No se detectó audio'));
      this.handleError(error);
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
          parts: response.functionCalls.map((fc: FunctionCall) => ({
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

        // Emitir texto (sin isFinal)
        if (this.onResponseCallback) {
          this.onResponseCallback(response.textResponse);
        }

        // Hablar con TTS
        this.speak(response.textResponse);

        this.transitionToReadyIfDone();
      } else {
        // Sin respuesta válida
        const error = VoiceErrorHandler.handle(new Error('Respuesta inválida del modelo'));
        this.handleError(error);
      }
    } catch (error) {
      const voiceError = VoiceErrorHandler.handle(error as Error);
      this.handleError(voiceError);
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
          parts: response.functionCalls.map((fc: FunctionCall) => ({
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

        if (this.onResponseCallback) {
          this.onResponseCallback(response.textResponse);
        }

        this.speak(response.textResponse);
        this.transitionToReadyIfDone();
      }
    } catch (error) {
      const voiceError = VoiceErrorHandler.handle(error as Error);
      this.handleError(voiceError);
    }
  }

  private async callGeminiAPI(text: string, isContinuation: boolean = false): Promise<any> {
    // Cargar contexto pre-cargado de localStorage
    let context = null;
    try {
      const contextStr = localStorage.getItem('voice_context');
      if (contextStr) {
        context = JSON.parse(contextStr);
      }
    } catch (err) {
      console.warn('[GeminiVoiceProvider] Error cargando contexto:', err);
    }

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
        context, // Incluir contexto pre-cargado
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
      console.warn('[GeminiVoiceProvider] speechSynthesis no disponible');
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
      console.log('[GeminiVoiceProvider] TTS completed');
    };

    utterance.onerror = (event) => {
      console.error('[GeminiVoiceProvider] TTS error:', event.error);
    };

    speechSynthesis.speak(utterance);
  }

  private transitionToReadyIfDone(): void {
    if (this.pendingFunctionCalls === 0 && this.state !== 'ready') {
      this.setState('ready');
    }
  }
}
