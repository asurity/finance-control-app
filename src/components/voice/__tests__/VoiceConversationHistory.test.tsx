/**
 * Tests para VoiceConversationHistory
 * FASE 7: Tests del sistema de voz conversacional
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { VoiceConversationHistory, type ConversationMessage } from '../VoiceConversationHistory';

// Mock lucide-react
jest.mock('lucide-react', () => ({
  Volume2: (props: any) => React.createElement('svg', { 'data-testid': 'volume-icon', ...props }),
}));

const makeMessage = (
  role: 'user' | 'assistant',
  text: string,
  id?: string,
): ConversationMessage => ({
  id: id || `msg-${Math.random()}`,
  role,
  text,
  timestamp: new Date(),
});

describe('VoiceConversationHistory', () => {
  const defaultProps = {
    messages: [] as ConversationMessage[],
    isTranscribing: false,
    currentTranscript: '',
  };

  describe('Estado vacío', () => {
    it('muestra mensaje de instrucción cuando no hay mensajes', () => {
      render(React.createElement(VoiceConversationHistory, defaultProps));
      expect(
        screen.getByText(/mantén presionado el botón/i),
      ).toBeInTheDocument();
    });

    it('no muestra instrucción cuando hay mensajes', () => {
      render(
        React.createElement(VoiceConversationHistory, {
          ...defaultProps,
          messages: [makeMessage('user', 'Hola')],
        }),
      );
      expect(
        screen.queryByText(/mantén presionado el botón/i),
      ).not.toBeInTheDocument();
    });
  });

  describe('Renderizado de mensajes', () => {
    it('renderiza mensajes de usuario', () => {
      render(
        React.createElement(VoiceConversationHistory, {
          ...defaultProps,
          messages: [makeMessage('user', 'Gasté 5000 en comida')],
        }),
      );
      expect(screen.getByText('Gasté 5000 en comida')).toBeInTheDocument();
    });

    it('renderiza mensajes de asistente', () => {
      render(
        React.createElement(VoiceConversationHistory, {
          ...defaultProps,
          messages: [makeMessage('assistant', 'Listo, registré el gasto')],
        }),
      );
      expect(screen.getByText('Listo, registré el gasto')).toBeInTheDocument();
    });

    it('renderiza múltiples mensajes en orden', () => {
      const messages = [
        makeMessage('user', 'Primer mensaje', 'msg-1'),
        makeMessage('assistant', 'Respuesta', 'msg-2'),
        makeMessage('user', 'Segundo mensaje', 'msg-3'),
      ];
      render(
        React.createElement(VoiceConversationHistory, {
          ...defaultProps,
          messages,
        }),
      );
      expect(screen.getByText('Primer mensaje')).toBeInTheDocument();
      expect(screen.getByText('Respuesta')).toBeInTheDocument();
      expect(screen.getByText('Segundo mensaje')).toBeInTheDocument();
    });
  });

  describe('Transcripción en progreso', () => {
    it('muestra transcripción parcial con puntos suspensivos', () => {
      render(
        React.createElement(VoiceConversationHistory, {
          ...defaultProps,
          isTranscribing: true,
          currentTranscript: 'Gasté quince',
        }),
      );
      expect(screen.getByText('Gasté quince...')).toBeInTheDocument();
    });

    it('muestra indicador de animación cuando transcribe sin texto', () => {
      const { container } = render(
        React.createElement(VoiceConversationHistory, {
          ...defaultProps,
          isTranscribing: true,
          currentTranscript: '',
        }),
      );
      // Verifica que hay spans con animate-bounce (indicador de puntos)
      const bouncingDots = container.querySelectorAll('.animate-bounce');
      expect(bouncingDots.length).toBe(3);
    });

    it('no muestra estado vacío cuando está transcribiendo', () => {
      render(
        React.createElement(VoiceConversationHistory, {
          ...defaultProps,
          isTranscribing: true,
          currentTranscript: '',
        }),
      );
      expect(
        screen.queryByText(/mantén presionado el botón/i),
      ).not.toBeInTheDocument();
    });
  });

  describe('Indicador de habla de IA', () => {
    it('muestra indicador "Hablando..." en último mensaje de asistente', () => {
      render(
        React.createElement(VoiceConversationHistory, {
          ...defaultProps,
          messages: [makeMessage('assistant', 'Registrado')],
          isAISpeaking: true,
        }),
      );
      expect(screen.getByText('Hablando...')).toBeInTheDocument();
      expect(screen.getByTestId('volume-icon')).toBeInTheDocument();
    });

    it('no muestra indicador cuando IA no habla', () => {
      render(
        React.createElement(VoiceConversationHistory, {
          ...defaultProps,
          messages: [makeMessage('assistant', 'Registrado')],
          isAISpeaking: false,
        }),
      );
      expect(screen.queryByText('Hablando...')).not.toBeInTheDocument();
    });

    it('no muestra indicador en mensaje de usuario', () => {
      render(
        React.createElement(VoiceConversationHistory, {
          ...defaultProps,
          messages: [makeMessage('user', 'Hola')],
          isAISpeaking: true,
        }),
      );
      expect(screen.queryByText('Hablando...')).not.toBeInTheDocument();
    });
  });

  describe('Auto-scroll', () => {
    it('scrollRef existe en el contenedor', () => {
      const { container } = render(
        React.createElement(VoiceConversationHistory, {
          ...defaultProps,
          messages: [makeMessage('user', 'Test')],
        }),
      );
      const scrollContainer = container.querySelector('.overflow-y-auto');
      expect(scrollContainer).toBeInTheDocument();
    });
  });
});
