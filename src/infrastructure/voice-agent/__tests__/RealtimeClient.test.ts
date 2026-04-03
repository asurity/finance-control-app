/**
 * Tests para RealtimeClient
 * Fase 3: WebRTC Client
 */

import { RealtimeClient, RealtimeClientState } from '../RealtimeClient';
import { OpenAIToolDeclaration } from '../types';

// Mocks de APIs del navegador
const mockRTCPeerConnection = {
  createDataChannel: jest.fn(),
  addTrack: jest.fn(),
  createOffer: jest.fn(),
  setLocalDescription: jest.fn(),
  setRemoteDescription: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
};

const mockDataChannel = {
  readyState: 'open',
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
};

const mockMediaStream = {
  getTracks: jest.fn(() => [
    { stop: jest.fn(), kind: 'audio' },
  ]),
};

// Setup global mocks ANTES de importar RealtimeClient
global.RTCPeerConnection = jest.fn(function() {
  return mockRTCPeerConnection;
}) as any;

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
  Promise.resolve({
    ok: true,
    text: () => Promise.resolve('mock-sdp-answer'),
  })
) as any;

describe('RealtimeClient', () => {
  let client: RealtimeClient;
  const mockTools: OpenAIToolDeclaration[] = [
    {
      type: 'function',
      name: 'test_tool',
      description: 'Test',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    client = new RealtimeClient();
    
    // Reset mocks
    mockRTCPeerConnection.createDataChannel.mockReturnValue(mockDataChannel);
    mockRTCPeerConnection.createOffer.mockResolvedValue({
      sdp: 'mock-offer-sdp',
      type: 'offer',
    });
    
    // Reset navigator.mediaDevices.getUserMedia
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue(mockMediaStream);
    (mockMediaStream.getTracks as jest.Mock).mockReturnValue([
      { stop: jest.fn(), kind: 'audio' },
    ]);
  });

  afterEach(() => {
    client.disconnect();
  });

  describe('Estado inicial', () => {
    it('should start in idle state', () => {
      expect(client.getState()).toBe('idle');
    });
  });

  describe('Listeners', () => {
    it('should register state change listener', () => {
      const callback = jest.fn();
      client.onStateChange(callback);
      
      // Los callbacks se llaman internamente, no podemos testearlos directamente
      // sin conectar, pero podemos verificar que se registren
      expect(client['onStateChangeCallback']).toBe(callback);
    });

    it('should register function call listener', () => {
      const callback = jest.fn();
      client.onFunctionCall(callback);
      expect(client['onFunctionCallCallback']).toBe(callback);
    });

    it('should register transcript listener', () => {
      const callback = jest.fn();
      client.onTranscript(callback);
      expect(client['onTranscriptCallback']).toBe(callback);
    });

    it('should register text response listener', () => {
      const callback = jest.fn();
      client.onTextResponse(callback);
      expect(client['onTextResponseCallback']).toBe(callback);
    });

    it('should register error listener', () => {
      const callback = jest.fn();
      client.onError(callback);
      expect(client['onErrorCallback']).toBe(callback);
    });

    it('should register recording time update listener', () => {
      const callback = jest.fn();
      client.onRecordingTimeUpdate(callback);
      expect(client['onRecordingTimeUpdateCallback']).toBe(callback);
    });
  });

  describe('connect', () => {
    it('should create RTCPeerConnection', async () => {
      const onStateChange = jest.fn();
      client.onStateChange(onStateChange);

      // Mock DataChannel open event
      mockDataChannel.addEventListener.mockImplementation((event, callback) => {
        if (event === 'open') {
          setTimeout(callback, 0);
        }
      });

      await client.connect({
        ephemeralToken: 'test-token',
        tools: mockTools,
      });

      expect(global.RTCPeerConnection).toHaveBeenCalled();
    });

    it('should request getUserMedia for audio', async () => {
      mockDataChannel.addEventListener.mockImplementation((event, callback) => {
        if (event === 'open') {
          setTimeout(callback, 0);
        }
      });

      await client.connect({
        ephemeralToken: 'test-token',
        tools: mockTools,
      });

      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    });

    it('should create DataChannel', async () => {
      mockDataChannel.addEventListener.mockImplementation((event, callback) => {
        if (event === 'open') {
          setTimeout(callback, 0);
        }
      });

      await client.connect({
        ephemeralToken: 'test-token',
        tools: mockTools,
      });

      expect(mockRTCPeerConnection.createDataChannel).toHaveBeenCalledWith('oai-events');
    });

    it('should exchange SDP with OpenAI', async () => {
      mockDataChannel.addEventListener.mockImplementation((event, callback) => {
        if (event === 'open') {
          setTimeout(callback, 0);
        }
      });

      await client.connect({
        ephemeralToken: 'test-token',
        tools: mockTools,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/realtime',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/sdp',
          }),
        })
      );
    });

    it('should handle connection errors', async () => {
      const onError = jest.fn();
      client.onError(onError);

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(client.connect({
        ephemeralToken: 'test-token',
        tools: mockTools,
      })).rejects.toThrow();

      expect(client.getState()).toBe('error');
    });
  });

  describe('disconnect', () => {
    it('should close all connections and streams', async () => {
      mockDataChannel.addEventListener.mockImplementation((event, callback) => {
        if (event === 'open') {
          setTimeout(callback, 0);
        }
      });

      await client.connect({
        ephemeralToken: 'test-token',
        tools: mockTools,
      });

      client.disconnect();

      expect(mockDataChannel.close).toHaveBeenCalled();
      expect(mockRTCPeerConnection.close).toHaveBeenCalled();
      expect(mockMediaStream.getTracks()[0].stop).toHaveBeenCalled();
      expect(client.getState()).toBe('idle');
    });

    it('should be safe to call multiple times', () => {
      client.disconnect();
      client.disconnect();
      
      expect(client.getState()).toBe('idle');
    });
  });

  describe('sendFunctionResult', () => {
    it('should send function result via DataChannel', async () => {
      mockDataChannel.addEventListener.mockImplementation((event, callback) => {
        if (event === 'open') {
          setTimeout(callback, 0);
        }
      });

      await client.connect({
        ephemeralToken: 'test-token',
        tools: mockTools,
      });

      const result = { success: true, message: 'Done' };
      client.sendFunctionResult('call-123', result);

      expect(mockDataChannel.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"conversation.item.create"')
      );
      expect(mockDataChannel.send).toHaveBeenCalledWith(
        expect.stringContaining('"call_id":"call-123"')
      );
    });
  });
});
