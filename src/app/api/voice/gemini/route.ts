/**
 * API Route para Gemini Function Calling (REST)
 * FASE 2: Implementación completa con multi-turno
 * 
 * Endpoint: POST /api/voice/gemini
 * Recibe texto transcrito del Web Speech API y devuelve function calls o respuestas de texto.
 * 
 * Ref: https://ai.google.dev/gemini-api/docs/function-calling?hl=es-419
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { adminAuth } from '@/lib/firebase/admin';
import { VoiceToolRegistry } from '@/infrastructure/voice-agent/VoiceToolRegistry';
import { ToolDeclarationMapper } from '@/infrastructure/voice-agent/ToolDeclarationMapper';
import { 
  GEMINI_VOICE_CONFIG, 
  buildGeminiSystemInstructions,
  createGeminiToolConfig,
  FunctionCallingConfigMode,
  type GeminiFunctionCallingMode,
} from '@/infrastructure/voice-agent/gemini-config';
import type { AIToolDeclaration } from '@/domain/ports/IAIRealtimeProvider';

/**
 * Request body esperado
 */
interface GeminiVoiceRequest {
  /** Texto transcrito del usuario */
  text: string;
  /** Historial de conversación (multi-turno) */
  conversationHistory?: GeminiContentPart[];
  /** Índice del turno actual (para logging/debugging) */
  turnIndex?: number;
  /** Modo de function calling (ANY, AUTO, NONE) */
  functionCallingMode?: GeminiFunctionCallingMode;
}

/**
 * Content part de Gemini (usuario o modelo)
 * Ref: https://ai.google.dev/api/generate-content#v1beta.Content
 */
export interface GeminiContentPart {
  role: 'user' | 'model';
  parts: Array<
    | { text: string }
    | { functionCall: { name: string; args: Record<string, unknown> } }
    | { functionResponse: { name: string; response: Record<string, unknown> } }
  >;
}

/**
 * Response body
 */
interface GeminiVoiceResponse {
  /** Tipo de respuesta */
  type: 'function_call' | 'text';
  /** Function calls si type === 'function_call' */
  functionCalls?: Array<{
    callId: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  /** Respuesta de texto si type === 'text' */
  textResponse?: string;
  /** Tokens consumidos (para logging) */
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

/**
 * Inicializar cliente de Gemini
 */
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no configurada');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * POST /api/voice/gemini
 * Procesa texto transcrito y devuelve function calls o respuesta de texto
 */
export async function POST(request: NextRequest) {
  console.log('[API /voice/gemini] POST request recibido');

  try {
    // 1. Validar autenticación
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[API /voice/gemini] Token de autenticación faltante');
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Token de autenticación requerido' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    let userId: string;

    try {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      userId = decodedToken.uid;
      console.log('[API /voice/gemini] Usuario autenticado:', userId);
    } catch (error) {
      console.error('[API /voice/gemini] Error al verificar token:', error);
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Token inválido' },
        { status: 401 }
      );
    }

    // 2. Parsear body
    const body: GeminiVoiceRequest = await request.json();
    const { text, conversationHistory = [], turnIndex = 0, functionCallingMode } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'Texto vacío' },
        { status: 400 }
      );
    }

    console.log(`[API /voice/gemini] Turno ${turnIndex} - Texto:`, text.substring(0, 100));

    // 3. Obtener tools disponibles
    const registry = VoiceToolRegistry.getInstance();
    const tools = registry.getAll();
    
    if (tools.length === 0) {
      console.error('[API /voice/gemini] No hay tools registrados');
      return NextResponse.json(
        { error: 'NO_TOOLS', message: 'No hay herramientas disponibles' },
        { status: 500 }
      );
    }

    // Convertir a format agnóstico
    const agnosticTools: AIToolDeclaration[] = tools.map(tool => ({
      name: tool.declaration.name,
      description: tool.declaration.description,
      parameters: {
        type: 'object' as const,
        properties: tool.declaration.parameters.properties,
        required: tool.declaration.parameters.required,
      },
    }));

    // Convertir a formato Gemini
    const geminiTools = agnosticTools.map(tool => ToolDeclarationMapper.toGemini(tool));
    
    console.log(`[API /voice/gemini] ${geminiTools.length} tools disponibles`);

    // 4. Construir contents[] para multi-turno
    const contents: GeminiContentPart[] = [
      ...conversationHistory,
      {
        role: 'user',
        parts: [{ text }],
      },
    ];

    console.log(`[API /voice/gemini] Historial: ${conversationHistory.length} turnos previos`);

    // 5. Determinar modo de function calling
    // ANY = forzar function call
    // AUTO = permitir texto o function call (para preguntas aclaratorias)
    const mode = functionCallingMode || 
      (turnIndex === 0 ? GEMINI_VOICE_CONFIG.functionCallingMode : GEMINI_VOICE_CONFIG.fallbackMode);

    console.log(`[API /voice/gemini] Function calling mode: ${mode}`);

    // 6. Llamar a Gemini API
    const client = getGeminiClient();

    const response = await client.models.generateContent({
      model: GEMINI_VOICE_CONFIG.model,
      contents,
      config: {
        systemInstruction: buildGeminiSystemInstructions(),
        tools: [{ functionDeclarations: geminiTools }],
        toolConfig: createGeminiToolConfig(mode),
        temperature: GEMINI_VOICE_CONFIG.temperature,
        maxOutputTokens: GEMINI_VOICE_CONFIG.maxOutputTokens,
      },
    });
    const candidate = response.candidates?.[0];

    if (!candidate) {
      console.error('[API /voice/gemini] No hay candidatos en la respuesta');
      return NextResponse.json(
        { error: 'NO_RESPONSE', message: 'Sin respuesta del modelo' },
        { status: 500 }
      );
    }

    // 7. Parsear respuesta
    const parts = candidate.content?.parts || [];
    
    // Buscar function calls
    const functionCalls = parts
      .filter(part => 'functionCall' in part)
      .map((part, idx) => {
        const fc = (part as any).functionCall;
        return {
          callId: `fc_${Date.now()}_${idx}`,
          name: fc.name,
          arguments: fc.args || {},
        };
      });

    // Buscar texto de respuesta
    const textParts = parts
      .filter(part => 'text' in part)
      .map(part => (part as any).text);
    const textResponse = textParts.join(' ').trim();

    // 8. Construir respuesta
    const responseData: GeminiVoiceResponse = {
      type: functionCalls.length > 0 ? 'function_call' : 'text',
      functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
      textResponse: textResponse.length > 0 ? textResponse : undefined,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount || 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0,
      },
    };

    console.log(`[API /voice/gemini] Respuesta:`, {
      type: responseData.type,
      functionCalls: responseData.functionCalls?.length || 0,
      textLength: responseData.textResponse?.length || 0,
      tokens: responseData.usage?.totalTokens,
    });

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('[API /voice/gemini] Error no capturado:', error);
    console.error('[API /voice/gemini] Stack:', error instanceof Error ? error.stack : 'No stack');
    
    return NextResponse.json(
      { 
        error: 'INTERNAL_ERROR', 
        message: error instanceof Error ? error.message : 'Error interno',
      },
      { status: 500 }
    );
  }
}
