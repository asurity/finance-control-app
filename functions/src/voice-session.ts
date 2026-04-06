/**
 * Firebase Function: Voice Session
 * Genera tokens efímeros para OpenAI Realtime API con autenticación y rate limiting
 * v2 - Secret version update
 */
import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import {adminAuth} from "./shared/admin";
import {VOICE_AGENT_CONFIG, VOICE_LIMITS, buildSystemInstructions} from "./shared/voice-config";
import {AdminVoiceUsageRepository} from "./shared/AdminVoiceUsageRepository";

// Secret de OpenAI API Key (configurado en Firebase Console o CLI)
const openaiApiKey = defineSecret("OPENAI_API_KEY");

// Repositorio de uso de voz
let voiceUsageRepo: AdminVoiceUsageRepository;

try {
  logger.info("[voiceSession] Inicializando AdminVoiceUsageRepository...");
  voiceUsageRepo = new AdminVoiceUsageRepository();
  logger.info("[voiceSession] Repositorio inicializado correctamente");
} catch (error) {
  logger.error("[voiceSession] Error al inicializar repositorio:", error);
}

// Caché en memoria para rate limiting
const cacheMap = new Map<string, { date: string; count: number; lastSync: number }>();
const CACHE_TTL_MS = 30000; // 30 segundos

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD
 */
function getCurrentDate(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Verifica y actualiza el rate limit para un usuario
 */
async function checkRateLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt?: string;
}> {
  const today = getCurrentDate();
  const now = Date.now();
  const cached = cacheMap.get(userId);

  // Verificación rápida con caché
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
    if (!voiceUsageRepo) {
      logger.warn("[checkRateLimit] Repositorio no inicializado, permitiendo acceso");
      return {
        allowed: true,
        remaining: VOICE_LIMITS.maxCommandsPerDay - 1,
      };
    }

    // Incrementar en Firestore (fuente de verdad)
    const commandsUsed = await voiceUsageRepo.incrementCommandCount(userId, today);

    // Actualizar caché
    cacheMap.set(userId, {
      date: today,
      count: commandsUsed,
      lastSync: now,
    });

    // Verificar límite
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
    logger.error("[checkRateLimit] Error al verificar límite:", error);
    // Fallback: permitir en caso de error
    return {
      allowed: true,
      remaining: VOICE_LIMITS.maxCommandsPerDay - 1,
    };
  }
}

/**
 * Cloud Function HTTP para crear sesión de voz
 */
export const voiceSession = onRequest(
  {
    cors: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://cuentas-financieras-0625.web.app",
      "https://cuentas-financieras-0625.firebaseapp.com",
    ],
    memory: "256MiB",
    timeoutSeconds: 30,
    secrets: [openaiApiKey],
    // Nota: acceso público ya configurado manualmente en Google Cloud Console
  },
  async (request, response) => {
    logger.info("[voiceSession] Request recibido", {
      method: request.method,
      origin: request.headers.origin,
    });

    // Solo aceptar POST
    if (request.method !== "POST") {
      response.status(405).json({
        error: "METHOD_NOT_ALLOWED",
        message: "Solo se acepta método POST",
      });
      return;
    }

    try {
      // 1. Validar autenticación
      const authHeader = request.headers.authorization;
      logger.info("[voiceSession] Auth header presente:", !!authHeader);

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        logger.warn("[voiceSession] Token de autenticación faltante o inválido");
        response.status(401).json({
          error: "UNAUTHORIZED",
          message: "Token de autenticación requerido",
        });
        return;
      }

      const idToken = authHeader.split("Bearer ")[1];
      let decodedToken;

      try {
        logger.info("[voiceSession] Verificando token con Firebase Admin...");
        decodedToken = await adminAuth.verifyIdToken(idToken);
        logger.info("[voiceSession] Token verificado exitosamente. UserID:", decodedToken.uid);
      } catch (error) {
        logger.error("[voiceSession] Error al verificar token:", error);
        response.status(401).json({
          error: "UNAUTHORIZED",
          message: "Token de autenticación inválido",
        });
        return;
      }

      const userId = decodedToken.uid;

      // 2. Verificar rate limiting
      const rateLimitCheck = await checkRateLimit(userId);
      if (!rateLimitCheck.allowed) {
        logger.warn("[voiceSession] Rate limit excedido para usuario:", userId);
        response.status(429).json({
          error: "RATE_LIMIT_EXCEEDED",
          message: "Límite diario alcanzado (10 comandos/día)",
          remaining: 0,
          resetAt: rateLimitCheck.resetAt,
        });
        return;
      }

      // 3. Generar token de OpenAI
      const apiKey = openaiApiKey.value();
      if (!apiKey) {
        logger.error("[voiceSession] OPENAI_API_KEY no configurada");
        response.status(503).json({
          error: "SERVICE_UNAVAILABLE",
          message: "Servicio de voz no disponible",
        });
        return;
      }

      logger.info("[voiceSession] Generando token efímero de OpenAI...");
      const openaiResponse = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session: {
            type: "realtime",
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
        logger.error("[voiceSession] Error de OpenAI:", errorData);
        response.status(500).json({
          error: "OPENAI_ERROR",
          message: "Error al inicializar sesión de voz",
        });
        return;
      }

      const sessionData = await openaiResponse.json();
      logger.info("[voiceSession] Token generado exitosamente para usuario:", userId);

      // 4. Retornar respuesta
      response.status(200).json({
        ephemeralToken: sessionData.value,
        expiresAt: sessionData.expires_at,
        commandsRemaining: rateLimitCheck.remaining,
        maxDuration: VOICE_LIMITS.maxInputDurationSeconds,
        provider: "openai",
        userId,
      });
    } catch (error) {
      logger.error("[voiceSession] Error NO CAPTURADO:", error);
      response.status(500).json({
        error: "INTERNAL_ERROR",
        message: "Error interno del servidor",
      });
    }
  }
);
