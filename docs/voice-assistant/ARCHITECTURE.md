# Arquitectura del Asistente de Voz

Documentación técnica de la arquitectura interna del sistema de voz.

## 📐 Principios de Diseño

El sistema sigue **Clean Architecture** con estas premisas:

1. **Separación de responsabilidades** (SoC)
2. **Dependencias hacia adentro** (DI)
3. **Estado predecible** (State Machine)
4. **Testabilidad** (Inyección de dependencias)
5. **Simplicidad** (YAGNI, KISS)

---

## 🏗️ Capas de la Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  (VoiceModal, VoicePushToTalkButton, VoiceProvider)     │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                  Application Layer                       │
│      (useVoiceAgent, useVoiceLogger, Validators)        │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                    Domain Layer                          │
│  (IVoiceProvider, VoiceToolRegistry, Use Cases)         │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                Infrastructure Layer                      │
│  (GeminiVoiceProvider, VoiceStateMachine, Firebase)     │
└─────────────────────────────────────────────────────────┘
```

---

## 🧩 Componentes Principales

### 1. VoiceProvider (Orchestrator)

**Ubicación:** `src/components/voice/VoiceProvider.tsx`

**Responsabilidades:**
- Gestionar ciclo de vida de la sesión de voz
- Orquestar interacciones entre componentes
- Exponer estado a través de React Context
- Coordinar conexión, grabación, y ejecución

**Dependencias:**
```typescript
- VoiceStateMachine      // Estado centralizado
- VoiceToolExecutor      // Ejecución de tools
- GeminiVoiceProvider    // Implementación de IA
- useVoiceLogger         // Logging transparente
```

**Estado expuesto:**
```typescript
interface VoiceContextType {
  state: VoiceAgentState;           // idle | connecting | ready | recording | processing | executing | error
  isAvailable: boolean;             // Sistema disponible
  isSessionActive: boolean;         // Sesión conectada
  currentExecutingTool: string | null;
  transcript: string;
  response: string;
  error: VoiceError | null;
  commandsRemainingToday: number;
  recordingTimeLeft: number;
  conversationHistory: ConversationMessage[];
  
  // Acciones
  openModal: () => void;
  closeModal: () => void;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  endSession: () => void;
  prepareSession: () => Promise<void>;
}
```

---

### 2. VoiceStateMachine (State Management)

**Ubicación:** `src/infrastructure/voice-agent/VoiceStateMachine.ts`

**Propósito:** Fuente única de verdad para el estado del sistema.

**Estados (Discriminated Union):**
```typescript
type VoiceState =
  | { status: 'idle' }
  | { status: 'connecting' }
  | { status: 'ready' }
  | { status: 'recording'; transcript: string; timeLeft: number }
  | { status: 'processing'; transcript: string }
  | { status: 'executing'; toolName: string; toolLabel: string }
  | { status: 'responding'; response: string }
  | { status: 'error'; error: VoiceError };
```

**Eventos:**
```typescript
type VoiceEvent =
  | { type: 'CONNECT' }
  | { type: 'CONNECTED' }
  | { type: 'START_RECORDING' }
  | { type: 'TRANSCRIPT_UPDATE'; transcript: string; timeLeft: number }
  | { type: 'STOP_RECORDING'; transcript: string }
  | { type: 'FUNCTION_CALL'; toolName: string; toolLabel: string }
  | { type: 'RESPONSE'; text: string }
  | { type: 'READY' }
  | { type: 'ERROR'; error: VoiceError }
  | { type: 'DISCONNECT' };
```

**Diagrama de transiciones:**
```
┌──────┐  CONNECT   ┌────────────┐  CONNECTED   ┌───────┐
│ IDLE ├───────────►│ CONNECTING ├─────────────►│ READY │
└──────┘            └─────┬──────┘               └───┬───┘
                          │                          │
                          │ ERROR                    │ START_RECORDING
                          ▼                          ▼
                    ┌───────┐               ┌───────────┐
                    │ ERROR │               │ RECORDING │
                    └───┬───┘               └─────┬─────┘
                        │                         │
                        │ READY                   │ STOP_RECORDING
                        │                         ▼
                        │                   ┌────────────┐
                        │                   │ PROCESSING │
                        │                   └──────┬─────┘
                        │                          │
                        │                 FUNCTION_CALL │ RESPONSE
                        │                          │
                        │                   ┌──────▼──────┐
                        └───────────────────┤  EXECUTING  │
                                            └──────┬──────┘
                                                   │ RESPONSE
                                                   ▼
                                            ┌─────────────┐
                                            │ RESPONDING  │
                                            └──────┬──────┘
                                                   │ READY
                                                   ▼
                                            (back to READY)
