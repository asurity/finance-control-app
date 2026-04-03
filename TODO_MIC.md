# TODO_MIC.md — Plan Maestro: Sistema de Voz Conversacional con IA Multi-Proveedor

> **Fecha**: 3 de abril de 2026  
> **Objetivo**: Transformar el sistema de voz actual (comando único → ejecución) en un sistema conversacional push-to-talk con soporte multi-proveedor de IA (OpenAI, Gemini, Claude).  
> **Versión actual**: El sistema tiene VoiceButton + VoiceOverlay + RealtimeClient (OpenAI WebRTC) con VAD automático y ejecución inmediata sin conversación.

---

## Principios Rectores

| Principio | Aplicación en este plan |
|---|---|
| **Clean Architecture** | Abstracciones de IA en `domain/`, implementaciones en `infrastructure/`. UI en `components/`. Hooks en `application/hooks/`. |
| **DRY** | Un solo `IAIRealtimeProvider` interface. Factories centralizadas. Reutilización de tools existentes sin duplicar. |
| **Desacoplamiento** | Los componentes UI no conocen qué proveedor de IA se usa. El `RealtimeClient` se abstrae detrás de una interfaz. |
| **Escalabilidad** | Agregar un proveedor nuevo = implementar 1 interfaz + registrar en factory. Zero cambios en UI o tools. |
| **Mantenibilidad** | Cada fase es atómica, con commit y tag. Rollback posible a cualquier fase anterior. |
| **No romper flujos existentes** | Todo el sistema financiero (transacciones, cuentas, presupuestos, dashboard) permanece intocable. Solo se modifica la capa de voz. |

---

## Flujo Existente (INTOCABLE)

```
Login → Organización → Dashboard → Transacciones/Cuentas/Presupuestos/Reportes
                                  ↘ Sidebar + Header (botón de voz aquí)
                                  ↘ Formularios de transacciones manuales
                                  ↘ Gráficos y reportes
```

Lo único que se modifica es el subsistema de voz (`src/components/voice/`, `src/infrastructure/voice-agent/`, `src/app/api/voice/`).

---

## Flujo Objetivo

```
[Botón Micrófono (header/mobile)]
          │
          ▼
┌─────────────────────────────────────────┐
│  MODAL: Botón grande central            │
│  "Mantén presionado para hablar"        │
│                                         │
│         ┌──────────┐                    │
│         │   🎤     │  ← Botón grande    │
│         │          │    push-to-talk     │
│         └──────────┘                    │
│                                         │
│  Historial de conversación (scroll)     │
│  ┌─────────────────────────────────┐    │
│  │ 👤 "Gasté 15 mil en almuerzo"  │    │
│  │ 🤖 "¿En qué cuenta lo cargo?" │    │  ← Audio TTS
│  │ 👤 "En la cuenta corriente"    │    │
│  │ 🤖 "Gasto de $15.000          │    │  ← Audio TTS
│  │     registrado en Alimentación"│    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Cerrar sesión]     3 comandos hoy     │
└─────────────────────────────────────────┘
```

### Flujo técnico paso a paso:

1. **Usuario presiona botón mic** → Se abre modal. Conexión WebRTC aún NO se establece.
2. **Usuario presiona y mantiene botón grande** → `onPointerDown`:
   - Si no hay conexión activa: Solicitar ephemeral token + conectar WebRTC.
   - Iniciar captura de audio del micrófono.
   - Mostrar estado "Escuchando..." con transcripción en vivo.
3. **Usuario suelta el botón** → `onPointerUp`:
   - Commit audio buffer.
   - Verificar que `transcript.trim().length > 0`. Si vacío → mostrar "No se detectó audio", NO gastar tokens.
   - Si hay contenido → enviar `response.create` a la IA.
4. **IA procesa**:
   - Si tiene toda la info → ejecuta tools (create_expense/income) → responde con audio+texto confirmando.
   - Si falta info → responde con audio+texto preguntando qué falta.
5. **Conversación continúa** → La sesión WebRTC se mantiene abierta. El usuario puede presionar el botón de nuevo para dar más info. El contexto de la conversación se preserva.
6. **Usuario cierra modal** → Desconectar WebRTC, limpiar estado.

---

## Arquitectura Multi-Proveedor

