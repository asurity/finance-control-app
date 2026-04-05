# PLAN DE MIGRACIÓN: OpenAI Realtime → Gemini (Opción A)

## Arquitectura: Web Speech API (STT/TTS gratis) + Gemini 2.5 Flash-Lite (Function Calling)

---

## PRINCIPIOS RECTORES

| Principio | Aplicación |
|-----------|-----------|
| **DRY** | Reutilizar VoiceToolRegistry, tools existentes, buildSystemInstructions(). NO duplicar lógica |
| **Clean Architecture** | Nuevo provider implementa IAIRealtimeProvider. UI depende solo de ports, nunca de Gemini directo |
| **Dependency Inversion** | VoiceProvider → IAIRealtimeProvider (port) → GeminiTextProvider (adapter) |
| **Single Responsibility** | Cada archivo una responsabilidad: provider, mapper, config, route |
| **Open/Closed** | AIProviderFactory abierta a extensión sin modificar consumidores |
| **NO romper flujos existentes** | Solo se modifica el módulo de voz. Transacciones manuales, presupuestos, cuentas, etc. quedan intactos |
| **Commits + Tags** | Cada fase genera un commit semántico y tag para rollback seguro |
| **Escalabilidad** | Diseño permite añadir Gemini Live API (Opción B) o cualquier otro provider a futuro |

---

## REGLA DE ORO

> **SOLO se modifican archivos del módulo de voz (`voice-agent/`, `components/voice/`, `api/voice/`, `hooks/useVoiceAgent`). Ningún otro flujo de la aplicación será tocado.**

---

## ARQUITECTURA ACTUAL vs NUEVA

```
ACTUAL (OpenAI):
┌──────────┐    WebRTC/SDP     ┌─────────────┐
│ Browser  │◄──────────────────►│ OpenAI      │
│ Mic+PTT  │   DataChannel     │ Realtime API│
│          │   (audio binary)  │ gpt-mini    │
└──────────┘                   └─────────────┘
     │                               │
     │ POST /api/voice/session       │ STT + FC + TTS
     │ (ephemeral token)             │ (todo en uno)
     ▼                               ▼
┌──────────┐                   ┌─────────────┐
│ Next.js  │                   │ $0.01-0.05  │
│ API Route│                   │ por comando │
└──────────┘                   └─────────────┘

NUEVA (Gemini Opción A):
┌──────────────────┐
│ Browser          │
│                  │
│ ┌──────────────┐ │  texto transcrito    ┌───────────────┐
│ │Web Speech API│─┼─────────────────────►│ Next.js API   │
│ │ (STT gratis) │ │  POST /api/voice/    │ /api/voice/   │
│ └──────────────┘ │  gemini              │ gemini        │
│                  │                      │               │
│ ┌──────────────┐ │  ◄── JSON response   │  ┌─────────┐  │
│ │Web Speech API│◄┼──────────────────────┼──│ Gemini  │  │
│ │ (TTS gratis) │ │  {functionCall|text} │  │Flash-Lit│  │
│ └──────────────┘ │                      │  │ $0/free │  │
│                  │                      │  └─────────┘  │
│ ┌──────────────┐ │                      └───────────────┘
│ │Tool Execution│ │  (local, igual que antes)
│ │ Registry     │ │
│ └──────────────┘ │
└──────────────────┘

Costo: ~$0.00 (tier gratuito) a ~$0.05/día (1000 comandos pagados)
```

---

## FASES DE IMPLEMENTACIÓN

---

### FASE 1: Configuración base y SDK de Gemini
**Commit:** `feat(voice): add Gemini SDK and configuration`
**Tag:** `v-gemini-fase1`

#### 1.1 Instalar dependencia
```bash
npm install @google/genai
```
> SDK oficial de Google para Gemini API (Node.js/TypeScript)
> Ref: https://ai.google.dev/gemini-api/docs/quickstart?hl=es-419

