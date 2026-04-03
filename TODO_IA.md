# TODO_IA.md — Plan de Implementación: Agente de Voz con IA

## Objetivo

Implementar un botón de voz flotante que permita al usuario dar **comandos de voz cortos** (máximo 15 segundos). La IA interpreta la intención y ejecuta acciones dentro de la aplicación financiera (crear transacciones, consultar saldos, navegar, etc.) sin respuesta de voz, solo confirmación visual. Utiliza **OpenAI Realtime API** con **Function Calling** en modo texto.

**Modelo de uso:**
- Usuario presiona botón → Habla (max 15s) → Comando se procesa → Acción se ejecuta → Confirmación visual
- **SIN** respuesta de audio de la IA (solo texto en overlay + toast notifications)
- Límites: 10 comandos/día, 15 segundos por comando, 3 function calls por comando

## Repositorio de Referencia

- **[openai/openai-realtime-agents](https://github.com/openai/openai-realtime-agents)** — Next.js + TypeScript + Realtime API + Tool Use

## Principios de Implementación

- **Clean Architecture**: La IA se integra como una capa de infraestructura que invoca Use Cases existentes, nunca accede directamente a repositorios ni Firestore
- **DRY**: Se reutilizan los Use Cases, DTOs, validadores y hooks ya existentes — no se duplica lógica de negocio
- **Desacoplamiento**: El módulo de IA es aislado; puede desactivarse con un feature flag sin afectar nada
- **Escalabilidad**: Las herramientas (tools) se definen de forma declarativa y se registran en un registry desacoplado
- **Mantenibilidad**: Cada pieza tiene responsabilidad única; tests unitarios y de integración por fase
- **Pipeline definido**: Audio → WebRTC → OpenAI Realtime API → Function Call → Use Case → Respuesta → UI
- **Zero impacto**: Nada de lo existente se modifica salvo agregar el botón y un provider. Los archivos existentes NO se alteran en su lógica

## Esquema de Versionado (Tags)

Convención: `v2.0.0-ia-fase-{N}-{descripcion}`

Partimos de `v2.0.0` porque la app está en `v1.0.0` con mejoras mobile `v-mobile-5.0`.

## Pipeline de la Funcionalidad

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE (Browser)                         │
│                                                              │
│  [Botón Mic] → getUserMedia →Grabar 15s → Enviar audio ────┤
│                                                              │
│  ←── Respuesta TEXTO + Confirmación Visual ─────────────────│
└──────────────────────┬───────────────────────────────────────┘
                       │ WebRTC (via API Route proxy)
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                  NEXT.JS API ROUTE (Server)                   │
│                                                              │
│  POST /api/voice/session                                     │
│    → Valida autenticación (Firebase)                         │
│    → Verifica rate limiting (10 comandos/día)                │
│    → Genera ephemeral token OpenAI (modalities: ['text'])   │
│    → Retorna token + contexto usuario                        │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                    OPENAI REALTIME API                        │
│                  (Modo: Audio Input → Text Output)           │
│                                                              │
│  Recibe audio (max 15s) → Transcribe → Analiza intención    │
│  Devuelve:                                                   │
│    - Transcripción (texto)                                   │
│    - functionCall { name, arguments, call_id }               │
│    - Respuesta en TEXTO (sin TTS)                            │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                  VOICE TOOL EXECUTOR (Client)                │
│                                                              │
│  Recibe functionCall → Valida args (Zod) → DIContainer      │
│  Ejecuta Use Case → Invalida React Query cache               │
│  Muestra confirmación:                                       │
│    - Toast notification: "✓ Gasto de $15.000 creado"        │
│    - Cierra overlay automáticamente                          │
│    - Actualiza UI con datos nuevos                           │
└──────────────────────────────────────────────────────────────┘
```

---

## FASES DE IMPLEMENTACIÓN

---

### FASE 0: Setup Inicial y Commit Base
**Tag**: `v2.0.0-ia-fase-0-setup`

- [ ] Crear la estructura de carpetas para el módulo de IA sin tocar archivos existentes:
  ```
  src/
    infrastructure/
      voice-agent/
        types.ts              # Tipos e interfaces del módulo
        VoiceToolRegistry.ts  # Registry de herramientas disponibles
        tools/                # Declaraciones de tools para OpenAI
          index.ts
        config.ts             # Configuración del agente (model, instructions)
    application/
      hooks/
        useVoiceAgent.ts      # Hook principal del agente de voz
    components/
      voice/
        VoiceButton.tsx       # Botón flotante de micrófono
        VoiceOverlay.tsx      # Overlay visual durante la conversación
        VoiceProvider.tsx     # Context provider del agente de voz
  ```
- [ ] Agregar variable de entorno `OPENAI_API_KEY` al `.env.local` (solo server-side, NO `NEXT_PUBLIC_`)
- [ ] Agregar variable de entorno `NEXT_PUBLIC_ENABLE_VOICE_AGENT=false` como feature flag
- [ ] Agregar al `APP_CONFIG` en `config.ts` el flag: `enableVoiceAgent`
- [ ] Agregar dependencia: `npm install openai` (SDK para generar ephemeral tokens en el server)
- [ ] Crear API Route `src/app/api/voice/session/route.ts` como stub (retorna 501)
- [ ] Verificar que `npm run build` y `npm run test` siguen pasando sin errores
- [ ] **Commit**: `feat(voice): fase 0 — estructura base del módulo de agente de voz IA`
- [ ] **Tag**: `v2.0.0-ia-fase-0-setup`

---

### FASE 1: API Route — Sesión Efímera WebRTC
**Tag**: `v2.0.0-ia-fase-1-api-session`

- [ ] Implementar `src/app/api/voice/session/route.ts`:
  - Método POST que recibe `{ userId, orgId }` (del token de Firebase)
  - Valida que el request venga de un usuario autenticado (verificar ID token de Firebase)
  - **Verifica rate limiting**: Máximo 10 comandos por usuario por día (no por hora)
  - Si supera el límite, retorna error 429 con mensaje: "Límite diario alcanzado (10 comandos/día)"
  - Genera un **ephemeral token** llamando a la API REST de OpenAI (`/v1/realtime/sessions`)
  - Configura sesión con `modalities: ['text']` (SOLO texto, sin audio de salida)
  - Retorna el token efímero al cliente (NUNCA exponer `OPENAI_API_KEY` al frontend)
  - Retorna también: comandos restantes hoy
- [ ] Implementar `src/infrastructure/voice-agent/config.ts`:
  - Modelo: `gpt-4o-realtime-preview` (o el que esté GA al momento de implementar)
  - **Modalidades: `['text']`** (SOLO texto de salida, sin TTS)
  - Voz: `null` (no se necesita voz de salida)
  - System Instructions del agente de voz (personalidad, reglas, contexto financiero)
  - Temperatura: 0.7
  - Max tokens de respuesta: 150 (respuestas muy breves)
  - **Límites configurables**:
    ```typescript
    export const VOICE_LIMITS = {
      maxCommandsPerDay: 10,              // 10 comandos/día por usuario
      maxInputDurationSeconds: 15,        // 15 segundos por comando
      maxFunctionCallsPerCommand: 3,      // Máximo 3 acciones por comando
      silenceDurationMs: 500,             // 500ms de silencio = fin de comando
    };
    ```
- [ ] **Pre-cargar contexto del usuario en System Instructions**:
  - Al generar el token en `/api/voice/session`, obtener:
    - Lista de cuentas del usuario (nombre, tipo, saldo actual)
    - Lista de categorías disponibles (nombre, tipo: ingreso/gasto)
    - Límite de presupuesto mensual (si existe)
  - Inyectar este contexto en las System Instructions para que el agente sepa:
    - Qué cuentas existen sin tener que consultarlas cada vez
    - Qué categorías puede usar al crear transacciones
    - Contexto financiero general del usuario
- [ ] Escribir las **System Instructions** del agente:
  ```
  Eres un asistente financiero de voz para la aplicación "Control Financiero".
  Tu rol es ayudar al usuario a gestionar sus finanzas mediante comandos de voz.
  
  CONTEXTO FINANCIERO:
  - Moneda: Pesos Chilenos (CLP), símbolo $
  - NO uses decimales en montos (15000, no 15000.00)
  - Formatea montos con punto como separador de miles: $15.000
  - Las cuentas disponibles del usuario son: {{USER_ACCOUNTS}}
  - Las categorías disponibles son: {{USER_CATEGORIES}}
  
  REGLAS:
  - Responde siempre en español, de forma MUY breve (máximo 20 palabras)
  - El usuario dará un COMANDO, no una conversación. Interpreta y ejecuta.
  - Si no entiendes el comando, responde: "No entendí. ¿Podrías repetir?"
  - Solo puedes ejecutar las funciones que tienes declaradas como herramientas
  - Nunca reveles información de implementación interna
  - Si el usuario pide algo fuera de tu alcance, indícalo amablemente
  - Usa un tono casual y directo
  - Al crear transacciones, infiere cuenta y categoría del contexto cuando sea obvio
  - Si el usuario menciona una cuenta o categoría que no existe, sugiere las disponibles
  - NO hagas preguntas de confirmación, ejecuta directamente (salvo eliminaciones)
  ```
  > Nota: `{{USER_ACCOUNTS}}` y `{{USER_CATEGORIES}}` se reemplazan dinámicamente al crear la sesión
- [ ] Test unitario para la API Route (mock de OpenAI)
- [ ] Verificar que `npm run build` sigue pasando
- [ ] **Commit**: `feat(voice): fase 1 — API route para sesión efímera WebRTC con OpenAI`
- [ ] **Tag**: `v2.0.0-ia-fase-1-api-session`

---

### FASE 2: Tool Declarations — Registro de Herramientas
**Tag**: `v2.0.0-ia-fase-2-tool-declarations`

- [ ] Implementar `src/infrastructure/voice-agent/types.ts`:
  ```typescript
  export interface VoiceTool {
    declaration: OpenAIToolDeclaration;  // Schema para OpenAI
    execute: (args: Record<string, unknown>, context: VoiceToolContext) => Promise<VoiceToolResult>;
  }
  
  export interface VoiceToolContext {
    orgId: string;
    userId: string;
    container: DIContainer;
  }
  
  export interface VoiceToolResult {
    success: boolean;
    data?: unknown;
    message: string;  // Mensaje que OpenAI usará para generar la respuesta de voz
  }
  ```
- [ ] Implementar `src/infrastructure/voice-agent/VoiceToolRegistry.ts`:
  - Patrón Registry: `register(tool: VoiceTool)`, `getAll()`, `getByName(name: string)`
  - Singleton thread-safe
  - Método `getDeclarations()` que retorna solo los schemas para enviar a OpenAI
- [ ] Implementar tools iniciales en `src/infrastructure/voice-agent/tools/`:
  - `createExpenseTool.ts` — Crear gasto (invoca `CreateTransactionUseCase`)
  - `createIncomeTool.ts` — Crear ingreso (invoca `CreateTransactionUseCase`)
  - `getBalanceTool.ts` — Consultar saldo de una cuenta (invoca `GetAccountByIdUseCase` o listing)
  - `getDashboardSummaryTool.ts` — Resumen del dashboard (invoca `GetDashboardStatisticsUseCase`)
  - `listAccountsTool.ts` — Listar cuentas disponibles
  - `listCategoriesTool.ts` — Listar categorías (para que el agente sepa cuáles existen)
  - `navigateToTool.ts` — Navegar a una sección de la app (usa `router.push`)
- [ ] Cada tool:
  - Define su `declaration` con descripción clara para que el modelo entienda cuándo usarla
  - Valida argumentos con Zod antes de ejecutar
  - Invoca el Use Case correspondiente vía `DIContainer`
  - Retorna un `VoiceToolResult` con mensaje descriptivo
- [ ] Implementar `src/infrastructure/voice-agent/tools/index.ts` que registra todos los tools
- [ ] Tests unitarios para cada tool (mock del DIContainer y Use Cases)
- [ ] Verificar que `npm run build` sigue pasando
- [ ] **Commit**: `feat(voice): fase 2 — declaración y registro de herramientas del agente de voz`
- [ ] **Tag**: `v2.0.0-ia-fase-2-tool-declarations`

---

### FASE 3: Cliente WebRTC — Conexión con OpenAI Realtime
**Tag**: `v2.0.0-ia-fase-3-webrtc-client`

- [ ] Implementar `src/infrastructure/voice-agent/RealtimeClient.ts`:
  - Clase que encapsula toda la lógica WebRTC:
    - `connect(ephemeralToken: string)`: Establece la conexión con OpenAI Realtime
    - `disconnect()`: Cierra la conexión limpiamente
    - `sendFunctionResult(callId: string, result: VoiceToolResult)`: Envía resultado de function call
    - `onFunctionCall(callback)`: Listener para cuando el modelo invoca una función
    - `onTranscript(callback)`: Listener para transcripciones parciales/finales
    - `onTextResponse(callback)`: Listener para respuesta en TEXTO (no audio)
    - `onError(callback)`: Listener de errores
    - `onConnectionChange(callback)`: Listener de estado de conexión
  - Manejo de estados: `idle` | `connecting` | `recording` | `processing` | `executing` | `error`
  - **NO** auto-reconexión (cada comando es independiente)
  - **Timer de grabación de 15 segundos**: Auto-detener al llegar al límite
    - Contador regresivo visible en UI: "15s... 14s... 13s..."
    - Permitir terminar antes si detecta silencio (VAD 500ms)
    - Al llegar a 15s, detener grabación y procesar
  - Cleanup completo al desmontar (cierre de RTCPeerConnection, DataChannel, MediaStream)
- [ ] La conexión WebRTC debe:
  1. Obtener ephemeral token del API Route `/api/voice/session`
  2. Crear `RTCPeerConnection` con el SDP offer
  3. Capturar audio del micrófono con `getUserMedia({ audio: true })`
  4. Agregar track de audio al peer connection
  5. Establecer conexión con el endpoint de OpenAI
  6. Abrir DataChannel para enviar/recibir eventos JSON
  7. Enviar `session.update` con las tool declarations y configuración VAD:
     ```json
     {
       "turn_detection": {
         "type": "server_vad",
         "threshold": 0.5,
         "prefix_padding_ms": 300,
         "silence_duration_ms": 500
       }
     }
     ```
     > Esto permite que OpenAI detecte automáticamente cuando el usuario termina de hablar
- [ ] Implementar protocolo de eventos del DataChannel:
  - Envío: `session.update`, `response.create`, `conversation.item.create`
  - Recepción: `response.function_call_arguments.done`, `response.text.delta`, `response.text.done`, `error`
  - **NO** recibir `audio.delta` (sin TTS)
- [ ] **Implementar timer de grabación de 15 segundos**:
  - Iniciar contador al comenzar grabación: `recordingStartTime = Date.now()`
  - Timeout automático a los 15 segundos:
    ```typescript
    setTimeout(() => {
      this.stopRecording('timeout');
    }, 15000);
    ```
  - Escuchar VAD (Voice Activity Detection) para detectar silencio:
    - Si 500ms de silencio Y al menos 2s de audio → detener grabación
  - Mostrar contador regresivo en overlay: "15s", "14s", "13s"...
  - Enviar configuración al crear sesión:
    ```json
    {
      "modalities": ["text"],
      "turn_detection": {
        "type": "server_vad",
        "threshold": 0.5,
        "silence_duration_ms": 500
      }
    }
    ```
- [ ] Tests unitarios con mocks de RTCPeerConnection y MediaStream
- [ ] Verificar que `npm run build` sigue pasando
- [ ] **Commit**: `feat(voice): fase 3 — cliente WebRTC para conexión con OpenAI Realtime API`
- [ ] **Tag**: `v2.0.0-ia-fase-3-webrtc-client`

---

### FASE 4: Hook y Context — useVoiceAgent
**Tag**: `v2.0.0-ia-fase-4-hook-context`

- [ ] Implementar `src/components/voice/VoiceProvider.tsx`:
  - Context que provee el estado del agente de voz a toda la app
  - Instancia el `RealtimeClient` como singleton
  - Maneja el ciclo de vida de la conexión
  - Expone: `state`, `connect()`, `disconnect()`, `transcript`, `isAvailable`
  - Se monta SOLO si `enableVoiceAgent === true` (feature flag)
- [ ] Implementar `src/application/hooks/useVoiceAgent.ts`:
  - Hook que consume el VoiceProvider context
  - Expone interfaz limpia para los componentes:
    ```typescript
    interface UseVoiceAgent {
      state: VoiceAgentState;         // idle | recording | processing | executing | error
      isAvailable: boolean;            // Feature flag + API key + comandos disponibles
      startCommand: () => Promise<void>;  // Inicia grabación de comando
      cancelCommand: () => void;          // Cancela comando en curso
      transcript: string;                 // Transcripción del comando actual
      response: string;                   // Respuesta de la IA (texto)
      error: string | null;
      commandsRemainingToday: number;     // Comandos restantes hoy (10 → 0)
      recordingTimeLeft: number;          // Segundos restantes (15 → 0)
    }
    ```
  - Maneja la lógica de Function Calling:
    1. Recibe `functionCall` del RealtimeClient
    2. Busca el tool en el `VoiceToolRegistry`
    3. Ejecuta el tool con el contexto (orgId, userId, container)
    4. Envía el resultado de vuelta a OpenAI via `sendFunctionResult`
  - Invalida React Query cache automáticamente cuando un tool modifica datos (e.g., crear transacción)
- [ ] Integrar `VoiceProvider` en `src/app/providers.tsx` (condicionado al feature flag)
  - Si `enableVoiceAgent` es false, no renderiza el provider
  - **Único cambio en archivo existente**: agregar el provider condicionalmente
- [ ] Tests unitarios para el hook (mock del context y RealtimeClient)
- [ ] Verificar que `npm run build` sigue pasando
- [ ] **Commit**: `feat(voice): fase 4 — hook useVoiceAgent y VoiceProvider context`
- [ ] **Tag**: `v2.0.0-ia-fase-4-hook-context`

---

### FASE 5: Componentes UI — Botón y Overlay
**Tag**: `v2.0.0-ia-fase-5-ui-components`

- [ ] Implementar `src/components/voice/VoiceButton.tsx`:
  - Botón flotante circular con icono de micrófono (lucide-react `Mic` icon)
  - Posición: fixed, junto al FAB existente pero por encima (z-index mayor)
  - **Solo visible si** `enableVoiceAgent === true` y el usuario está autenticado
  - **Deshabilitado si**: Sin API key O comandos agotados (0 restantes hoy)
  - Estados visuales:
    - `idle`: Botón con outline sutil, icono de mic. Badge: "10" (comandos restantes)
    - `recording`: Anillo pulsante (animación roja), icono de mic activo
    - `processing`: Spinner, icono de loader
    - `executing`: Icono de check animado
    - `error`: Color destructive, icono de alert
    - `disabled`: Opacidad reducida, cursor not-allowed. Tooltip: "Sin comandos disponibles hoy"
  - Click: inicia comando de voz (abre overlay + comienza grabación)
  - Long press (>500ms): NO implementado (cada comando es independiente)
  - Badge con número de comandos restantes: "10", "9", "8"... "0"
  - Accesible: aria-labels para cada estado, soporte de teclado
- [ ] Implementar `src/components/voice/VoiceOverlay.tsx`:
  - Overlay translúcido que aparece al iniciar comando de voz
  - **Se cierra automáticamente después de procesar** (no espera acción del usuario)
  - Muestra:
    - **Contador regresivo grande**: "15s" → "14s" → ... → "0s"
    - Transcripción en vivo del usuario (texto que va apareciendo)
    - Estado actual: "🎤 Escuchando...", "⚙️ Procesando...", "✓ Ejecutando acción..."
    - Respuesta breve de la IA (SOLO TEXTO, no audio)
    - Botón "Cancelar" (solo visible durante grabación)
  - Animaciones suaves con CSS transitions (no librerías externas)
  - Responsive: se adapta a móvil y desktop
  - **Cierre automático**:
    - Después de ejecutar acción: 2 segundos → cierra
    - Si hay error: 4 segundos → cierra
  - Badge con comandos restantes: "9 comandos restantes hoy"
- [ ] Integrar `VoiceButton` en `src/app/(dashboard)/layout.tsx`:
  - **Agregar** el componente junto al `GlobalTransactionFAB` existente
  - **NO** modificar el FAB existente
  - Condicionado al feature flag
- [ ] Estilos: usar variables CSS de Tailwind existentes, no crear nuevos temas
- [ ] Verificar compatibilidad con tema claro y oscuro
- [ ] Verificar que no interfiere con el FAB existente ni con el sidebar
- [ ] Test de accesibilidad (aria-labels, focus trap en overlay)
- [ ] Verificar que `npm run build` sigue pasando
- [ ] **Commit**: `feat(voice): fase 5 — componentes UI del botón de voz y overlay`
- [ ] **Tag**: `v2.0.0-ia-fase-5-ui-components`

---

### FASE 6: Integración End-to-End — Flujo Completo
**Tag**: `v2.0.0-ia-fase-6-integration`

- [ ] Conectar todas las piezas en el flujo completo:
  1. Usuario presiona VoiceButton → `startCommand()`
  2. Hook verifica: ¿Tiene comandos disponibles hoy? → Si no: error
  3. Hook solicita ephemeral token a `/api/voice/session` (retorna token + comandos restantes)
  4. RealtimeClient establece WebRTC con OpenAI (modalities: ['text'])
  5. VoiceOverlay se abre con estado "🎤 Escuchando... 15s"
  6. Timer de 15 segundos inicia → Contador regresivo visible
  7. Usuario habla → Transcripción aparece en vivo
  8. Al terminar (15s O silencio de 500ms):
     - Estado cambia a "⚙️ Procesando..."
     - OpenAI transcribe y analiza
  9. OpenAI interpreta intención → Envía `functionCall`
  10. Hook busca tool en Registry → Ejecuta Use Case → Retorna resultado
  11. Estado cambia a "✓ Ejecutando acción..."
  12. React Query cache se invalida si hubo mutación
  13. UI se actualiza automáticamente con los datos nuevos
  14. Toast notification: "✓ Gasto de $15.000 registrado en Comida"
  15. Overlay muestra respuesta de IA (texto) durante 2 segundos
  16. Overlay se cierra automáticamente
  17. Badge del botón se actualiza: "9 comandos restantes"
- [ ] Implementar invalidación de cache de React Query post-tool-execution:
  - Map de tool-name → query keys a invalidar:
    - `create_expense` → `['transactions', orgId]`, `['accounts', orgId]`, `['dashboard', orgId]`
    - `create_income` → `['transactions', orgId]`, `['accounts', orgId]`, `['dashboard', orgId]`
    - `get_balance` → (no invalida, es lectura)
    - `navigate_to` → (no invalida, es navegación)
- [ ] Manejar errores en cada punto del pipeline:
  - Error de permisos de micrófono → Notificación amigable
  - Error de red → Retry automático con mensaje de espera
  - Error de OpenAI → Mensaje genérico + log para debug
  - Error en Use Case → Se envía a OpenAI para que comunique al usuario
- [ ] Implementar toast notifications (sonner) para confirmar acciones ejecutadas
- [ ] Probar flujos completos:
  - "Registra un gasto de 15.000 pesos en comida en mi cuenta corriente"
  - "¿Cuánto tengo en mi cuenta?"
  - "Llévame a los presupuestos"
  - "¿Cuánto he gastado este mes?"
- [ ] Verificar que `npm run build` sigue pasando
- [ ] **Commit**: `feat(voice): fase 6 — integración end-to-end del agente de voz`
- [ ] **Tag**: `v2.0.0-ia-fase-6-integration`

---

### FASE 7: Seguridad, Guardrails y Rate Limiting
**Tag**: `v2.0.0-ia-fase-7-security`

- [ ] **Autenticación en API Route**:
  - Verificar que el usuario tiene sesión válida de Firebase antes de generar token
  - Implementar verificación del ID token de Firebase en el server
- [ ] **Rate Limiting**:
  - **Máximo 10 comandos de voz por usuario por día** (no por hora)
  - Máximo 3 function calls por comando (no por sesión)
  - Timeout de grabación: 15 segundos máximo (hard limit)
  - Implementar con Map en memoria: `userId → { date, count }`
  - Resetear contador a medianoche (00:00 hora local del servidor)
  - Al sobrepasar límites:
    - API retorna 429: `{ error: 'LIMIT_EXCEEDED', remaining: 0, resetAt: '2026-04-04T00:00:00Z' }`
    - UI muestra: "Límite diario alcanzado. Volverá a estar disponible mañana."
    - Botón se deshabilita hasta el reset
- [ ] **Guardrails del modelo**:
  - System instructions que prohíben acciones fuera del scope
  - Validación estricta de argumentos con Zod en cada tool (ya implementado en Fase 2)
  - No permitir eliminaciones sin confirmación explícita del usuario
  - Limitar montos máximos configurables por organización
- [ ] **Sanitización**:
  - Validar que los argumentos de function call no contengan inyecciones
  - Escapar cualquier output que se renderice en el DOM
- [ ] **Logging**:
  - Log estructurado de cada sesión de voz: inicio, tools invocados, resultado, errores, duración
  - No logear contenido de audio ni transcripciones completas (privacidad)
  - Log de intentos de rate limit excedido
- [ ] Tests de seguridad:
  - Test: API Route rechaza requests sin autenticación
  - Test: Rate limiter bloquea después del límite
  - Test: Tools rechazan argumentos malformados
- [ ] Verificar que `npm run build` sigue pasando
- [ ] **Commit**: `feat(voice): fase 7 — seguridad, guardrails y rate limiting`
- [ ] **Tag**: `v2.0.0-ia-fase-7-security`

---

### FASE 8: Polish, Accesibilidad y Feature Flag
**Tag**: `v2.0.0-ia-fase-8-polish`

- [ ] **Feature flag completo**:
  - `NEXT_PUBLIC_ENABLE_VOICE_AGENT=true` para activar
  - Agregar toggle en la página de Settings del usuario (si existe)
  - Persistir preferencia del usuario en Firestore (campo `voiceAgentEnabled` en user doc)
- [ ] **Accesibilidad**:
  - `aria-live="polite"` en la zona de transcript del overlay
  - `role="status"` para indicadores de estado
  - Soporte completo de teclado: Enter para iniciar, Escape para cancelar
  - Focus trap cuando el overlay está abierto
  - Lectores de pantalla: anunciar cambios de estado
- [ ] **UX Polish**:
  - Sonido sutil al iniciar/terminar sesión (opcional, respeta preferencia de usuario)
  - Animación de transición suave al abrir/cerrar overlay
  - Tooltip en el botón: "Asistente de voz" o "Habla con tu asistente"
  - Skeleton/shimmer mientras conecta
  - Verificar que en móvil el overlay no tape controles críticos
- [ ] **Indicador de costo** (opcional):
  - Mostrar discretamente cuántos segundos de audio se han usado en la sesión
  - Útil para el administrador para monitorear costos
- [ ] **Documentación**:
  - Agregar sección en README sobre la feature de voz
  - Documentar las variables de entorno necesarias
  - Documentar cómo agregar nuevos tools
- [ ] Verificar que `npm run build` sigue pasando
- [ ] **Commit**: `feat(voice): fase 8 — polish, accesibilidad y feature flag completo`
- [ ] **Tag**: `v2.0.0-ia-fase-8-polish`

---

### FASE 9: Testing Integral y Release
**Tag**: `v2.0.0-ia-release`

- [ ] **Tests unitarios completos**:
  - `VoiceToolRegistry` — registro, búsqueda, getDeclarations
  - Cada tool — validación de args, ejecución correcta, manejo de errores
  - `RealtimeClient` — conexión, desconexión, manejo de eventos
  - `useVoiceAgent` hook — estados, function calling dispatch, invalidación de cache
  - API Route — autenticación, rate limiting, generación de token
- [ ] **Tests de integración**:
  - Flujo completo con mock de OpenAI: voz → tool call → resultado → respuesta
  - Verificar que las acciones ejecutadas por voz producen los mismos resultados que las acciones manuales
  - Verificar que React Query se actualiza correctamente post-acción
- [ ] **Tests de regresión**:
  - Ejecutar suite de tests existente para confirmar zero impacto
  - Verificar que con `NEXT_PUBLIC_ENABLE_VOICE_AGENT=false` la app funciona idénticamente
  - Verificar que el bundle size no aumenta significativamente cuando el flag está off (lazy loading)
- [ ] **Performance**:
  - Verificar que el módulo de voz se carga con lazy loading (dynamic import)
  - Confirmar que no hay memory leaks al conectar/desconectar sesiones repetidamente
  - Medir impacto en TTI (Time to Interactive) del dashboard
- [ ] Actualizar `package.json` version a `2.0.0`
- [ ] Actualizar `APP_CONFIG.version` a `2.0.0`
- [ ] **Commit**: `release(voice): v2.0.0 — agente de voz con IA para control financiero`
- [ ] **Tag**: `v2.0.0-ia-release`

---

## Resumen de Archivos Nuevos (No se modifican archivos existentes excepto donde se indica)

### Archivos nuevos:
```
src/app/api/voice/session/route.ts          # API Route para ephemeral token
src/infrastructure/voice-agent/types.ts      # Tipos del módulo
src/infrastructure/voice-agent/config.ts     # Configuración del agente
src/infrastructure/voice-agent/RealtimeClient.ts  # Cliente WebRTC
src/infrastructure/voice-agent/VoiceToolRegistry.ts  # Registry de tools
src/infrastructure/voice-agent/tools/index.ts       # Barrel export + registro
src/infrastructure/voice-agent/tools/createExpenseTool.ts
src/infrastructure/voice-agent/tools/createIncomeTool.ts
src/infrastructure/voice-agent/tools/getBalanceTool.ts
src/infrastructure/voice-agent/tools/getDashboardSummaryTool.ts
src/infrastructure/voice-agent/tools/listAccountsTool.ts
src/infrastructure/voice-agent/tools/listCategoriesTool.ts
src/infrastructure/voice-agent/tools/navigateToTool.ts
src/application/hooks/useVoiceAgent.ts       # Hook principal
src/components/voice/VoiceButton.tsx          # Botón flotante
src/components/voice/VoiceOverlay.tsx         # Overlay visual
src/components/voice/VoiceProvider.tsx        # Context provider
```

### Archivos existentes con cambios mínimos (solo adiciones):
```
src/app/providers.tsx                # Agregar VoiceProvider (condicional)
src/app/(dashboard)/layout.tsx       # Agregar VoiceButton (condicional)
src/lib/constants/config.ts          # Agregar enableVoiceAgent al APP_CONFIG
.env.local                           # Agregar OPENAI_API_KEY y NEXT_PUBLIC_ENABLE_VOICE_AGENT
package.json                         # Agregar dependencia openai
```

## Resumen de Tags

| Tag | Descripción |
|-----|-------------|
| `v2.0.0-ia-fase-0-setup` | Estructura base del módulo |
| `v2.0.0-ia-fase-1-api-session` | API route para sesión efímera |
| `v2.0.0-ia-fase-2-tool-declarations` | Declaración y registro de herramientas |
| `v2.0.0-ia-fase-3-webrtc-client` | Cliente WebRTC para OpenAI Realtime |
| `v2.0.0-ia-fase-4-hook-context` | Hook useVoiceAgent y VoiceProvider |
| `v2.0.0-ia-fase-5-ui-components` | Componentes UI (botón y overlay) |
| `v2.0.0-ia-fase-6-integration` | Integración end-to-end |
| `v2.0.0-ia-fase-7-security` | Seguridad, guardrails y rate limiting |
| `v2.0.0-ia-fase-8-polish` | Polish, accesibilidad y feature flag |
| `v2.0.0-ia-release` | Release completo v2.0.0 |

## Dependencias Externas Nuevas

| Paquete | Propósito | Impacto en bundle |
|---------|-----------|-------------------|
| `openai` | SDK para generar ephemeral tokens (server-only) | 0 KB (server-side only) |

> **Nota**: NO se agrega ningún SDK de cliente pesado. La conexión WebRTC se implementa con APIs nativas del browser (`RTCPeerConnection`, `getUserMedia`). El SDK `openai` solo se usa en el server para generar tokens efímeros.

## Estimación de Costos

**Modelo simplificado (Audio Input → Text Output):**

| Concepto | Costo |
|----------|-------|
| Audio input (15seg) | 0.25 min × $0.06 = **$0.015** |
| Text output | Incluido en input |
| **Total por comando** | **$0.015 USD** |

**Proyecciones:**
- Usuario activo (10 comandos/día): $0.15/día = **$4.50/mes**
- 100 usuarios activos: **$450/mes**
- 1000 usuarios activos: **$4,500/mes**

**20 veces más barato** que el modelo con TTS bidireccional.

## Prerrequisitos para Comenzar

1. Cuenta de OpenAI con acceso a la Realtime API
2. API Key de OpenAI con permisos para `gpt-4o-realtime-preview`
3. Créditos suficientes en la cuenta de OpenAI (la Realtime API se factura por minuto de audio)
4. Navegador moderno con soporte WebRTC (Chrome 80+, Firefox 80+, Safari 15+, Edge 80+)