```
┌─────────────────────────────────────────────────┐
│                  DOMAIN LAYER                    │
│                                                  │
│  IAIRealtimeProvider (interface)                 │
│  ├─ connect(config): Promise<void>               │
│  ├─ disconnect(): void                           │
│  ├─ startAudioCapture(): Promise<void>           │
│  ├─ stopAudioCapture(): void                     │
│  ├─ sendFunctionResult(callId, result): void     │
│  ├─ onTranscript(cb): void                       │
│  ├─ onFunctionCall(cb): void                     │
│  ├─ onAudioResponse(cb): void                    │
│  ├─ onTextResponse(cb): void                     │
│  ├─ onStateChange(cb): void                      │
│  ├─ onError(cb): void                            │
│  └─ getState(): ProviderState                    │
│                                                  │
│  IAIProviderConfig (interface)                   │
│  ├─ provider: 'openai' | 'gemini' | 'claude'    │
│  ├─ model: string                                │
│  ├─ tools: ToolDeclaration[]                     │
│  ├─ systemInstructions: string                   │
│  ├─ modalities: ('text' | 'audio')[]             │
│  └─ temperature: number                          │
│                                                  │
│  IToolDeclaration (provider-agnostic)            │
│  ├─ name: string                                 │
│  ├─ description: string                          │
│  └─ parameters: JSONSchema                       │
└─────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│              INFRASTRUCTURE LAYER                │
│                                                  │
│  AIProviderFactory                               │
│  ├─ create(provider): IAIRealtimeProvider        │
│  └─ getSupportedProviders(): string[]            │
│                                                  │
│  OpenAIRealtimeProvider                          │
│  ├─ implements IAIRealtimeProvider               │
│  ├─ WebRTC + DataChannel (actual RealtimeClient) │
│  └─ Mapea OpenAI events → interfaz común         │
│                                                  │
│  GeminiRealtimeProvider (futuro)                 │
│  ├─ implements IAIRealtimeProvider               │
│  └─ WebSocket con Gemini Live API                │
│                                                  │
│  ClaudeRealtimeProvider (futuro)                 │
│  ├─ implements IAIRealtimeProvider               │
│  └─ HTTP Streaming con Claude API                │
│                                                  │
│  ToolDeclarationMapper                           │
│  ├─ toOpenAI(tool): OpenAIToolDeclaration        │
│  ├─ toGemini(tool): GeminiToolDeclaration        │
│  └─ toClaude(tool): ClaudeToolDeclaration        │
└─────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│              PRESENTATION LAYER                  │
│                                                  │
│  VoiceButton (sin cambios funcionales)           │
│  ├─ Abre VoiceModal al hacer clic               │
│  └─ Muestra badge de comandos restantes          │
│                                                  │
│  VoiceModal (NUEVO - reemplaza VoiceOverlay)     │
│  ├─ Botón push-to-talk grande central            │
│  ├─ Historial de conversación                    │
│  ├─ Transcripción en vivo (text-xs)              │
│  ├─ Indicadores de estado                        │
│  └─ Reproducción de audio TTS                    │
│                                                  │
│  VoiceProvider (refactorizado)                   │
│  ├─ Usa IAIRealtimeProvider en vez de            │
│  │  RealtimeClient directamente                  │
│  ├─ Gestiona conversación multi-turno            │
│  ├─ Valida transcript vacío                      │
│  └─ Mantiene historial de mensajes               │
└─────────────────────────────────────────────────┘
```

---

## Estructura de Archivos (Cambios)

```
src/
  domain/
    ports/                                    ← NUEVO directorio
      IAIRealtimeProvider.ts                  ← NUEVO: Interfaz del proveedor de IA
      IAIProviderConfig.ts                    ← NUEVO: Config agnóstica
      IToolDeclaration.ts                     ← NUEVO: Declaración de tool agnóstica
  infrastructure/
    voice-agent/
      config.ts                               ← MODIFICAR: System instructions conversacionales
      types.ts                                ← MODIFICAR: Agregar tipos agnósticos
      RealtimeClient.ts                       → RENOMBRAR a OpenAIRealtimeProvider.ts
      OpenAIRealtimeProvider.ts               ← NUEVO (refactor de RealtimeClient)
      AIProviderFactory.ts                    ← NUEVO: Factory de proveedores
      ToolDeclarationMapper.ts                ← NUEVO: Mapeo de tools entre proveedores
      GeminiRealtimeProvider.ts               ← NUEVO (stub para futuro)
      ClaudeRealtimeProvider.ts               ← NUEVO (stub para futuro)
      VoiceToolRegistry.ts                    ← SIN CAMBIOS
      tools/                                  ← SIN CAMBIOS en los tools existentes
        index.ts
        createExpenseTool.ts
        createIncomeTool.ts
        ...
  app/
    api/
      voice/
        session/
          route.ts                            ← MODIFICAR: Soportar multi-proveedor
  components/
    voice/
      VoiceButton.tsx                         ← MODIFICAR: Abrir modal en vez de iniciar
      VoiceOverlay.tsx                        → DEPRECAR (reemplazar por VoiceModal)
      VoiceModal.tsx                          ← NUEVO: Modal conversacional
      VoicePushToTalkButton.tsx               ← NUEVO: Botón push-to-talk
      VoiceConversationHistory.tsx            ← NUEVO: Historial de mensajes
      VoiceProvider.tsx                       ← MODIFICAR: Multi-turno + multi-proveedor
  application/
    hooks/
      useVoiceAgent.ts                        ← MODIFICAR: Exponer nuevas funcionalidades
```

---

## FASES DE IMPLEMENTACIÓN

---

### FASE 0: Preparación y Commit Inicial

**Commit**: `chore: snapshot pre-voice-conversational-refactor`  
**Tag**: `v1.x.x-pre-voice-refactor`

**Tareas:**