```

**Ventajas:**
- Estado predecible e inmutable
- Transiciones explícitas y trackeables
- Fácil de debuggear (logs de transiciones)
- Testeable sin dependencias externas

---

### 3. GeminiVoiceProvider (AI Integration)

**Ubicación:** `src/infrastructure/voice-agent/GeminiVoiceProvider.ts`

**Implementa:** `IVoiceProvider`

**Responsabilidades:**
- Integración con Gemini 2.5 Flash-Lite
- Captura de audio vía Web Speech API
- Envío de transcripciones a Gemini
- Procesamiento de function calls
- Síntesis de voz (TTS)

**Flujo de operación:**
```
1. connect()          → Obtener ephemeral token
2. startRecording()   → Iniciar Web Speech API
3. onTranscript       → Callback con transcripción parcial
4. stopRecording()    → Finalizar captura
5. callGeminiAPI()    → Enviar texto a Gemini
6. parseFunctionCalls → Detectar function calls
7. onFunctionCall     → Ejecutar tool
8. sendFunctionResult → Enviar resultado a Gemini
9. synthesizeSpeech() → TTS de respuesta
```

**Optimizaciones:**
- Pre-loading de contexto (cuentas, categorías)
- Reutilización de conversación (multi-turno)
- Callbacks simplificados (sin `isFinal`)

---

### 4. VoiceToolExecutor (Tool Execution)

**Ubicación:** `src/infrastructure/voice-agent/VoiceToolExecutor.ts`

**Responsabilidades:**
- Ejecutar tools del registry
- Formatear resultados para la IA
- Determinar tipo de tool (action vs query)
- Obtener queries a invalidar

**Métodos:**
```typescript
execute(functionCall, context): Promise<ToolExecutionResult>
formatResult(executionResult): unknown
isActionTool(toolName): boolean
getQueriesToInvalidate(executionResult, orgId): string[][]
```

**Separación de tools:**
- **Action tools:** `create_*`, `update_*`, `delete_*`
  - Retornan solo mensaje para TTS
  - Invalidan cache de React Query
  - Muestran toast de confirmación
- **Query tools:** `get_*`, `list_*`
  - Retornan JSON completo
  - No invalidan cache
  - No muestran toast

---

### 5. VoiceToolRegistry (Tool Management)

**Ubicación:** `src/infrastructure/voice-agent/VoiceToolRegistry.ts`

**Responsabilidades:**
- Registro centralizado de tools
- Validación de declaraciones
- Lookup por nombre

**Tools registrados:**
```typescript
- create_expense       // Crear gasto
- create_income        // Crear ingreso
- get_balance          // Consultar saldo
- get_dashboard_summary // Resumen del dashboard
- list_accounts        // Listar cuentas (deprecated con pre-loading)
- list_categories      // Listar categorías (deprecated con pre-loading)
```

**Metadata de tools:**
```typescript
interface VoiceToolMetadata {
  type: 'action' | 'query';
  invalidates?: string[];  // Query keys a invalidar
}
```

---

### 6. VoiceErrorHandler (Error Management)

**Ubicación:** `src/infrastructure/voice-agent/VoiceErrorHandler.ts`

**Responsabilidades:**
- Transformar errores genéricos en VoiceError estructurados
- Agregar contexto y recovery actions
- Normalizar mensajes de error

**Tipos de errores:**
```typescript
- MICROPHONE_PERMISSION_DENIED  // Permiso denegado
- MICROPHONE_NOT_FOUND          // Sin micrófono
- BROWSER_NOT_SUPPORTED         // Navegador incompatible
- NO_AUDIO_DETECTED             // Sin audio capturado
- NETWORK_ERROR                 // Error de conexión
- RATE_LIMIT_EXCEEDED           // Límite diario alcanzado
- UNKNOWN_ERROR                 // Error genérico
```

**Recovery actions:**
```typescript
interface VoiceError {
  code: string;
  message: string;
  description?: string;
  recoveryAction?: {
    label: string;
    handler: () => void;
  };
}
```

---

### 7. VoiceMetrics (Telemetry)

**Ubicación:** `src/infrastructure/voice-agent/VoiceMetrics.ts`

**Responsabilidades:**
- Capturar métricas de performance
- Trackear success/error rates
- Integración con analytics externos

**Métricas capturadas:**
```typescript
- connection_duration_ms       // Tiempo de conexión
- connection_success          // Conexiones exitosas
- connection_error            // Errores de conexión
- recording_started           // Grabaciones iniciadas
- tool_execution_duration_ms  // Tiempo de ejecución de tool
- tool_success                // Tools exitosos
- tool_error                  // Errores de tools
```

**Helpers:**
```typescript
startTimer(label): () => void  // Medir duración
voiceMetrics.track(name, value, metadata)
voiceMetrics.getAverageByName(name)
voiceMetrics.getSummary()
```

---

### 8. useVoiceLogger (Logging)

**Ubicación:** `src/application/hooks/useVoiceLogger.ts`

**Responsabilidades:**
- Logging transparente de comandos
- Integración con Firebase
- No bloquea flujo principal

**Datos loggeados:**
```typescript
interface VoiceCommandLog {
  transcription: string;
  toolsExecuted: string[];
  tokensUsed: number;
  success: boolean;
  errorMessage?: string;
  timestamp: number;
}
```

---

## 🔄 Flujo Completo (Happy Path)

```
1. Usuario abre modal
   └─► VoiceProvider.openModal()
   └─► (Opcional) VoiceProvider.prepareSession()  // Pre-conectar