#### 1.2 Crear `src/infrastructure/voice-agent/gemini-config.ts`
Configuración específica de Gemini, separada de la config de OpenAI.

```typescript
// Contendrá:
export const GEMINI_VOICE_CONFIG = {
  model: 'gemini-2.5-flash-lite',        // Modelo más económico con FC
  temperature: 0.1,                        // Baja para function calling determinístico
  maxOutputTokens: 100,                    // Respuestas ultra-cortas
  reasoningEffort: 'none',                 // Sin tokens de pensamiento = ahorro
  functionCallingMode: 'ANY',              // FUERZA function calling (no chatear)
  // Fallback mode AUTO para preguntas aclaratorias
  fallbackMode: 'AUTO',
};
```

**Referencia JSON para function calling mode:**
```json
{
  "tool_config": {
    "function_calling_config": {
      "mode": "ANY"
    }
  }
}
```
> Ref: https://ai.google.dev/gemini-api/docs/function-calling?hl=es-419#function-calling-modes

#### 1.3 Actualizar `INSTRUCCIONES_ENV.md`
Agregar las nuevas variables de entorno:

```env
# --- Gemini (Voice Agent Opción A) ---
GEMINI_API_KEY=tu_api_key_aqui
# Obtener en: https://aistudio.google.com/apikey

# --- Voice Agent Provider ---
NEXT_PUBLIC_AI_PROVIDER=gemini          # Cambiar de 'openai' a 'gemini'
NEXT_PUBLIC_ENABLE_VOICE_AGENT=true
```

#### 1.4 Actualizar `.env.local` (manual, no commitear)
Agregar `GEMINI_API_KEY` al archivo local.

#### Archivos tocados:
| Archivo | Acción |
|---------|--------|
| `package.json` | Agregar `@google/genai` |
| `src/infrastructure/voice-agent/gemini-config.ts` | **NUEVO** |
| `INSTRUCCIONES_ENV.md` | Actualizar documentación |

---

### FASE 2: API Route de Gemini con Function Calling
**Commit:** `feat(voice): add Gemini API route with function calling`
**Tag:** `v-gemini-fase2`

#### 2.1 Crear `src/app/api/voice/gemini/route.ts`
Nueva ruta REST que recibe texto y devuelve function calls o respuestas de texto.

**Endpoint:** `POST /api/voice/gemini`

**Request:**
```json
{
  "text": "Gasté 15 mil en almuerzo",
  "conversationHistory": [
    { "role": "user", "text": "..." },
    { "role": "assistant", "text": "..." }
  ],
  "turnIndex": 0
}
```

**Response (function call):**
```json
{
  "type": "function_call",
  "functionCalls": [
    {
      "callId": "fc_abc123",
      "name": "get_organization_context",
      "arguments": {}
    }
  ],
  "textResponse": null
}
```

**Response (texto):**
```json
{
  "type": "text",
  "functionCalls": null,
  "textResponse": "¿En qué cuenta?"
}
```

**Flujo interno del API Route:**
```
1. Verificar auth (Firebase ID token) → 401 si falla
2. Rate limiting (reutilizar checkRateLimit existente) → 429 si excede
3. Construir contents[] con conversationHistory + nuevo texto
4. Construir tools[] con ToolDeclarationMapper.toGemini()
5. Llamar Gemini API:
   - model: gemini-2.5-flash-lite
   - systemInstruction: buildSystemInstructions() (OPTIMIZADO)  
   - tools: function_declarations
   - toolConfig: { functionCallingConfig: { mode: 'ANY' } }
     (mode 'AUTO' solo cuando ya estamos en turno de pregunta aclaratoria)
   - generationConfig: { temperature: 0.1, maxOutputTokens: 100 }
6. Parsear respuesta:
   - Si response.candidates[0].content.parts tiene functionCall → devolver
   - Si tiene text → devolver como textResponse
7. Log usage async (tokens consumidos)
```

**Llamada a la API de Gemini (formato REST):**
> Ref: https://ai.google.dev/gemini-api/docs/function-calling?hl=es-419