- [ ] 0.1 — Hacer commit de todo el estado actual del proyecto (git add + commit).
- [ ] 0.2 — Crear tag de versión actual: `git tag v1.x.x-pre-voice-refactor`.
- [ ] 0.3 — Crear branch de trabajo: `git checkout -b feature/voice-conversational`.
- [ ] 0.4 — Verificar que `npm run build` pasa sin errores.
- [ ] 0.5 — Verificar que los tests existentes pasan: `npm test`.

---

### FASE 1: Abstracción Multi-Proveedor (Domain + Infrastructure)

**Commit**: `feat(voice): add multi-provider AI abstraction layer`  
**Tag**: `v1.x.x-voice-phase1`

**Objetivo**: Crear la interfaz agnóstica de proveedor de IA y refactorizar `RealtimeClient` como implementación de OpenAI.

#### 1.1 — Crear interfaces en domain/ports/

**Archivo**: `src/domain/ports/IAIRealtimeProvider.ts`

```typescript
/**
 * Interfaz agnóstica para proveedores de IA en tiempo real.
 * Cualquier proveedor (OpenAI, Gemini, Claude) debe implementar esta interfaz.
 */
export type AIProviderState =
  | 'idle'
  | 'connecting'
  | 'ready'
  | 'recording'
  | 'processing'
  | 'executing'
  | 'error';

export interface AIFunctionCall {
  callId: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AISessionConfig {
  ephemeralToken: string;
  tools: AIToolDeclaration[];
  systemInstructions: string;
  modalities: ('text' | 'audio')[];
  temperature?: number;
  maxTokens?: number;
  voice?: string;
}

export interface AIToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface IAIRealtimeProvider {
  connect(config: AISessionConfig): Promise<void>;
  disconnect(): void;
  startAudioCapture(): Promise<void>;
  stopAudioCaptureAndProcess(): void;
  sendFunctionResult(callId: string, result: unknown): void;
  getState(): AIProviderState;

  // Event listeners
  onStateChange(cb: (state: AIProviderState) => void): void;
  onFunctionCall(cb: (call: AIFunctionCall) => void): void;
  onTranscript(cb: (text: string, isFinal: boolean) => void): void;
  onTextResponse(cb: (text: string, isFinal: boolean) => void): void;
  onAudioResponse(cb: (audioTrack: MediaStreamTrack) => void): void;
  onError(cb: (error: Error) => void): void;
  onRecordingTimeUpdate(cb: (timeLeft: number) => void): void;
}
```

#### 1.2 — Refactorizar RealtimeClient → OpenAIRealtimeProvider

**Archivo**: `src/infrastructure/voice-agent/OpenAIRealtimeProvider.ts`

- Renombrar la clase `RealtimeClient` → `OpenAIRealtimeProvider`.
- Implementar `IAIRealtimeProvider`.
- Extraer la captura de audio a métodos separados (`startAudioCapture`, `stopAudioCaptureAndProcess`).
- Mantener `RealtimeClient.ts` como re-export para backward compatibility durante la transición:
  ```typescript
  // RealtimeClient.ts (backward compat)
  export { OpenAIRealtimeProvider as RealtimeClient } from './OpenAIRealtimeProvider';
  export type { ... } from './OpenAIRealtimeProvider';
  ```
- Agregar soporte para audio output (reproducir remote audio track del peer connection).
- Deshabilitar VAD automático cuando se usa push-to-talk (pasar `turn_detection: null` en session.update).
- Implementar `startAudioCapture()`:
  - Si no hay mediaStream: solicitar `getUserMedia`.
  - Unmute audio tracks (o agregar tracks al peer connection).
- Implementar `stopAudioCaptureAndProcess()`:
  - Commit audio buffer (`input_audio_buffer.commit`).
  - Enviar `response.create`.
  - Mute audio tracks (no cerrar conexión).

#### 1.3 — Crear AIProviderFactory

**Archivo**: `src/infrastructure/voice-agent/AIProviderFactory.ts`

```typescript
export class AIProviderFactory {
  static create(provider: 'openai' | 'gemini' | 'claude'): IAIRealtimeProvider {
    switch (provider) {
      case 'openai':
        return new OpenAIRealtimeProvider();
      case 'gemini':
        throw new Error('Gemini provider not yet implemented');
      case 'claude':
        throw new Error('Claude provider not yet implemented');
      default:
        throw new Error(`Unknown AI provider: ${provider}`);
    }
  }

  static getSupportedProviders(): string[] {
    return ['openai']; // Agregar más cuando se implementen
  }
}
```

#### 1.4 — Crear ToolDeclarationMapper

**Archivo**: `src/infrastructure/voice-agent/ToolDeclarationMapper.ts`

- Convertir `AIToolDeclaration` → formato específico de cada proveedor.
- Para OpenAI: envolver en `{ type: 'function', name, description, parameters }`.
- Para Gemini (futuro): mapear a `FunctionDeclaration` de Gemini.
- Para Claude (futuro): mapear a `tool` schema de Claude.

#### 1.5 — Crear stubs de proveedores futuros

**Archivo**: `src/infrastructure/voice-agent/GeminiRealtimeProvider.ts`
**Archivo**: `src/infrastructure/voice-agent/ClaudeRealtimeProvider.ts`

