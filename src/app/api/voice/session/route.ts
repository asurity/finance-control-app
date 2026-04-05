/**
 * API Route para crear sesiones efímeras con AI Realtime API
 * Fase 1: Implementación completa con autenticación y rate limiting
 * Fase 7: Rate limiting persistente en Firestore con caché híbrido
 * Voice-Conversational: Soporte multi-proveedor (OpenAI / Gemini / Claude)
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { VOICE_AGENT_CONFIG, VOICE_LIMITS, buildSystemInstructions } from '@/infrastructure/voice-agent/config';
import { AdminVoiceUsageRepository } from '@/infrastructure/repositories/AdminVoiceUsageRepository';
import { APP_CONFIG } from '@/lib/constants/config';
import type { AIProviderType } from '@/domain/ports';

/**
 * Repositorio de uso de voz (persistente en Firestore)
 */
let voiceUsageRepo: AdminVoiceUsageRepository;

try {
  console.log('[API /voice/session] Inicializando AdminVoiceUsageRepository...');
  voiceUsageRepo = new AdminVoiceUsageRepository();
  console.log('[API /voice/session] AdminVoiceUsageRepository inicializado correctamente');
} catch (error) {
  console.error('[API /voice/session] ERROR al inicializar AdminVoiceUsageRepository:', error);
  // Continuar sin el repo, usar fallback en checkRateLimit
}

/**
 * Caché en memoria para optimizar lecturas frecuentes
 * Estructura: userId -> { date: string, count: number, lastSync: number }
 * Se sincroniza con Firestore cada 30 segundos
 */
const cacheMap = new Map<string, { date: string; count: number; lastSync: number }>();
const CACHE_TTL_MS = 30000; // 30 segundos

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD
 */
function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Verifica y actualiza el rate limit para un usuario
 * Usa Firestore como fuente de verdad con caché híbrido
 * @param userId - ID del usuario
 * @returns { allowed: boolean, remaining: number, resetAt?: string }
 */
async function checkRateLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt?: string;
}> {
  const today = getCurrentDate();
  const now = Date.now();
  const cached = cacheMap.get(userId);

  // Si hay caché válido del mismo día, usarlo para verificación rápida
  if (cached && cached.date === today && (now - cached.lastSync) < CACHE_TTL_MS) {
    if (cached.count >= VOICE_LIMITS.maxCommandsPerDay) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      return {
        allowed: false,
        remaining: 0,
        resetAt: tomorrow.toISOString(),
      };
    }
    
    // Actualizar caché optimista
    cached.count += 1;
    cacheMap.set(userId, cached);
  }

  try {
    // Incrementar contador en Firestore (fuente de verdad)
    const commandsUsed = await voiceUsageRepo.incrementCommandCount(userId, today);

    // Actualizar caché
    cacheMap.set(userId, {
      date: today,
      count: commandsUsed,
      lastSync: now,
    });

    // Verificar si excede el límite
    if (commandsUsed > VOICE_LIMITS.maxCommandsPerDay) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      return {
        allowed: false,
        remaining: 0,
        resetAt: tomorrow.toISOString(),
      };
    }

    return {
      allowed: true,
      remaining: VOICE_LIMITS.maxCommandsPerDay - commandsUsed,
    };
  } catch (error) {
    console.error('[checkRateLimit] Error al verificar límite en Firestore:', error);
    console.error('[checkRateLimit] Stack:', error instanceof Error ? error.stack : 'No stack');
    
    // Fallback: permitir si hay error de Firestore (mejor UX que bloquear)
    // pero log para monitoreo
    return {
      allowed: true,
      remaining: VOICE_LIMITS.maxCommandsPerDay - 1,
    };
  }
}

/**
 * POST /api/voice/session
 * Genera un token efímero para conectar con OpenAI Realtime API vía WebRTC
 */
export async function POST(request: NextRequest) {
  console.log('[API /voice/session] POST request recibido');
  
  try {
    // 1. Validar autenticación del usuario
    const authHeader = request.headers.get('authorization');
    console.log('[API /voice/session] Auth header presente:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[API /voice/session] Token de autenticación faltante o inválido');
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Token de autenticación requerido' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;

    try {
      console.log('[API /voice/session] Verificando token con Firebase Admin...');
      decodedToken = await adminAuth.verifyIdToken(idToken);
      console.log('[API /voice/session] Token verificado exitosamente. UserID:', decodedToken.uid);
    } catch (error) {
      console.error('[API /voice/session] Error al verificar token de Firebase:', error);
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Token de autenticación inválido' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;

    // 2. Verificar rate limiting (con persistencia en Firestore)
    const rateLimitCheck = await checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Límite diario alcanzado (10 comandos/día)',
          remaining: 0,
          resetAt: rateLimitCheck.resetAt,
        },
        { status: 429 }
      );
    }

    // 3. Determinar proveedor de AI
    let provider: AIProviderType = APP_CONFIG.aiProvider;
    try {
      const body = await request.json().catch(() => ({}));
      if (body.provider && ['openai', 'gemini', 'claude'].includes(body.provider)) {
        provider = body.provider as AIProviderType;
      }
    } catch {
      // Sin body o body inválido, usar provider por defecto
    }

    // 4. Generar token según el proveedor
    switch (provider) {
      case 'openai': {
        const openaiApiKey = process.env.OPENAI_API_KEY;
        if (!openaiApiKey) {
          console.error('OPENAI_API_KEY no está configurada');
          return NextResponse.json(
            { error: 'SERVICE_UNAVAILABLE', message: 'Servicio de voz no disponible' },
            { status: 503 }
          );
        }

        const openaiResponse = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session: {
              type: 'realtime',
              model: VOICE_AGENT_CONFIG.model,
              instructions: buildSystemInstructions(),
              max_output_tokens: VOICE_AGENT_CONFIG.maxTokens,
              audio: {
                input: {
                  turn_detection: VOICE_AGENT_CONFIG.turnDetection,
                },
                output: {
                  voice: VOICE_AGENT_CONFIG.voice,
                },
              },
            },
          }),
        });

        if (!openaiResponse.ok) {
          const errorData = await openaiResponse.json().catch(() => ({}));
          console.error('Error al generar token de OpenAI:', errorData);
          return NextResponse.json(
            { error: 'OPENAI_ERROR', message: 'Error al inicializar sesión de voz' },
            { status: 500 }
          );
        }

        const sessionData = await openaiResponse.json();

        return NextResponse.json({
          ephemeralToken: sessionData.value,
          expiresAt: sessionData.expires_at,
          commandsRemaining: rateLimitCheck.remaining,
          maxDuration: VOICE_LIMITS.maxInputDurationSeconds,
          provider,
          userId,
        });
      }

      case 'gemini':
      case 'claude':
        return NextResponse.json(
          { error: 'PROVIDER_NOT_IMPLEMENTED', message: `Proveedor '${provider}' aún no está implementado` },
          { status: 501 }
        );

      default:
        return NextResponse.json(
          { error: 'INVALID_PROVIDER', message: `Proveedor '${provider}' no es válido` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[API /voice/session] Error NO CAPTURADO en POST:', error);
    console.error('[API /voice/session] Stack trace:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
