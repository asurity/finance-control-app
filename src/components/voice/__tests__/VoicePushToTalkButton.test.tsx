/**
 * Tests para VoicePushToTalkButton
 * FASE 7: Tests del sistema de voz conversacional
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VoicePushToTalkButton } from '../VoicePushToTalkButton';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Mic: (props: any) => React.createElement('svg', { 'data-testid': 'mic-icon', ...props }),
  Loader2: (props: any) => React.createElement('svg', { 'data-testid': 'loader-icon', ...props }),
}));

describe('VoicePushToTalkButton', () => {
  const defaultProps = {
    state: 'ready' as const,
    recordingTimeLeft: 15,
    onStartRecording: jest.fn(),
    onStopRecording: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Renderizado', () => {
    it('muestra ícono de micrófono en estado ready', () => {
      render(React.createElement(VoicePushToTalkButton, defaultProps));
      expect(screen.getByTestId('mic-icon')).toBeInTheDocument();
    });

    it('muestra ícono de loader en estado connecting', () => {
      render(React.createElement(VoicePushToTalkButton, { ...defaultProps, state: 'connecting' as const }));
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });

    it('muestra ícono de loader en estado processing', () => {
      render(React.createElement(VoicePushToTalkButton, { ...defaultProps, state: 'processing' as const }));
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });

    it('muestra ícono de loader en estado executing', () => {
      render(React.createElement(VoicePushToTalkButton, { ...defaultProps, state: 'executing' as const }));
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });
  });

  describe('Aria labels', () => {
    it('label por defecto indica mantener presionado', () => {
      render(React.createElement(VoicePushToTalkButton, defaultProps));
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Mantén presionado para hablar');
    });

    it('label muestra tiempo restante durante grabación', () => {
      render(React.createElement(VoicePushToTalkButton, { ...defaultProps, state: 'recording' as const, recordingTimeLeft: 12 }));
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Escuchando... 12s');
    });

    it('label indica conectando', () => {
      render(React.createElement(VoicePushToTalkButton, { ...defaultProps, state: 'connecting' as const }));
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Conectando...');
    });

    it('label indica procesando', () => {
      render(React.createElement(VoicePushToTalkButton, { ...defaultProps, state: 'processing' as const }));
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Procesando...');
    });

    it('label indica ejecutando', () => {
      render(React.createElement(VoicePushToTalkButton, { ...defaultProps, state: 'executing' as const }));
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Ejecutando...');
    });
  });

  describe('Eventos pointer', () => {
    it('pointerDown llama onStartRecording', () => {
      render(React.createElement(VoicePushToTalkButton, defaultProps));
      fireEvent.pointerDown(screen.getByRole('button'));
      expect(defaultProps.onStartRecording).toHaveBeenCalledTimes(1);
    });

    it('pointerUp llama onStopRecording después de pointerDown', () => {
      render(React.createElement(VoicePushToTalkButton, defaultProps));
      const btn = screen.getByRole('button');
      fireEvent.pointerDown(btn);
      fireEvent.pointerUp(btn);
      expect(defaultProps.onStopRecording).toHaveBeenCalledTimes(1);
    });

    it('pointerLeave llama onStopRecording después de pointerDown', () => {
      render(React.createElement(VoicePushToTalkButton, defaultProps));
      const btn = screen.getByRole('button');
      fireEvent.pointerDown(btn);
      fireEvent.pointerLeave(btn);
      expect(defaultProps.onStopRecording).toHaveBeenCalledTimes(1);
    });

    it('pointerUp sin previo pointerDown no llama onStopRecording', () => {
      render(React.createElement(VoicePushToTalkButton, defaultProps));
      fireEvent.pointerUp(screen.getByRole('button'));
      expect(defaultProps.onStopRecording).not.toHaveBeenCalled();
    });
  });

  describe('Disabled', () => {
    it('no permite pointerDown cuando disabled', () => {
      render(React.createElement(VoicePushToTalkButton, { ...defaultProps, disabled: true }));
      fireEvent.pointerDown(screen.getByRole('button'));
      expect(defaultProps.onStartRecording).not.toHaveBeenCalled();
    });

    it('botón está deshabilitado cuando isBusy (connecting)', () => {
      render(React.createElement(VoicePushToTalkButton, { ...defaultProps, state: 'connecting' as const }));
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('botón está deshabilitado cuando isBusy (processing)', () => {
      render(React.createElement(VoicePushToTalkButton, { ...defaultProps, state: 'processing' as const }));
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('botón está deshabilitado cuando isBusy (executing)', () => {
      render(React.createElement(VoicePushToTalkButton, { ...defaultProps, state: 'executing' as const }));
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('botón NO está deshabilitado en estado ready', () => {
      render(React.createElement(VoicePushToTalkButton, defaultProps));
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });
});