- Crear clases que implementen `IAIRealtimeProvider`.
- Todos los métodos lanzan `Error('Not yet implemented')`.
- Incluir comentarios indicando qué API y protocolo usar (Gemini Live API WebSocket, Claude Streaming HTTP).

#### 1.6 — Agregar configuración de proveedor a APP_CONFIG

**Archivo**: `src/lib/constants/config.ts`

```typescript
// Agregar a APP_CONFIG:
aiProvider: (process.env.NEXT_PUBLIC_AI_PROVIDER as 'openai' | 'gemini' | 'claude') || 'openai',
```

#### 1.7 — Actualizar API route para multi-proveedor

**Archivo**: `src/app/api/voice/session/route.ts`

- Leer `provider` del body del request (default: 'openai').
- Según el proveedor, generar el token efímero correspondiente:
  - `openai` → POST a `https://api.openai.com/v1/realtime/sessions` (actual).
  - `gemini` → generar API key temporal o session token (futuro).
  - `claude` → generar session token (futuro).
- Devolver `{ ephemeralToken, provider, ... }`.

#### 1.8 — Tests unitarios de la abstracción

- Test que `AIProviderFactory.create('openai')` retorna instancia de `OpenAIRealtimeProvider`.
- Test que `AIProviderFactory.create('gemini')` lanza error descriptivo.
- Test de `ToolDeclarationMapper.toOpenAI()` mapea correctamente.

#### Validación de Fase 1:
- [ ] `npm run build` pasa sin errores.
- [ ] Tests existentes siguen pasando.
- [ ] El sistema de voz sigue funcionando como antes (backward compat via re-export).

---

### FASE 2: Sistema Instructions Conversacionales

**Commit**: `feat(voice): update system instructions for conversational flow`  
**Tag**: `v1.x.x-voice-phase2`

**Objetivo**: Cambiar el comportamiento de la IA para que valide información y converse en vez de ejecutar inmediatamente.

#### 2.1 — Refactorizar buildSystemInstructions() en config.ts

**Archivo**: `src/infrastructure/voice-agent/config.ts`

Cambios clave en las system instructions:

```
ANTIGUO: "NO hagas preguntas de confirmación, ejecuta INMEDIATAMENTE"
NUEVO:   "ANTES de ejecutar, VERIFICA que tienes TODA la información necesaria"

ANTIGUO: max_response_output_tokens: 150
NUEVO:   max_response_output_tokens: 300 (necesita más tokens para preguntas)

ANTIGUO: modalities: ['text']
NUEVO:   modalities: ['text', 'audio'] (habilitar TTS)

ANTIGUO: "Respuestas BREVES (máximo 12 palabras)"
NUEVO:   "Respuestas breves pero completas. Si necesitas preguntar, hazlo claro."
```

Nuevas reglas a agregar:

```markdown
## FLUJO DE VALIDACIÓN (OBLIGATORIO)

Antes de ejecutar create_expense o create_income, VERIFICA que tienes:
1. ✅ Monto (número positivo)
2. ✅ Tipo (gasto o ingreso - inferido del contexto)
3. ✅ Descripción (inferida de palabras clave)
4. ✅ Categoría (inferida del MAPEO o preguntada)
5. ✅ Cuenta (inferida o preguntada)

### SI FALTA INFORMACIÓN:
- Responde con voz preguntando SOLO lo que falta.
- Ejemplo: "¿Cuánto gastaste?" o "¿En qué cuenta lo registro?"
- NO ejecutes la acción hasta tener todo.
- Mantén el contexto de lo que ya te dijeron.

### SI TODO ESTÁ COMPLETO:
- Ejecuta la acción inmediatamente (sin pedir confirmación).
- Confirma con voz: "Listo, gasto de $15.000 registrado en Alimentación"

### REGLAS DE CONVERSACIÓN:
- Responde SIEMPRE en español.
- Usa un tono amigable y conciso.
- Si el usuario da una respuesta vaga, intenta inferir y ejecutar.
- Máximo 2 preguntas antes de ejecutar con lo que tengas.
```

#### 2.2 — Habilitar audio output (TTS) en la configuración

**Archivo**: `src/infrastructure/voice-agent/config.ts`

```typescript
modalities: ['text', 'audio'],  // Cambiar de ['text'] a ['text', 'audio']
```

#### 2.3 — Aumentar maxTokens para respuestas conversacionales

```typescript
maxTokens: 300,  // Cambiar de 150 a 300
```

#### Validación de Fase 2:
- [ ] Las system instructions nuevas son coherentes y no se contradicen.
- [ ] `npm run build` pasa sin errores.
- [ ] La config sigue exportando `buildSystemInstructions()` correctamente.

---

### FASE 3: VoiceModal con Push-to-Talk

**Commit**: `feat(voice): implement VoiceModal with push-to-talk and conversation history`  
**Tag**: `v1.x.x-voice-phase3`

**Objetivo**: Crear la nueva modal conversacional que reemplaza al VoiceOverlay.

#### 3.1 — Crear VoicePushToTalkButton

**Archivo**: `src/components/voice/VoicePushToTalkButton.tsx`