```typescript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash-lite',
  contents: [
    { role: 'user', parts: [{ text: userMessage }] }
  ],
  config: {
    systemInstruction: buildSystemInstructions(),
    tools: [{ functionDeclarations: geminiToolDeclarations }],
    toolConfig: {
      functionCallingConfig: { mode: 'ANY' }
    },
    temperature: 0.1,
    maxOutputTokens: 100,
  }
});
```

#### 2.2 Actualizar `ToolDeclarationMapper.ts`
Completar el método `toGemini()` con el formato correcto:

```typescript
// Formato Gemini FunctionDeclaration:
// Ref: https://ai.google.dev/api/caching#FunctionDeclaration
{
  name: "create_expense",
  description: "Registra un gasto",
  parameters: {
    type: "OBJECT",         // ← Mayúscula (diferencia con OpenAI)  
    properties: { ... },
    required: ["amount", "description", "categoryId", "accountId"]
  }
}
```

#### 2.3 Lógica de multi-turno con Gemini
Para soportar el flujo conversacional (AI pide info → usuario responde → AI ejecuta):

```typescript
// Turno 1: Usuario dice "Gasté 15 mil en almuerzo"
// → Gemini llama get_organization_context ← PASO 0
// Turno 2: API envía result de get_org_context
// → Gemini llama list_accounts + list_categories
// Turno 3: API envía results
// → Gemini responde "¿En qué cuenta?" (mode AUTO)
// Turno 4: Usuario dice "Visa"
// → Gemini llama create_expense con todos los params
```

El multi-turno se maneja enviando la historia de conversación completa en cada request.
Incluye los function_call del modelo y los function_response del cliente.

**Formato de conversación multi-turno con Gemini:**
```typescript
const contents = [
  // Turno 1: usuario
  { role: 'user', parts: [{ text: 'Gasté 15 mil en almuerzo' }] },
  // Turno 2: modelo llama función
  { role: 'model', parts: [{ functionCall: { name: 'get_organization_context', args: {} } }] },
  // Turno 3: resultado de función  
  { role: 'user', parts: [{ functionResponse: { name: 'get_organization_context', response: { organizationId: '...' } } }] },
  // Turno 4: modelo responde texto
  { role: 'model', parts: [{ text: '¿En qué cuenta?' }] },
  // Turno 5: usuario responde
  { role: 'user', parts: [{ text: 'Visa' }] },
];
```
> Ref: https://ai.google.dev/gemini-api/docs/function-calling?hl=es-419#multi-turn

#### Archivos tocados:
| Archivo | Acción |
|---------|--------|
| `src/app/api/voice/gemini/route.ts` | **NUEVO** - API Route principal |
| `src/infrastructure/voice-agent/ToolDeclarationMapper.ts` | Completar `toGemini()` |

---

### FASE 3: GeminiTextProvider (Nuevo Provider)
**Commit:** `feat(voice): implement GeminiTextProvider with Web Speech API`
**Tag:** `v-gemini-fase3`

#### 3.1 Crear `src/infrastructure/voice-agent/GeminiTextProvider.ts`
Implementa `IAIRealtimeProvider` usando Web Speech API + HTTP REST.

**Diferencia clave vs OpenAIRealtimeProvider:**
- OpenAI: WebRTC bidireccional (audio → audio)
- Gemini: Web Speech API (audio → texto) + HTTP POST (texto → function_call/texto) + Web Speech API (texto → audio)

