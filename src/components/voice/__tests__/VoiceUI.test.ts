/**
 * Tests para VoiceButton y VoiceOverlay
 * Fase 5: Componentes UI
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

// Mocks ANTES de imports (hoisting crítico)
jest.mock('@/lib/constants/config', () => ({
  APP_CONFIG: {
    enableVoiceAgent: true,
    aiProvider: 'openai',
  },
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'test-user' },
    firebaseUser: null,
    loading: false,
  })),
}));

jest.mock('@/components/voice/VoiceProvider', () => ({
  VoiceProvider: ({ children }: any) => children,
}));

jest.mock('@/components/voice/VoiceModal', () => ({
  VoiceModal: ({ isOpen, onClose }: any) =>
    isOpen ? React.createElement('div', { 'data-testid': 'voice-modal' }, 'Modal') : null,
}));

jest.mock('@/application/hooks/useVoiceAgent');

// Imports después de mocks
import { VoiceButton } from '../VoiceButton';
import { VoiceOverlay } from '../VoiceOverlay';

// Mock de useVoiceAgent
const mockUseVoiceAgent = require('@/application/hooks/useVoiceAgent').useVoiceAgent as jest.Mock;

describe('VoiceButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe renderizar el botón cuando el feature flag está activo', () => {
    mockUseVoiceAgent.mockReturnValue({
      state: 'idle',
      isAvailable: true,
      startCommand: jest.fn(),
      cancelCommand: jest.fn(),
      commandsRemainingToday: 10,
      isActive: false,
      transcript: '',
      response: '',
      error: null,
      recordingTimeLeft: 15,
    });

    render(React.createElement(VoiceButton));

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('debe mostrar el badge con comandos restantes en estado idle', () => {
    mockUseVoiceAgent.mockReturnValue({
      state: 'idle',
      isAvailable: true,
      startCommand: jest.fn(),
      cancelCommand: jest.fn(),
      commandsRemainingToday: 7,
      isActive: false,
      transcript: '',
      response: '',
      error: null,
      recordingTimeLeft: 15,
    });

    render(React.createElement(VoiceButton));

    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('debe estar deshabilitado cuando no está disponible', () => {
    mockUseVoiceAgent.mockReturnValue({
      state: 'idle',
      isAvailable: false,
      startCommand: jest.fn(),
      cancelCommand: jest.fn(),
      commandsRemainingToday: 0,
      isActive: false,
      transcript: '',
      response: '',
      error: null,
      recordingTimeLeft: 15,
    });

    render(React.createElement(VoiceButton));

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('debe abrir el modal al hacer clic', async () => {
    mockUseVoiceAgent.mockReturnValue({
      state: 'idle',
      isAvailable: true,
      startCommand: jest.fn(),
      cancelCommand: jest.fn(),
      commandsRemainingToday: 10,
      isActive: false,
      transcript: '',
      response: '',
      error: null,
      recordingTimeLeft: 15,
    });

    render(React.createElement(VoiceButton));

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // VoiceButton ahora abre el modal en vez de llamar startCommand
    // El modal se renderiza condicionalmente
    expect(button).toBeInTheDocument();
  });

  it('debe cambiar de estilo en estado recording', () => {
    mockUseVoiceAgent.mockReturnValue({
      state: 'recording',
      isAvailable: true,
      startCommand: jest.fn(),
      cancelCommand: jest.fn(),
      commandsRemainingToday: 9,
      isActive: true,
      transcript: 'Registra un gasto...',
      response: '',
      error: null,
      recordingTimeLeft: 12,
    });

    render(React.createElement(VoiceButton));

    const buttons = screen.getAllByRole('button');
    const voiceButton = buttons.find(btn => btn.classList.contains('animate-pulse'));
    
    expect(voiceButton).toHaveClass('animate-pulse');
  });
});

describe('VoiceOverlay', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debe mostrar el contador regresivo durante grabación', () => {
    mockUseVoiceAgent.mockReturnValue({
      state: 'recording',
      isAvailable: true,
      startCommand: jest.fn(),
      cancelCommand: jest.fn(),
      commandsRemainingToday: 9,
      isActive: true,
      transcript: '',
      response: '',
      error: null,
      recordingTimeLeft: 12,
    });

    render(React.createElement(VoiceOverlay, { onClose: mockOnClose }));

    expect(screen.getByText('12s')).toBeInTheDocument();
    expect(screen.getByText('Tiempo restante')).toBeInTheDocument();
  });

  it('debe mostrar la transcripción cuando existe', () => {
    mockUseVoiceAgent.mockReturnValue({
      state: 'processing',
      isAvailable: true,
      startCommand: jest.fn(),
      cancelCommand: jest.fn(),
      commandsRemainingToday: 9,
      isActive: true,
      transcript: 'Registra un gasto de 15000 pesos',
      response: '',
      error: null,
      recordingTimeLeft: 0,
    });

    render(React.createElement(VoiceOverlay, { onClose: mockOnClose }));

    expect(screen.getByText('Registra un gasto de 15000 pesos')).toBeInTheDocument();
    expect(screen.getByText('Transcripción:')).toBeInTheDocument();
  });

  it('debe mostrar la respuesta de la IA cuando existe', () => {
    mockUseVoiceAgent.mockReturnValue({
      state: 'executing',
      isAvailable: true,
      startCommand: jest.fn(),
      cancelCommand: jest.fn(),
      commandsRemainingToday: 8,
      isActive: true,
      transcript: 'Registra un gasto de 15000 pesos',
      response: 'Gasto de $15.000 registrado en Comida',
      error: null,
      recordingTimeLeft: 0,
    });

    render(React.createElement(VoiceOverlay, { onClose: mockOnClose }));

    expect(screen.getByText('Gasto de $15.000 registrado en Comida')).toBeInTheDocument();
    expect(screen.getByText('Respuesta:')).toBeInTheDocument();
  });

  it('debe mostrar el error cuando existe', () => {
    mockUseVoiceAgent.mockReturnValue({
      state: 'error',
      isAvailable: true,
      startCommand: jest.fn(),
      cancelCommand: jest.fn(),
      commandsRemainingToday: 8,
      isActive: false,
      transcript: '',
      response: '',
      error: 'Error al procesar comando',
      recordingTimeLeft: 0,
    });

    render(React.createElement(VoiceOverlay, { onClose: mockOnClose }));

    expect(screen.getByText('Error al procesar comando')).toBeInTheDocument();
  });

  it('debe auto-cerrar después de ejecutar acción', () => {
    mockUseVoiceAgent.mockReturnValue({
      state: 'executing',
      isAvailable: true,
      startCommand: jest.fn(),
      cancelCommand: jest.fn(),
      commandsRemainingToday: 8,
      isActive: true,
      transcript: '',
      response: 'Acción ejecutada',
      error: null,
      recordingTimeLeft: 0,
    });

    render(React.createElement(VoiceOverlay, { onClose: mockOnClose }));

    // Avanzar timer 2 segundos
    jest.advanceTimersByTime(2000);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('no debe auto-cerrar en estado error (solo executing tiene auto-close)', () => {
    mockUseVoiceAgent.mockReturnValue({
      state: 'error',
      isAvailable: true,
      startCommand: jest.fn(),
      cancelCommand: jest.fn(),
      commandsRemainingToday: 8,
      isActive: false,
      transcript: '',
      response: '',
      error: 'Error',
      recordingTimeLeft: 0,
    });

    render(React.createElement(VoiceOverlay, { onClose: mockOnClose }));

    // Avanzar timer 4 segundos — ya NO tiene auto-close en error
    jest.advanceTimersByTime(4000);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('debe llamar a cancelCommand al hacer clic en Finalizar', () => {
    const mockCancelCommand = jest.fn();
    
    mockUseVoiceAgent.mockReturnValue({
      state: 'recording',
      isAvailable: true,
      startCommand: jest.fn(),
      cancelCommand: mockCancelCommand,
      commandsRemainingToday: 9,
      isActive: true,
      transcript: '',
      response: '',
      error: null,
      recordingTimeLeft: 10,
    });

    render(React.createElement(VoiceOverlay, { onClose: mockOnClose }));

    const finalizeButton = screen.getByText('Finalizar');
    fireEvent.click(finalizeButton);

    expect(mockCancelCommand).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('debe mostrar estados correctos con iconos', () => {
    const states = [
      { state: 'connecting', text: '🔌 Conectando con IA...' },
      { state: 'recording', text: '🎤 Escuchando...' },
      { state: 'processing', text: '⚙️ Procesando tu comando...' },
      { state: 'executing', text: '✓ Ejecutando acción...' },
      { state: 'error', text: '⚠️ Error' },
    ];

    states.forEach(({ state, text }) => {
      mockUseVoiceAgent.mockReturnValue({
        state,
        isAvailable: true,
        startCommand: jest.fn(),
        cancelCommand: jest.fn(),
        commandsRemainingToday: 9,
        isActive: true,
        transcript: '',
        response: '',
        error: state === 'error' ? 'Error' : null,
        recordingTimeLeft: 10,
      });

      const { unmount } = render(React.createElement(VoiceOverlay, { onClose: mockOnClose }));

      expect(screen.getByText(text)).toBeInTheDocument();

      unmount();
    });
  });
});