```
Componente: Botón circular grande (~120px) con icono de micrófono
Estados visuales:
  - idle: Gris con "Mantén presionado para hablar"
  - connecting: Azul con spinner "Conectando..."
  - recording: Rojo pulsante con ondas de audio "Escuchando..."
  - processing: Azul con spinner "Procesando..."
Eventos:
  - onPointerDown → props.onStartRecording()
  - onPointerUp → props.onStopRecording()
  - onPointerLeave → props.onStopRecording() (si sale del área)
Accesibilidad:
  - role="button"
  - aria-label descriptivo según estado
  - Soporte touch y mouse
```

#### 3.2 — Crear VoiceConversationHistory

**Archivo**: `src/components/voice/VoiceConversationHistory.tsx`

```
Componente: Lista scrollable de mensajes (como un mini-chat)
Props:
  - messages: Array<{ role: 'user' | 'assistant', text: string, timestamp: Date }>
  - isTranscribing: boolean
  - currentTranscript: string  (mensaje parcial del usuario)
UI:
  - Mensajes del usuario alineados a la derecha, fondo primario
  - Mensajes de la IA alineados a la izquierda, fondo muted
  - Scroll automático al último mensaje
  - Transcripción parcial mostrada como mensaje en progreso con "..."
  - Tamaño de letra: text-xs para transcripción en vivo, text-sm para mensajes finales
  - Max height con overflow-y-auto
```

#### 3.3 — Crear VoiceModal

**Archivo**: `src/components/voice/VoiceModal.tsx`

```
Componente: Modal fullscreen en mobile, centrada en desktop
Estructura:
  ┌────────────────────────────────┐
  │  Header: "Asistente de Voz" [X]│
  │                                │
  │  ┌──────────────────────────┐  │
  │  │  VoiceConversationHistory│  │  ← Scrollable, flex-1
  │  │  (mensajes del chat)     │  │
  │  └──────────────────────────┘  │
  │                                │
  │  ┌──────────────────────────┐  │
  │  │  Transcripción en vivo   │  │  ← text-xs, solo visible durante recording
  │  │  (lo que está diciendo)  │  │
  │  └──────────────────────────┘  │
  │                                │
  │      VoicePushToTalkButton     │  ← Botón grande central
  │   "Mantén presionado para      │
  │         hablar"                │
  │                                │
  │  Footer: X comandos restantes  │
  └────────────────────────────────┘

Props:
  - isOpen: boolean
  - onClose: () => void
Comportamiento:
  - NO se auto-cierra después de una ejecución (mantiene sesión).
  - Se cierra SOLO cuando el usuario presiona [X] o clic fuera.
  - Al cerrar: desconectar proveedor, limpiar historial.
  - Reproducción de audio TTS automática cuando la IA responde.
```

#### 3.4 — Agregar <audio> element para TTS

Dentro de `VoiceModal.tsx`:

```typescript
// Ref al elemento audio para TTS
const audioRef = useRef<HTMLAudioElement>(null);

// Cuando el proveedor envía audio track:
useEffect(() => {
  // El proveedor emite onAudioResponse con el MediaStreamTrack remoto
  // Conectar al <audio> element para reproducción automática
}, []);

// En el JSX:
<audio ref={audioRef} autoPlay />
```

#### 3.5 — Modificar VoiceButton para abrir modal

**Archivo**: `src/components/voice/VoiceButton.tsx`

Cambios:
- El `handleClick` ya NO llama `startCommand()`.
- El `handleClick` abre `VoiceModal` (setShowModal(true)).
- La conexión WebRTC se inicia **dentro** de VoiceModal al primer push-to-talk.
- Eliminar import de `VoiceOverlay`, reemplazar por `VoiceModal`.

```typescript
// ANTES:
const handleClick = async () => {
  if (!isAvailable || isActive) return;
  await startCommand();  // ← Conecta WebRTC inmediatamente
};

// DESPUÉS:
const handleClick = () => {
  if (!isAvailable) return;
  setShowModal(true);    // ← Solo abre la modal
};
```

#### 3.6 — Deprecar VoiceOverlay.tsx

- Agregar comentario `@deprecated` al inicio del archivo.
- No eliminar aún (backward compat).
- En el futuro se puede eliminar cuando VoiceModal esté estable.

#### Validación de Fase 3:
- [ ] Modal se abre al presionar botón de micrófono.
- [ ] Botón push-to-talk tiene estados visuales correctos.
- [ ] Historial de conversación muestra mensajes.
- [ ] Modal no se auto-cierra.
- [ ] `npm run build` pasa sin errores.

---

### FASE 4: Refactorizar VoiceProvider para Multi-Turno

**Commit**: `feat(voice): refactor VoiceProvider for multi-turn conversation`  
**Tag**: `v1.x.x-voice-phase4`

**Objetivo**: El VoiceProvider gestiona conversación multi-turno, validación de vacío, y usa la abstracción de proveedor.

#### 4.1 — Agregar estado de conversación al VoiceProvider

**Archivo**: `src/components/voice/VoiceProvider.tsx`

Nuevos estados:

