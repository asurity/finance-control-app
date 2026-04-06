/**
 * VoiceStateMachine — State machine centralizado para el sistema de voz
 * 
 * Principios:
 * - Estado inmutable (discriminated union)
 * - Transiciones explícitas y predecibles
 * - Fácil de debuggear y testear
 * - Fuente única de verdad
 */

import type { VoiceError } from './VoiceErrorHandler';

/**
 * Estados posibles del sistema de voz (discriminated union)
 */
export type VoiceState =
  | { status: 'idle' }
  | { status: 'connecting' }
  | { status: 'ready' }
  | { status: 'recording'; transcript: string; timeLeft: number }
  | { status: 'processing'; transcript: string }
  | { status: 'executing'; toolName: string; toolLabel: string }
  | { status: 'responding'; response: string }
  | { status: 'error'; error: VoiceError };

/**
 * Eventos que pueden disparar transiciones de estado
 */
export type VoiceEvent =
  | { type: 'CONNECT' }
  | { type: 'CONNECTED' }
  | { type: 'START_RECORDING' }
  | { type: 'TRANSCRIPT_UPDATE'; transcript: string; timeLeft: number }
  | { type: 'STOP_RECORDING'; transcript: string }
  | { type: 'FUNCTION_CALL'; toolName: string; toolLabel: string }
  | { type: 'RESPONSE'; text: string }
  | { type: 'READY' }
  | { type: 'ERROR'; error: VoiceError }
  | { type: 'DISCONNECT' };

/**
 * State machine para gestionar las transiciones del sistema de voz
 */
export class VoiceStateMachine {
  private state: VoiceState = { status: 'idle' };
  private listeners: Array<(state: VoiceState) => void> = [];

  /**
   * Obtiene el estado actual
   */
  getState(): VoiceState {
    return this.state;
  }

  /**
   * Se suscribe a cambios de estado
   * @returns Función para desuscribirse
   */
  subscribe(listener: (state: VoiceState) => void): () => void {
    this.listeners.push(listener);
    
    // Retornar función para desuscribirse
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Envía un evento al state machine
   * Si el evento causa una transición, notifica a todos los listeners
   */
  send(event: VoiceEvent): void {
    const nextState = this.transition(this.state, event);
    
    // Solo actualizar si el estado cambió
    if (nextState !== this.state) {
      console.log(`[VoiceStateMachine] ${this.state.status} + ${event.type} → ${nextState.status}`);
      this.state = nextState;
      
      // Notificar a todos los listeners
      this.listeners.forEach(listener => listener(this.state));
    }
  }

  /**
   * Función de transición pura
   * Define todas las transiciones válidas del state machine
   */
  private transition(state: VoiceState, event: VoiceEvent): VoiceState {
    switch (state.status) {
      case 'idle':
        if (event.type === 'CONNECT') {
          return { status: 'connecting' };
        }
        break;

      case 'connecting':
        if (event.type === 'CONNECTED') {
          return { status: 'ready' };
        }
        if (event.type === 'ERROR') {
          return { status: 'error', error: event.error };
        }
        break;

      case 'ready':
        if (event.type === 'START_RECORDING') {
          return { status: 'recording', transcript: '', timeLeft: 15 };
        }
        if (event.type === 'DISCONNECT') {
          return { status: 'idle' };
        }
        break;

      case 'recording':
        if (event.type === 'TRANSCRIPT_UPDATE') {
          return {
            status: 'recording',
            transcript: event.transcript,
            timeLeft: event.timeLeft,
          };
        }
        if (event.type === 'STOP_RECORDING') {
          return { status: 'processing', transcript: event.transcript };
        }
        if (event.type === 'ERROR') {
          return { status: 'error', error: event.error };
        }
        break;

      case 'processing':
        if (event.type === 'FUNCTION_CALL') {
          return {
            status: 'executing',
            toolName: event.toolName,
            toolLabel: event.toolLabel,
          };
        }
        if (event.type === 'RESPONSE') {
          return { status: 'responding', response: event.text };
        }
        if (event.type === 'ERROR') {
          return { status: 'error', error: event.error };
        }
        break;

      case 'executing':
        if (event.type === 'RESPONSE') {
          return { status: 'responding', response: event.text };
        }
        if (event.type === 'ERROR') {
          return { status: 'error', error: event.error };
        }
        break;

      case 'responding':
        if (event.type === 'READY') {
          return { status: 'ready' };
        }
        break;

      case 'error':
        if (event.type === 'READY') {
          return { status: 'ready' };
        }
        if (event.type === 'DISCONNECT') {
          return { status: 'idle' };
        }
        break;
    }

    // Transición no válida - mantener estado actual
    return state;
  }

  /**
   * Resetea el state machine a idle
   */
  reset(): void {
    this.state = { status: 'idle' };
    this.listeners.forEach(listener => listener(this.state));
  }
}
