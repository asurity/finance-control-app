/**
 * VoiceConversationHistory - Historial de conversación del agente de voz
 * 
 * Mini-chat scrollable con:
 * - Mensajes del usuario (derecha, fondo primary)
 * - Mensajes de la IA (izquierda, fondo muted)
 * - Transcripción parcial en progreso
 * - Scroll automático al último mensaje
 */

'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Volume2 } from 'lucide-react';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface VoiceConversationHistoryProps {
  messages: ConversationMessage[];
  isTranscribing: boolean;
  currentTranscript: string;
  isAISpeaking?: boolean;
}

export function VoiceConversationHistory({
  messages,
  isTranscribing,
  currentTranscript,
  isAISpeaking = false,
}: VoiceConversationHistoryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll automático al último mensaje
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentTranscript]);

  if (messages.length === 0 && !isTranscribing) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <p className="text-sm text-muted-foreground text-center">
          Mantén presionado el botón y dime qué quieres registrar
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
    >
      {messages.map((msg, idx) => {
        const isUser = msg.role === 'user';
        const isLastAssistant = !isUser && idx === messages.length - 1;

        return (
          <div
            key={msg.id}
            className={cn(
              'flex',
              isUser ? 'justify-end' : 'justify-start',
            )}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-3 py-2',
                isUser
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted text-foreground rounded-bl-sm',
              )}
            >
              <p className="text-sm leading-relaxed">{msg.text}</p>
              {/* Indicador de IA hablando */}
              {isLastAssistant && isAISpeaking && (
                <div className="flex items-center gap-1 mt-1">
                  <Volume2 className="h-3 w-3 animate-pulse text-primary" />
                  <span className="text-[10px] text-muted-foreground">Hablando...</span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Transcripción parcial en progreso */}
      {isTranscribing && currentTranscript && (
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl px-3 py-2 bg-primary/60 text-primary-foreground rounded-br-sm">
            <p className="text-xs leading-relaxed italic">{currentTranscript}...</p>
          </div>
        </div>
      )}

      {/* Indicador de que está transcribiendo sin texto aún */}
      {isTranscribing && !currentTranscript && (
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl px-3 py-2 bg-primary/40 text-primary-foreground rounded-br-sm">
            <div className="flex gap-1 items-center h-5">
              <span className="w-1.5 h-1.5 bg-primary-foreground/70 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-primary-foreground/70 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-primary-foreground/70 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
