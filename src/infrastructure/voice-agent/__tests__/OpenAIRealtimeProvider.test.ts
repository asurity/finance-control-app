/**
 * Tests para OpenAIRealtimeProvider
 * FASE 7: Tests del sistema de voz conversacional
 *
 * Testea: interface compliance, estado, listeners, push-to-talk,
 * manejo de eventos del datachannel y transiciones de estado.
 */

import { OpenAIRealtimeProvider } from '../OpenAIRealtimeProvider';
import type { AIProviderState, AIFunctionCall } from '@/domain/ports/IAIRealtimeProvider';

// Mock browser APIs
const mockMediaStreamTrack = { stop: jest.fn(), kind: 'audio', enabled: true };
const mockMediaStream = {
  getTracks: jest.fn(() => [mockMediaStreamTrack]),
  getAudioTracks: jest.fn(() => [mockMediaStreamTrack]),
};

const mockDataChannel = {
  readyState: 'open',
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
};

const mockPeerConnection = {
  createDataChannel: jest.fn(() => mockDataChannel),
  addTrack: jest.fn(),
  createOffer: jest.fn().mockResolvedValue({ sdp: 'mock-offer', type: 'offer' }),
  setLocalDescription: jest.fn(),
  setRemoteDescription: jest.fn(),
  close: jest.fn(),
  ontrack: null as any,
};

global.RTCPeerConnection = jest.fn(() => mockPeerConnection) as any;

Object.defineProperty(global, 'navigator', {
  value: {
    mediaDevices: {
      getUserMedia: jest.fn(() => Promise.resolve(mockMediaStream)),
    },
  },
  writable: true,
  configurable: true,
});

global.fetch = jest.fn(() =>
  Promise.resolve({ ok: true, text: () => Promise.resolve('mock-sdp-answer') })
) as any;