```typescript
// Pseudocódigo del provider:
class GeminiTextProvider implements IAIRealtimeProvider {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesisUtterance | null = null;
  private sessionToken: string | null = null;
  private conversationParts: GeminiContentPart[] = []; // Multi-turno
  private pendingFunctionCalls: number = 0;

  // --- Callbacks ---
  private callbacks = {
    onStateChange: [],
    onFunctionCall: [],
    onTranscript: [],
    onTextResponse: [],
    onAudioResponse: [],  // No usado (usamos speechSynthesis)
    onError: [],
    onRecordingTimeUpdate: [],
  };

  async connect(config: AISessionConfig): Promise<void> {
    // 1. Verificar soporte de Web Speech API
    // 2. Solicitar permisos de micrófono
    // 3. Inicializar SpeechRecognition
    //    - lang = 'es-ES'
    //    - continuous = false
    //    - interimResults = true
    // 4. Guardar config (tools, systemInstructions)
    // 5. Emit state → 'ready'
  }

  async startAudioCapture(): Promise<void> {
    // 1. recognition.start()
    // 2. Emit state → 'recording'
    // 3. Iniciar timer de 15s
    // 4. onresult → emit onTranscript (parcial)
  }

  stopAudioCaptureAndProcess(): void {
    // 1. recognition.stop()
    // 2. Obtener transcript final
    // 3. Si vacío → emit error "No se detectó audio"
    // 4. Emit state → 'processing'
    // 5. Llamar processTranscript(text)
  }

  private async processTranscript(text: string): Promise<void> {
    // 1. POST /api/voice/gemini { text, conversationHistory }
    // 2. Parsear response:
    //    a) Si function_call → emit onFunctionCall para cada una
    //    b) Si text → emit onTextResponse + hablar con speechSynthesis
    // 3. Emit state → 'executing' o 'ready'
  }

  sendFunctionResult(callId: string, result: unknown): void {
    // 1. Agregar result a conversationParts
    // 2. pendingFunctionCalls--
    // 3. Si pendingFunctionCalls === 0:
    //    POST /api/voice/gemini con history actualizada
    //    (el modelo procesará los results y decidirá siguiente acción)
  }

  disconnect(): void {
    // 1. recognition.stop()
    // 2. speechSynthesis.cancel()
    // 3. Limpiar conversationParts
    // 4. Emit state → 'idle'
  }
}
```

#### 3.2 Gestión del multi-turno en el Provider

El GeminiTextProvider mantiene internamente `conversationParts[]` que se envía al API en cada request. Esto incluye:
- Mensajes de usuario (texto transcrito)
- Respuestas del modelo (function_calls o textos)
- Resultados de funciones (function_response)

Cuando el modelo devuelve un function_call:
1. Provider emite `onFunctionCall` → VoiceProvider ejecuta el tool
2. VoiceProvider llama `sendFunctionResult()` → Provider agrega a conversationParts
3. Cuando todas las funciones pending están resueltas → Provider hace nuevo POST al API
4. El API devuelve la siguiente acción (más functions o texto final)

#### 3.3 TTS con Web Speech API

```typescript
private speak(text: string): void {
  if (!text || text.length < 2) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';       // Español
  utterance.rate = 1.1;            // Ligeramente rápido
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  // Seleccionar voz en español si hay disponible
  const voices = speechSynthesis.getVoices();
  const spanishVoice = voices.find(v => v.lang.startsWith('es'));
  if (spanishVoice) utterance.voice = spanishVoice;
  
  speechSynthesis.speak(utterance);
}
```

#### Archivos tocados:
| Archivo | Acción |
|---------|--------|
| `src/infrastructure/voice-agent/GeminiTextProvider.ts` | **NUEVO** - Provider completo |

---

### FASE 4: Integrar Provider en Factory y Pipeline
**Commit:** `feat(voice): integrate GeminiTextProvider into factory pipeline`
**Tag:** `v-gemini-fase4`

#### 4.1 Actualizar `AIProviderFactory.ts`

```typescript
case 'gemini':
  return new GeminiTextProvider();
// También actualizar getSupportedProviders() → ['openai', 'gemini']
```

#### 4.2 Actualizar `src/infrastructure/voice-agent/index.ts`
Agregar exports del nuevo provider y config.

#### 4.3 Actualizar `src/domain/ports/IAIRealtimeProvider.ts`
Agregar `'gemini-text'` como sub-tipo si es necesario, o mantener `'gemini'`.
Evaluar si la interfaz necesita un método adicional para el flujo REST (probablemente NO, ya que GeminiTextProvider encapsula internamente la diferencia).