```typescript
// Historial de conversación
interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  audioPlayed?: boolean;
}

const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
const [isSessionActive, setIsSessionActive] = useState(false);
```

#### 4.2 — Separar conexión de grabación

```typescript
// NUEVO: Conectar solo establece la sesión WebRTC
const connectSession = useCallback(async () => {
  // Solicitar ephemeral token
  // Conectar proveedor
  // Registrar listeners
  setIsSessionActive(true);
}, []);

// NUEVO: Iniciar grabación (push-to-talk down)
const startRecording = useCallback(async () => {
  if (!isSessionActive) {
    await connectSession();
  }
  provider.startAudioCapture();
}, []);

// NUEVO: Detener grabación (push-to-talk up)
const stopRecording = useCallback(() => {
  // Verificar que hay transcript
  if (transcript.trim().length === 0) {
    // NO enviar a IA, mostrar feedback
    setError('No se detectó audio. Intenta de nuevo.');
    return;
  }
  
  // Agregar mensaje del usuario al historial
  addMessage({ role: 'user', text: transcript });
  
  // Commit y procesar
  provider.stopAudioCaptureAndProcess();
}, []);

// NUEVO: Cerrar sesión completa
const endSession = useCallback(() => {
  provider.disconnect();
  setIsSessionActive(false);
  setConversationHistory([]);
  setTranscript('');
  setResponse('');
}, []);
```

#### 4.3 — Gestionar respuestas de la IA como mensajes

```typescript
// En el listener de texto de la IA:
client.onTextResponse((text: string, isFinal: boolean) => {
  setResponse(text);
  if (isFinal && text.trim()) {
    addMessage({ role: 'assistant', text });
  }
});
```

#### 4.4 — NO auto-cerrar después de ejecución

Eliminar el auto-close timer del overlay actual. Después de ejecutar un tool:
- Agregar mensaje de confirmación al historial.
- Mantener sesión abierta.
- Resetear transcript para el siguiente turno.
- El usuario decide cuándo cerrar.

#### 4.5 — Validación de transcript vacío

```typescript
const stopRecording = useCallback(() => {
  if (transcript.trim().length === 0) {
    // Feedback sin gastar tokens
    toast.info('No se detectó audio', {
      description: 'Mantén presionado el botón mientras hablas.',
    });
    return; // ← NO se envía a IA
  }
  // ... procesar normalmente
}, [transcript]);
```

#### 4.6 — Usar AIProviderFactory en vez de RealtimeClient directo

```typescript
// ANTES:
clientRef.current = new RealtimeClient();

// DESPUÉS:
import { AIProviderFactory } from '@/infrastructure/voice-agent/AIProviderFactory';
import { APP_CONFIG } from '@/lib/constants/config';

providerRef.current = AIProviderFactory.create(APP_CONFIG.aiProvider);
```

#### 4.7 — Actualizar interfaz del contexto

```typescript
interface VoiceContextType {
  // Estado
  state: VoiceAgentState;
  isAvailable: boolean;
  isSessionActive: boolean;           // ← NUEVO
  
  // Acciones
  openModal: () => void;              // ← NUEVO
  closeModal: () => void;             // ← NUEVO
  startRecording: () => Promise<void>; // ← NUEVO (reemplaza startCommand)
  stopRecording: () => void;           // ← NUEVO
  endSession: () => void;             // ← NUEVO (reemplaza cancelCommand)
  
  // Datos
  transcript: string;
  response: string;
  error: string | null;
  commandsRemainingToday: number;
  recordingTimeLeft: number;
  conversationHistory: ConversationMessage[]; // ← NUEVO
  
  // Backward compat (deprecados, se pueden eliminar después)
  startCommand: () => Promise<void>;   // ← alias de connectSession + startRecording
  cancelCommand: () => void;           // ← alias de endSession
  forceCommitAudio: () => void;        // ← alias de stopRecording
}
```

#### 4.8 — Actualizar useVoiceAgent hook

**Archivo**: `src/application/hooks/useVoiceAgent.ts`

Agregar derived flags:

```typescript
return {
  ...context,
  // Derived
  isActive: context.state !== 'idle',
  isRecording: context.state === 'recording',
  isProcessing: context.state === 'processing',
  isExecuting: context.state === 'executing',
  hasError: context.state === 'error',
  isConversing: context.isSessionActive && context.state !== 'idle',
};
```

#### Validación de Fase 4:
- [ ] La conversación mantiene contexto entre turnos.
- [ ] Transcript vacío no consume tokens.
- [ ] Historial de mensajes se muestra correctamente.
- [ ] La sesión se mantiene abierta hasta que el usuario cierra.
- [ ] `npm run build` pasa sin errores.
- [ ] Tests existentes no se rompen.

---

### FASE 5: Integración de Audio TTS (Respuesta con Voz)

**Commit**: `feat(voice): integrate TTS audio output for AI responses`  
**Tag**: `v1.x.x-voice-phase5`

**Objetivo**: La IA responde con audio cuando falta información o confirma una acción.

#### 5.1 — Configurar audio output en OpenAIRealtimeProvider

