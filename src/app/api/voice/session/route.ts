/**
 * API Route para crear sesiones efímeras con OpenAI Realtime API
 * Fase 1: Implementación completa con autenticación y rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { VOICE_AGENT_CONFIG, VOICE_LIMITS, buildSystemInstructions } from '@/infrastructure/voice-agent/config';

/**
 * Rate limiter en memoria
 * Estructura: userId -> { date: string (YYYY-MM-DD), count: number }
 */
const rateLimitMap = new Map<string, { date: string; count: number }>();

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD (hora local del servidor)
 */
function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Verifica y actualiza el rate limit para un usuario
 * @param userId - ID del usuario
 * @returns { allowed: boolean, remaining: number, resetAt?: string }
 */
function checkRateLimit(userId: string): {
  allowed: boolean;
  remaining: number;
  resetAt?: string;
} {
  const today = getCurrentDate();
  const userLimit = rateLimitMap.get(userId);

  // Si no existe o es de un día anterior, resetear
  if (!userLimit || userLimit.date !== today) {
    rateLimitMap.set(userId, { date: today, count: 1 });
    return {
      allowed: true,
      remaining: VOICE_LIMITS.maxCommandsPerDay - 1,
    };
  }

  // Verificar si excede el límite
  if (userLimit.count >= VOICE_LIMITS.maxCommandsPerDay) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return {
      allowed: false,
      remaining: 0,
      resetAt: tomorrow.toISOString(),
    };
  }

  // Incrementar contador
  userLimit.count += 1;
  rateLimitMap.set(userId, userLimit);

  return {
    allowed: true,
    remaining: VOICE_LIMITS.maxCommandsPerDay - userLimit.count,
  };
}

/**
 * POST /api/voice/session
 * Genera un token efímero para conectar con OpenAI Realtime API vía WebRTC
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validar autenticación del usuario
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Token de autenticación requerido' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;

    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      console.error('Error al verificar token de Firebase:', error);
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Token de autenticación inválido' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;

    // 2. Verificar rate limiting
    const rateLimitCheck = checkRateLimit(userId);
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

    // 3. Verificar que exista la API key de OpenAI
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY no está configurada');
      return NextResponse.json(
        { error: 'SERVICE_UNAVAILABLE', message: 'Servicio de voz no disponible' },
        { status: 503 }
      );
    }

    // 4. Generar ephemeral token con OpenAI Realtime API
    const openaiResponse = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: VOICE_AGENT_CONFIG.model,
        modalities: VOICE_AGENT_CONFIG.modalities,
        instructions: buildSystemInstructions(),
        temperature: VOICE_AGENT_CONFIG.temperature,
        max_response_output_tokens: VOICE_AGENT_CONFIG.maxTokens,
        turn_detection: VOICE_AGENT_CONFIG.turnDetection,
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

    // 5. Retornar token efímero y metadata al cliente
    return NextResponse.json({
      ephemeralToken: sessionData.client_secret?.value || sessionData.client_secret,
      expiresAt: sessionData.expires_at,
      commandsRemaining: rateLimitCheck.remaining,
      maxDuration: VOICE_LIMITS.maxInputDurationSeconds,
      userId,
    });

  } catch (error) {
    console.error('Error en POST /api/voice/session:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