#### 4.4 Actualizar `src/app/api/voice/session/route.ts`
Agregar case `'gemini'` que NO genera ephemeralToken (no se necesita para REST):

```typescript
case 'gemini': {
  // Gemini Opción A no requiere token efímero
  // Solo verificamos que GEMINI_API_KEY esté configurada
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'SERVICE_UNAVAILABLE', message: 'Gemini API key no configurada' },
      { status: 503 }
    );
  }
  return NextResponse.json({
    ephemeralToken: 'gemini-no-token-required',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    commandsRemaining: rateLimitCheck.remaining,
    maxDuration: VOICE_LIMITS.maxInputDurationSeconds,
    provider: 'gemini',
    userId,
  });
}
```

#### Archivos tocados:
| Archivo | Acción |
|---------|--------|
| `src/infrastructure/voice-agent/AIProviderFactory.ts` | Agregar case gemini |
| `src/infrastructure/voice-agent/index.ts` | Agregar exports |
| `src/app/api/voice/session/route.ts` | Agregar case gemini |
| `src/domain/ports/IAIRealtimeProvider.ts` | Revisar, posible noop |

---

### FASE 5: Adaptar VoiceProvider para flujo HTTP
**Commit:** `feat(voice): adapt VoiceProvider for Gemini HTTP flow`
**Tag:** `v-gemini-fase5`

#### 5.1 Actualizar `src/components/voice/VoiceProvider.tsx`

El VoiceProvider actualmente depende de la interfaz `IAIRealtimeProvider`, así que los cambios son **mínimos**:

- El `handleFunctionCall` sigue funcionando igual (recibe AIFunctionCall, ejecuta tool, llama sendFunctionResult)
- El `setupProviderListeners` sigue funcionando igual (onStateChange, onTranscript, etc.)
- `startRecording/stopRecording` siguen usando los métodos del provider

**Cambios necesarios:**
1. Para Gemini, `audioStream` no se usa (TTS vía speechSynthesis). Manejar gracefully.
2. El provider Gemini maneja internamente los re-requests después de function calls, pero VoiceProvider debe seguir enviando los results igual.
3. State machine funciona igual: idle → connecting → ready → recording → processing → executing → ready.

#### 5.2 Actualizar `connectSession()` en VoiceProvider

```typescript
// Actualmente:
const sessionResponse = await fetch('/api/voice/session', { ... });
// → Devuelve ephemeralToken → se pasa a provider.connect()

// Con Gemini, el connect() del provider NO necesita ephemeralToken
// pero sí necesita saber que estamos en modo gemini.
// El provider internamente usa /api/voice/gemini para cada turno.
```

La adaptación principal es que `GeminiTextProvider.connect()` no necesita el ephemeralToken real, pero sí valida con `/api/voice/session` que el usuario esté autorizado y tenga comandos disponibles.

#### Archivos tocados:
| Archivo | Acción |
|---------|--------|
| `src/components/voice/VoiceProvider.tsx` | Ajustes menores de compatibilidad |

---

### FASE 6: Optimizar System Instructions para Gemini
**Commit:** `feat(voice): optimize system instructions for Gemini token efficiency`
**Tag:** `v-gemini-fase6`

#### 6.1 Crear `buildGeminiSystemInstructions()` en `gemini-config.ts`

Gemini function calling es más eficiente con instrucciones más cortas. Optimizar:

**Actual (OpenAI):** ~2000 tokens de system prompt
**Objetivo (Gemini):** ~500 tokens

```typescript
export function buildGeminiSystemInstructions(): string {
  return `Asistente financiero por voz. Español. Brevedad extrema.