En el método `connect()`, configurar para recibir audio remoto:

```typescript
// Escuchar tracks de audio remotos
this.peerConnection.ontrack = (event) => {
  const [remoteStream] = event.streams;
  if (remoteStream) {
    const audioTrack = remoteStream.getAudioTracks()[0];
    if (audioTrack && this.onAudioResponseCallback) {
      this.onAudioResponseCallback(audioTrack);
    }
  }
};
```

#### 5.2 — Conectar audio track al <audio> element en VoiceModal

```typescript
// En VoiceModal:
const audioRef = useRef<HTMLAudioElement>(null);

// Cuando se recibe audio track:
const handleAudioResponse = useCallback((track: MediaStreamTrack) => {
  if (audioRef.current) {
    const stream = new MediaStream([track]);
    audioRef.current.srcObject = stream;
    audioRef.current.play().catch(console.error);
  }
}, []);
```

#### 5.3 — Agregar indicador visual de "IA hablando"

En VoiceModal, cuando hay audio reproduciéndose:
- Mostrar icono de altavoz animado junto al último mensaje de la IA.
- El botón push-to-talk se deshabilita brevemente mientras la IA habla (evitar interrupciones).

#### 5.4 — Fallback a texto si TTS falla

Si el audio no se puede reproducir (móvil sin permisos de autoplay):
- Mostrar solo texto.
- No bloquear el flujo.

#### Validación de Fase 5:
- [ ] La IA responde con audio cuando falta info.
- [ ] La IA confirma con audio después de ejecutar acción.
- [ ] El audio se reproduce automáticamente.
- [ ] Si TTS falla, el texto sigue visible.
- [ ] `npm run build` pasa sin errores.

---

### FASE 6: Push-to-Talk en OpenAIRealtimeProvider

**Commit**: `feat(voice): implement push-to-talk audio control in provider`  
**Tag**: `v1.x.x-voice-phase6`

**Objetivo**: Control manual del audio en lugar de VAD automático.

#### 6.1 — Deshabilitar VAD en session.update

En `sendSessionUpdate()`:

```typescript
// ANTES:
turn_detection: {
  type: 'server_vad',
  threshold: 0.8,
  ...
}

// DESPUÉS (push-to-talk):
turn_detection: null,  // Desactivar VAD, control manual
```

#### 6.2 — Implementar startAudioCapture()

```typescript
async startAudioCapture(): Promise<void> {
  if (!this.mediaStream) {
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaStream.getTracks().forEach(track => {
      this.peerConnection!.addTrack(track, this.mediaStream!);
    });
  }
  
  // Unmute audio tracks
  this.mediaStream.getAudioTracks().forEach(track => {
    track.enabled = true;
  });
  
  this.startRecordingTimer();
  this.setState('recording');
}
```

#### 6.3 — Implementar stopAudioCaptureAndProcess()

```typescript
stopAudioCaptureAndProcess(): void {
  // Mute audio tracks (no cerrar stream)
  if (this.mediaStream) {
    this.mediaStream.getAudioTracks().forEach(track => {
      track.enabled = false;
    });
  }
  
  this.stopRecordingTimer();
  
  // Commit buffer y solicitar respuesta
  this.sendEvent({ type: 'input_audio_buffer.commit' });
  this.sendEvent({ type: 'response.create' });
  
  this.setState('processing');
}
```

#### 6.4 — Gestión de audio tracks para multi-turno

El mediaStream se crea UNA vez al primer `startAudioCapture()` y se reutiliza en turnos siguientes. Solo se hace `track.enabled = true/false` para mute/unmute, lo cual es más eficiente que crear/destruir streams.

#### 6.5 — Ajustar timer de grabación para multi-turno

El timer de 15 segundos se resetea en cada turno, no acumula.

#### Validación de Fase 6:
- [ ] Audio solo se captura mientras el botón está presionado.
- [ ] Al soltar, el audio se procesa.
- [ ] Se puede grabar múltiples veces en la misma sesión.
- [ ] Timer de 15s funciona por turno.
- [ ] `npm run build` pasa sin errores.

---

### FASE 7: Tests y Estabilización

**Commit**: `test(voice): add tests for conversational voice system`  
**Tag**: `v1.x.x-voice-phase7`

**Objetivo**: Asegurar calidad y estabilidad del sistema refactorizado.

#### 7.1 — Tests unitarios de IAIRealtimeProvider interface compliance

```typescript
// Verificar que OpenAIRealtimeProvider implementa todos los métodos
describe('OpenAIRealtimeProvider', () => {
  it('implements IAIRealtimeProvider interface', () => { ... });
  it('transitions states correctly', () => { ... });
  it('handles disconnect cleanup', () => { ... });
});
```

#### 7.2 — Tests unitarios de AIProviderFactory

```typescript
describe('AIProviderFactory', () => {
  it('creates OpenAI provider', () => { ... });
  it('throws for unsupported providers', () => { ... });
  it('reports supported providers', () => { ... });
});
```

#### 7.3 — Tests de VoiceProvider multi-turno