2. Usuario presiona botón PTT (Push-To-Talk)
   └─► VoiceProvider.startRecording()
   └─► StateMachine.send(START_RECORDING)
   └─► GeminiVoiceProvider.startRecording()
   └─► Web Speech API inicia captura

3. Usuario habla (15 segundos max)
   └─► Web Speech API → onTranscript callback
   └─► StateMachine.send(TRANSCRIPT_UPDATE)
   └─► UI actualiza transcripción en tiempo real

4. Usuario suelta botón PTT
   └─► VoiceProvider.stopRecording()
   └─► StateMachine.send(STOP_RECORDING)
   └─► GeminiVoiceProvider.stopRecording()
   └─► StateMachine → status: 'processing'

5. Gemini procesa comando
   └─► GeminiVoiceProvider.callGeminiAPI(transcript)
   └─► Gemini analiza texto + contexto pre-cargado
   └─► Gemini decide ejecutar function call: create_expense

6. Ejecución de tool
   └─► GeminiVoiceProvider.onFunctionCall(functionCall)
   └─► VoiceProvider.handleFunctionCall()
   └─► StateMachine.send(FUNCTION_CALL)
   └─► VoiceToolExecutor.execute(functionCall)
   └─► createExpenseTool.execute()
   └─► Use case → Repository → Firebase

7. Invalidación de cache
   └─► VoiceToolExecutor.getQueriesToInvalidate()
   └─► queryClient.invalidateQueries(['transactions', 'accounts'])

8. Respuesta al usuario
   └─► Tool retorna resultado exitoso
   └─► VoiceToolExecutor.formatResult() → solo mensaje
   └─► GeminiVoiceProvider.sendFunctionResult()
   └─► Gemini genera confirmación: "Registrado"
   └─► StateMachine.send(RESPONSE)
   └─► GeminiVoiceProvider.synthesizeSpeech("Registrado")
   └─► UI muestra Toast: "💸 Gasto registrado"

9. Logging y métricas
   └─► useVoiceLogger.logCommand(successData)
   └─► voiceMetrics.track('tool_success')
   └─► Firebase almacena log

10. Volver a estado ready
    └─► StateMachine.send(READY)
    └─► Usuario puede hacer otro comando
```

---

## 🧪 Testing

### Unit Tests
```typescript
// VoiceStateMachine
test('should transition from recording to processing');
test('should handle error events correctly');

// VoiceToolExecutor
test('should format action tool results correctly');
test('should determine action vs query tools');

// VoiceErrorHandler
test('should create recovery actions for microphone errors');
```

### Integration Tests
```typescript
// GeminiVoiceProvider
test('should call Gemini API with correct payload');
test('should parse function calls from response');
```

### E2E Tests (Playwright)
```typescript
test('should open voice modal when clicking button');
test('should show PTT button in modal');
test('should close modal when clicking close button');
```

---

## 📦 Dependencias Externas

```json
{
  "@google/genai": "^0.21.0",       // Gemini SDK
  "firebase": "^11.1.0",             // Backend
  "react-query": "^5.62.11",         // State management
  "sonner": "^1.7.3",                // Toast notifications
  "zod": "^3.24.1"                   // Validación
}
```

---

## 🔐 Seguridad

1. **Autenticación:** Firebase Auth token en cada request
2. **Autorización:** Verificación de userId y orgId
3. **Rate limiting:** 10 comandos/día por usuario
4. **Validación:** Zod schemas en todos los tools
5. **Sanitización:** Escape de inputs en mensajes

---

## 🚀 Performance

### Optimizaciones implementadas:
1. **Pre-loading de contexto:** Evita 3 function calls
2. **Lazy loading:** No auto-conectar hasta que usuario abre modal
3. **Reutilización de sesión:** Multi-turno sin reconectar
4. **Cache de React Query:** Evita fetches innecesarios
5. **Debouncing de transcript:** Solo enviar when final

### Métricas objetivo:
- **Conexión:** < 1s
- **Grabación:** Sin lag
- **Procesamiento:** < 2s
- **Tool execution:** < 500ms
- **Total (first command):** < 3s

---

## 📚 Referencias

- [Clean Architecture (Robert C. Martin)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Finite State Machines](https://en.wikipedia.org/wiki/Finite-state_machine)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Gemini API Docs](https://ai.google.dev/gemini-api/docs)

---

**Última actualización:** Abril 2026  
**Versión:** 2.0 (Post-refactor arquitectónico)