REGLAS:
1. SIEMPRE ejecuta get_organization_context PRIMERO
2. Luego list_accounts y list_categories para contexto
3. Usa el campo 'id' de las listas, NUNCA el 'name'
4. Si falta cuenta, pregunta: "¿En qué cuenta?"
5. Si falta categoría, infiere la más lógica
6. Descripciones: 3-8 palabras narrativas. Ej: "Café en Starbucks por la mañana"
7. Confirmaciones: MAX 3 palabras. "Registrado", "Listo", "Hecho"
8. Montos: sin decimales. 15000 no 15000.00`;
}
```

#### 6.2 Mantener `buildSystemInstructions()` original intacto
Para no romper OpenAI si se quiere revertir. La nueva función es independiente.

#### Archivos tocados:
| Archivo | Acción |
|---------|--------|
| `src/infrastructure/voice-agent/gemini-config.ts` | Agregar system instructions optimizadas |

---

### FASE 7: Adaptar componentes UI
**Commit:** `feat(voice): adapt UI components for Web Speech flow`
**Tag:** `v-gemini-fase7`

#### 7.1 `VoiceModal.tsx`
- El `<audio>` element para reproducir TTS de OpenAI no se usa con Gemini (speechSynthesis es directo)
- Agregar indicador "IA hablando" basado en `speechSynthesis.speaking`
- Mostrar/ocultar controles de audio según provider

#### 7.2 `VoicePushToTalkButton.tsx`
- Sin cambios funcionales (usa startRecording/stopRecording del context)
- El timer de 15s sigue funcionando igual

#### 7.3 `VoiceButton.tsx`
- Sin cambios funcionales (usa state del context)

#### 7.4 `VoiceConversationHistory.tsx`
- Sin cambios (ya es agnóstico)

#### 7.5 Manejar compatibilidad de navegador
```typescript
// Verificar soporte en GeminiTextProvider.connect():
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
  throw new Error('Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.');
}
```

#### Archivos tocados:
| Archivo | Acción |
|---------|--------|
| `src/components/voice/VoiceModal.tsx` | Ajustes de audio display |
| `src/components/voice/VoicePushToTalkButton.tsx` | Sin cambios o mínimos |

---

### FASE 8: Testing y Configuración final
**Commit:** `feat(voice): add Gemini integration tests and config`
**Tag:** `v-gemini-fase8`

#### 8.1 Tests unitarios
- `GeminiTextProvider.test.ts` - Mock de Web Speech API + fetch
- `ToolDeclarationMapper.test.ts` - Verificar formato Gemini correcto
- `gemini-config.test.ts` - Verificar configuración
- `route.test.ts` (gemini) - Mock de Gemini SDK

#### 8.2 Tests de integración manual
Checklist:
- [ ] Abrir modal de voz → estado "ready"
- [ ] Push-to-talk → reconocimiento de voz en español
- [ ] "Gasté 15 mil en almuerzo en la visa" → función create_expense ejecutada
- [ ] "Ingreso de 500 mil por nómina" → función create_income ejecutada
- [ ] Pregunta aclaratoria: "Gasté 10 mil" → "¿En qué cuenta?" → "Visa" → Ejecuta
- [ ] Multi-turno funciona (sesión persiste entre comandos)
- [ ] TTS dice "Registrado" después de crear gasto/ingreso
- [ ] Rate limiting funciona (verificar con Firestore)
- [ ] Error handling: micrófono denegado, red caída, API key inválida
- [ ] Cache invalidation: después de crear gasto, la lista de transacciones se refresca

#### 8.3 Actualizar `APP_CONFIG`
```typescript
// src/lib/constants/config.ts
export const APP_CONFIG = {
  // ...
  aiProvider: (process.env.NEXT_PUBLIC_AI_PROVIDER || 'gemini') as AIProviderType,
  //                                  ^^^^^^^ cambiar default a gemini
  enableVoiceAgent: process.env.NEXT_PUBLIC_ENABLE_VOICE_AGENT === 'true',
};
```

#### Archivos tocados:
| Archivo | Acción |
|---------|--------|
| `src/lib/constants/config.ts` | Cambiar default a gemini |
| Tests nuevos | Según corresponda |