```typescript
describe('VoiceProvider', () => {
  it('maintains conversation history across turns', () => { ... });
  it('does not process empty transcript', () => { ... });
  it('keeps session open after tool execution', () => { ... });
  it('clears state on endSession', () => { ... });
});
```

#### 7.4 — Tests de componentes UI

```typescript
describe('VoicePushToTalkButton', () => {
  it('calls onStartRecording on pointerdown', () => { ... });
  it('calls onStopRecording on pointerup', () => { ... });
  it('calls onStopRecording on pointerleave', () => { ... });
  it('shows correct state visuals', () => { ... });
});

describe('VoiceModal', () => {
  it('opens and closes correctly', () => { ... });
  it('shows conversation history', () => { ... });
  it('does not auto-close after execution', () => { ... });
});
```

#### 7.5 — Test de integración del flujo completo (mock de proveedor)

```typescript
describe('Voice Conversational Flow', () => {
  it('full flow: open modal → push-to-talk → AI asks for info → user provides → execute', () => { ... });
});
```

#### Validación de Fase 7:
- [ ] Todos los tests nuevos pasan.
- [ ] Tests existentes siguen pasando.
- [ ] `npm run build` pasa sin errores.
- [ ] Coverage de la capa de voz > 80%.

---

### FASE 8: Limpieza y Merge

**Commit**: `chore(voice): cleanup deprecated files and finalize conversational voice system`  
**Tag**: `v2.0.0-voice-conversational`

#### 8.1 — Eliminar VoiceOverlay.tsx (si VoiceModal está estable)
#### 8.2 — Eliminar backward compat re-export de RealtimeClient.ts
#### 8.3 — Actualizar VOICE_LIMITS para producción

```typescript
maxCommandsPerDay: 10,  // Volver a 10 para producción
```

#### 8.4 — Revisar y limpiar console.logs de debugging
#### 8.5 — Actualizar README con documentación del sistema de voz
#### 8.6 — Merge branch `feature/voice-conversational` → `main`
#### 8.7 — Tag final: `v2.0.0-voice-conversational`

---

## Resumen de Commits y Tags

| Fase | Commit | Tag |
|---|---|---|
| 0 | `chore: snapshot pre-voice-conversational-refactor` | `v1.x.x-pre-voice-refactor` |
| 1 | `feat(voice): add multi-provider AI abstraction layer` | `v1.x.x-voice-phase1` |
| 2 | `feat(voice): update system instructions for conversational flow` | `v1.x.x-voice-phase2` |
| 3 | `feat(voice): implement VoiceModal with push-to-talk and conversation history` | `v1.x.x-voice-phase3` |
| 4 | `feat(voice): refactor VoiceProvider for multi-turn conversation` | `v1.x.x-voice-phase4` |
| 5 | `feat(voice): integrate TTS audio output for AI responses` | `v1.x.x-voice-phase5` |
| 6 | `feat(voice): implement push-to-talk audio control in provider` | `v1.x.x-voice-phase6` |
| 7 | `test(voice): add tests for conversational voice system` | `v1.x.x-voice-phase7` |
| 8 | `chore(voice): cleanup deprecated files and finalize` | `v2.0.0-voice-conversational` |

---

## Variables de Entorno Requeridas

```env
# Existentes (sin cambio)
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_ENABLE_VOICE_AGENT=true

# Nuevas
NEXT_PUBLIC_AI_PROVIDER=openai          # openai | gemini | claude
GOOGLE_GEMINI_API_KEY=                   # Para futuro Gemini
ANTHROPIC_API_KEY=                       # Para futuro Claude
```

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| OpenAI Realtime API no soporta `turn_detection: null` bien | Media | Alto | Fallback a VAD con threshold alto (0.95). Testear exhaustivamente. |
| Autoplay de audio bloqueado en mobile | Alta | Medio | El primer push-to-talk cuenta como interacción del usuario, lo que desbloquea autoplay. Fallback a texto. |
| Sesión WebRTC se desconecta por timeout | Media | Medio | Implementar reconexión automática al siguiente push-to-talk si la sesión expiró. |
| Costos aumentan con TTS habilitado | Baja | Medio | Monitorear costos. El rate limit de 10/día ya los controla. |
| Romper flujos existentes | Baja | Alto | Branch separado + commit inicial + tags. Backward compat layer. Tests de regresión. |

---

## Criterios de Aceptación Final

- [ ] Al presionar botón mic se abre modal con botón grande de "Mantén presionado para hablar".
- [ ] Al mantener presionado, se graba audio y aparece transcripción en vivo (text-xs).
- [ ] Al soltar, si hay texto se envía a procesar; si está vacío, no se gasta IA.
- [ ] Si la IA necesita más info, responde con AUDIO preguntando.
- [ ] El usuario puede responder con otro push-to-talk (conversación multi-turno).
- [ ] La sesión mantiene contexto hasta que el usuario cierra.
- [ ] config.ts con system instructions guía correctamente a la IA.
- [ ] Cambiar de proveedor de IA requiere solo cambiar `NEXT_PUBLIC_AI_PROVIDER`.
- [ ] Los flujos existentes (transacciones manuales, dashboard, etc.) no se ven afectados.