describe('OpenAIRealtimeProvider', () => {
  let provider: OpenAIRealtimeProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    provider = new OpenAIRealtimeProvider();
    mockMediaStreamTrack.enabled = true;

    // Auto-resolve DataChannel open
    mockDataChannel.addEventListener.mockImplementation((event: string, callback: () => void) => {
      if (event === 'open') setTimeout(callback, 0);
    });
  });

  afterEach(() => {
    provider.disconnect();
    jest.useRealTimers();
  });

  describe('Estado inicial', () => {
    it('debe iniciar en estado idle', () => {
      expect(provider.getState()).toBe('idle');
    });
  });

  describe('Registro de listeners', () => {
    it('debe registrar onStateChange', () => {
      const cb = jest.fn();
      provider.onStateChange(cb);
      expect(provider['onStateChangeCallback']).toBe(cb);
    });

    it('debe registrar onFunctionCall', () => {
      const cb = jest.fn();
      provider.onFunctionCall(cb);
      expect(provider['onFunctionCallCallback']).toBe(cb);
    });

    it('debe registrar onTranscript', () => {
      const cb = jest.fn();
      provider.onTranscript(cb);
      expect(provider['onTranscriptCallback']).toBe(cb);
    });

    it('debe registrar onTextResponse', () => {
      const cb = jest.fn();
      provider.onTextResponse(cb);
      expect(provider['onTextResponseCallback']).toBe(cb);
    });

    it('debe registrar onAudioResponse', () => {
      const cb = jest.fn();
      provider.onAudioResponse(cb);
      expect(provider['onAudioResponseCallback']).toBe(cb);
    });

    it('debe registrar onError', () => {
      const cb = jest.fn();
      provider.onError(cb);
      expect(provider['onErrorCallback']).toBe(cb);
    });

    it('debe registrar onRecordingTimeUpdate', () => {
      const cb = jest.fn();
      provider.onRecordingTimeUpdate(cb);
      expect(provider['onRecordingTimeUpdateCallback']).toBe(cb);
    });
  });

  describe('connect', () => {
    it('debe crear RTCPeerConnection', async () => {
      await provider.connect({ ephemeralToken: 'tok', tools: [] });
      expect(global.RTCPeerConnection).toHaveBeenCalled();
    });

    it('debe solicitar getUserMedia con audio', async () => {
      await provider.connect({ ephemeralToken: 'tok', tools: [] });
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    });

    it('debe mutear audio tracks inicialmente (push-to-talk)', async () => {
      await provider.connect({ ephemeralToken: 'tok', tools: [] });
      // El track debería haber sido seteado a disabled
      expect(mockMediaStreamTrack.enabled).toBe(false);
    });

    it('debe transicionar a ready después de conectar', async () => {
      const onState = jest.fn();
      provider.onStateChange(onState);
      await provider.connect({ ephemeralToken: 'tok', tools: [] });
      const states = onState.mock.calls.map((c: any[]) => c[0]);
      expect(states).toContain('connecting');
      expect(states[states.length - 1]).toBe('ready');
    });

    it('debe enviar SDP exchange con OpenAI', async () => {
      await provider.connect({ ephemeralToken: 'test-token', tools: [] });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/realtime',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
    });

    it('debe enviar session.update con turn_detection: null', async () => {
      await provider.connect({ ephemeralToken: 'tok', tools: [] });
      const sentEvents = mockDataChannel.send.mock.calls.map((c: any[]) => JSON.parse(c[0]));
      const sessionUpdate = sentEvents.find((e: any) => e.type === 'session.update');
      expect(sessionUpdate).toBeDefined();
      expect(sessionUpdate.session.turn_detection).toBeNull();
    });
  });

  describe('disconnect', () => {
    it('debe limpiar todos los recursos', async () => {
      await provider.connect({ ephemeralToken: 'tok', tools: [] });
      provider.disconnect();

      expect(mockDataChannel.close).toHaveBeenCalled();
      expect(mockMediaStreamTrack.stop).toHaveBeenCalled();
      expect(mockPeerConnection.close).toHaveBeenCalled();
      expect(provider.getState()).toBe('idle');
    });
  });

  describe('Push-to-talk: startAudioCapture / stopAudioCaptureAndProcess', () => {
    beforeEach(async () => {
      await provider.connect({ ephemeralToken: 'tok', tools: [] });
      mockDataChannel.send.mockClear();
    });

    it('startAudioCapture debe unmutear tracks y poner estado recording', async () => {
      mockMediaStreamTrack.enabled = false;
      await provider.startAudioCapture();
      expect(mockMediaStreamTrack.enabled).toBe(true);
      expect(provider.getState()).toBe('recording');
    });

    it('stopAudioCaptureAndProcess debe mutear tracks', async () => {
      await provider.startAudioCapture();
      provider.stopAudioCaptureAndProcess();
      expect(mockMediaStreamTrack.enabled).toBe(false);
    });

    it('stopAudioCaptureAndProcess debe enviar commit + response.create', async () => {
      await provider.startAudioCapture();
      mockDataChannel.send.mockClear();
      provider.stopAudioCaptureAndProcess();

      const events = mockDataChannel.send.mock.calls.map((c: any[]) => JSON.parse(c[0]));
      expect(events.map((e: any) => e.type)).toContain('input_audio_buffer.commit');
      expect(events.map((e: any) => e.type)).toContain('response.create');
    });

    it('stopAudioCaptureAndProcess debe transicionar a processing', async () => {
      await provider.startAudioCapture();
      provider.stopAudioCaptureAndProcess();
      expect(provider.getState()).toBe('processing');
    });

    it('startAudioCapture sin conexión debe lanzar error', async () => {
      provider.disconnect();
      await expect(provider.startAudioCapture()).rejects.toThrow('No hay conexión activa');
    });
  });

  describe('sendFunctionResult', () => {
    beforeEach(async () => {
      await provider.connect({ ephemeralToken: 'tok', tools: [] });
      mockDataChannel.send.mockClear();
    });

    it('debe enviar conversation.item.create + response.create', () => {
      provider.sendFunctionResult('call_123', { success: true, message: 'ok' });

      const events = mockDataChannel.send.mock.calls.map((c: any[]) => JSON.parse(c[0]));
      const itemCreate = events.find((e: any) => e.type === 'conversation.item.create');
      const responseCreate = events.find((e: any) => e.type === 'response.create');

      expect(itemCreate).toBeDefined();
      expect(itemCreate.item.call_id).toBe('call_123');
      expect(JSON.parse(itemCreate.item.output)).toEqual({ success: true, message: 'ok' });
      expect(responseCreate).toBeDefined();
    });
  });

  describe('handleServerEvent (state transitions)', () => {
    let onState: jest.Mock;
    let onText: jest.Mock;
    let onTranscript: jest.Mock;
    let onFunctionCall: jest.Mock;
    let onError: jest.Mock;

    // Helper to simulate datachannel message
    function simulateEvent(event: Record<string, unknown>) {
      // Get the message handler from addEventListener calls
      const msgHandler = mockDataChannel.addEventListener.mock.calls.find(
        (c: any[]) => c[0] === 'message',
      )?.[1];
      if (msgHandler) {
        msgHandler({ data: JSON.stringify(event) });
      }
    }

    beforeEach(async () => {
      onState = jest.fn();
      onText = jest.fn();
      onTranscript = jest.fn();
      onFunctionCall = jest.fn();
      onError = jest.fn();

      provider.onStateChange(onState);
      provider.onTextResponse(onText);
      provider.onTranscript(onTranscript);
      provider.onFunctionCall(onFunctionCall);
      provider.onError(onError);

      await provider.connect({ ephemeralToken: 'tok', tools: [] });
      onState.mockClear();
    });

    it('response.text.done debe llamar onTextResponse con isFinal=true', () => {
      simulateEvent({ type: 'response.text.done', text: 'Hola' });
      expect(onText).toHaveBeenCalledWith('Hola', true);
    });

    it('response.text.delta debe llamar onTextResponse con isFinal=false', () => {
      simulateEvent({ type: 'response.text.delta', delta: 'Ho' });
      expect(onText).toHaveBeenCalledWith('Ho', false);
    });

    it('response.audio_transcript.done debe llamar onTextResponse con isFinal=true', () => {
      simulateEvent({ type: 'response.audio_transcript.done', transcript: 'Audio text' });
      expect(onText).toHaveBeenCalledWith('Audio text', true);
    });

    it('response.audio_transcript.delta debe llamar onTextResponse con isFinal=false', () => {
      simulateEvent({ type: 'response.audio_transcript.delta', delta: 'Aud' });
      expect(onText).toHaveBeenCalledWith('Aud', false);
    });

    it('conversation.item.input_audio_transcription.completed debe llamar onTranscript', () => {
      simulateEvent({
        type: 'conversation.item.input_audio_transcription.completed',
        transcript: 'Gasté 15 mil',
      });
      expect(onTranscript).toHaveBeenCalledWith('Gasté 15 mil', true);
    });

    it('response.function_call_arguments.done debe llamar onFunctionCall', () => {
      simulateEvent({
        type: 'response.function_call_arguments.done',
        call_id: 'c1',
        name: 'create_expense',
        arguments: '{"amount":15000}',
      });
      expect(onFunctionCall).toHaveBeenCalledWith({
        callId: 'c1',
        name: 'create_expense',
        arguments: { amount: 15000 },
      });
    });

    it('response.done debe transicionar de processing a ready', async () => {
      // Put provider in processing state
      await provider.startAudioCapture();
      provider.stopAudioCaptureAndProcess();
      onState.mockClear();

      simulateEvent({ type: 'response.done' });
      expect(onState).toHaveBeenCalledWith('ready');
    });

    it('response.done debe transicionar de executing a ready', async () => {
      // Simulate function call (sets state to executing)
      simulateEvent({
        type: 'response.function_call_arguments.done',
        call_id: 'c1',
        name: 'test',
        arguments: '{}',
      });
      onState.mockClear();

      simulateEvent({ type: 'response.done' });
      expect(onState).toHaveBeenCalledWith('ready');
    });

    it('error debe llamar onError callback', () => {
      simulateEvent({ type: 'error', error: { message: 'test error' } });
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'test error' }));
    });
  });

  describe('Recording timer', () => {
    it('debe emitir time updates durante grabación', async () => {
      const onTimeUpdate = jest.fn();
      provider.onRecordingTimeUpdate(onTimeUpdate);
      await provider.connect({ ephemeralToken: 'tok', tools: [] });
      await provider.startAudioCapture();

      jest.advanceTimersByTime(3000);

      expect(onTimeUpdate).toHaveBeenCalled();
      // El timer emite cada segundo, con valores decrecientes
      const lastCall = onTimeUpdate.mock.calls[onTimeUpdate.mock.calls.length - 1][0];
      expect(lastCall).toBeLessThan(15);
    });

    it('debe detener timer al parar grabación', async () => {
      const onTimeUpdate = jest.fn();
      provider.onRecordingTimeUpdate(onTimeUpdate);
      await provider.connect({ ephemeralToken: 'tok', tools: [] });
      await provider.startAudioCapture();
      provider.stopAudioCaptureAndProcess();
      onTimeUpdate.mockClear();

      jest.advanceTimersByTime(5000);

      // No debería haber más updates después de parar
      expect(onTimeUpdate).not.toHaveBeenCalled();
    });
  });
});