---

### FASE 9: Limpieza y deprecación de OpenAI
**Commit:** `chore(voice): deprecate OpenAI Realtime, set Gemini as default`
**Tag:** `v-gemini-fase9`

#### 9.1 Marcar OpenAI como deprecated (NO eliminar)
```typescript
/**
 * @deprecated Migrado a GeminiTextProvider. Mantener para rollback.
 * Se eliminará en v2.0 después de período de estabilización.
 */
export class OpenAIRealtimeProvider implements IAIRealtimeProvider { ... }
```

#### 9.2 Eliminar dependencia `openai` de package.json
```bash
npm uninstall openai
```
> Solo si se confirma que OpenAI no se usa en ningún otro lugar de la app.

#### 9.3 Actualizar `INSTRUCCIONES_ENV.md`
- `OPENAI_API_KEY` → marcar como opcional/deprecated
- `GEMINI_API_KEY` → marcar como requerido

#### 9.4 Limpiar variables de entorno en producción
- Agregar `GEMINI_API_KEY` a Firebase/Vercel secrets
- Mantener `OPENAI_API_KEY` como backup

#### 9.5 Actualizar README.md con nueva arquitectura

#### Archivos tocados:
| Archivo | Acción |
|---------|--------|
| `package.json` | Remover `openai` |
| `INSTRUCCIONES_ENV.md` | Actualizar |
| `README.md` | Actualizar |
| Archivos OpenAI | Marcar @deprecated |

---

## DETALLE DE TODOS LOS ARCHIVOS

### Archivos NUEVOS (a crear):
| # | Archivo | Descripción |
|---|---------|-------------|
| 1 | `src/infrastructure/voice-agent/gemini-config.ts` | Config de Gemini + system instructions optimizadas |
| 2 | `src/infrastructure/voice-agent/GeminiTextProvider.ts` | Provider que usa Web Speech + HTTP POST |
| 3 | `src/app/api/voice/gemini/route.ts` | API Route REST para Gemini function calling |

### Archivos MODIFICADOS:
| # | Archivo | Cambio |
|---|---------|--------|
| 4 | `package.json` | +`@google/genai`, -`openai` (fase 9) |
| 5 | `src/infrastructure/voice-agent/AIProviderFactory.ts` | Agregar case `'gemini'` |
| 6 | `src/infrastructure/voice-agent/ToolDeclarationMapper.ts` | Completar `toGemini()` con tipos correctos |
| 7 | `src/infrastructure/voice-agent/index.ts` | Agregar exports de Gemini |
| 8 | `src/app/api/voice/session/route.ts` | Agregar case `'gemini'` para validación |
| 9 | `src/components/voice/VoiceModal.tsx` | Ajustes para TTS (speechSynthesis vs audio element) |
| 10 | `src/components/voice/VoiceProvider.tsx` | Ajustes menores de compatibilidad |
| 11 | `src/lib/constants/config.ts` | Default provider → `'gemini'` |
| 12 | `INSTRUCCIONES_ENV.md` | Agregar `GEMINI_API_KEY` |

### Archivos NO TOCADOS (protegidos):
- Todo `src/application/` excepto hooks de voz
- Todo `src/domain/` excepto ports de voz (si necesario)
- Todo `src/components/` excepto `voice/`
- Todo `src/app/(dashboard)/` - flujos de UI manuales
- Todo `src/app/api/` excepto `voice/`
- Todo `scripts/`
- Todo `functions/` (backend OpenAI se depreca, no se toca)
- Todos los archivos de transacciones, cuentas, presupuestos, categorías, etc.

---

## REFERENCIAS TÉCNICAS (URLs de documentación)

| Tema | URL |
|------|-----|
| Gemini API Quickstart (Node.js) | https://ai.google.dev/gemini-api/docs/quickstart?hl=es-419 |
| Function Calling completo | https://ai.google.dev/gemini-api/docs/function-calling?hl=es-419 |
| Modos de Function Calling (ANY/AUTO/NONE) | https://ai.google.dev/gemini-api/docs/function-calling?hl=es-419#function-calling-modes |
| Audio/Speech Understanding | https://ai.google.dev/gemini-api/docs/audio?hl=es-419 |
| Precios (tier gratuito) | https://ai.google.dev/gemini-api/docs/pricing?hl=es-419 |
| Compatibilidad OpenAI (fallback) | https://ai.google.dev/gemini-api/docs/openai?hl=es-419 |
| Live API (Opción B futuro) | https://ai.google.dev/gemini-api/docs/live-api/tools?hl=es-419 |
| Structured Output | https://ai.google.dev/gemini-api/docs/structured-output?hl=es-419 |
| SDK Node.js @google/genai | https://www.npmjs.com/package/@google/genai |
| Web Speech API (MDN) | https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition |
| Obtener API Key | https://aistudio.google.com/apikey |

---

## ESTIMACIÓN DE COSTOS POST-MIGRACIÓN

### Tier Gratuito (Gemini 2.5 Flash-Lite):
| Métrica | Valor |
|---------|-------|
| Tokens de entrada | GRATIS |
| Tokens de salida | GRATIS |
| Rate limit | 30 RPM, 1500 RPD |
| Web Speech API | GRATIS (navegador) |
| **Total** | **$0.00** |

### Tier Pagado (si excede gratuito):
| Métrica | Costo |
|---------|-------|
| Input tokens | $0.10 / 1M tokens |
| Output tokens | $0.40 / 1M tokens |
| ~100 tokens por comando (avg) | ~$0.00005 / comando |
| **1000 comandos/día** | **~$0.05/día = $1.50/mes** |

### Ahorro vs OpenAI:
| | OpenAI Realtime | Gemini Opción A |  
|---|---|---|
| Mensual (10 users × 20 cmd/día) | $50-100 | $0.00 - $1.50 |
| **Ahorro** | - | **97-100%** |

---

## RIESGOS Y MITIGACIONES

| Riesgo | Mitigación |
|--------|-----------|
| Web Speech API no soportada en Safari/Firefox | Mostrar mensaje de incompatibilidad + fallback text input |
| Calidad STT inferior a Whisper | Tests con acentos latinoamericanos. Si es muy malo, usar Gemini Audio directo (Opción B) |
| Tier gratuito con rate limits bajos (30 RPM) | 1 comando = 2-4 requests. Con 30 RPM alcanza para ~8-10 comandos/min. Suficiente |
| Gemini Flash-Lite no soporta FC | Verificado: SÍ soporta function calling. Si falla, usar Gemini 2.5 Flash |
| Latencia mayor por ser HTTP vs WebRTC | ~200-500ms más. Acceptable para push-to-talk |
| Multi-turno con muchos tokens | Limitar a últimos 3 turnos. System Instructions optimizadas a ~500 tokens |

---

## CHECKLIST PRE-IMPLEMENTACIÓN

- [ ] Obtener GEMINI_API_KEY en https://aistudio.google.com/apikey
- [ ] Verificar que la API key funciona con curl de prueba
- [ ] Confirmar que Chrome es el navegador principal de los usuarios
- [ ] Backup del código actual (branch `backup/openai-voice`)
- [ ] Leer FASE_7_VOICE_PERSISTENCE.md para entender contexto previo

---

## ORDEN DE EJECUCIÓN

```
FASE 1 → commit + tag → verificar build
FASE 2 → commit + tag → probar API route con Postman/curl
FASE 3 → commit + tag → probar provider aislado
FASE 4 → commit + tag → verificar factory pipeline
FASE 5 → commit + tag → probar flujo completo en browser
FASE 6 → commit + tag → verificar tokens consumidos
FASE 7 → commit + tag → probar UI completa
FASE 8 → commit + tag → ejecutar tests
FASE 9 → commit + tag → deploy a staging
```

Cada fase es independiente y permite rollback al tag anterior si algo falla.
