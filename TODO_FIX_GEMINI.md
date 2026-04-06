# TODO: Mejoras del Sistema de Asistente de Voz Gemini

**Objetivo:** Transformar el sistema de 5/10 a 9/10 en **4 semanas**  
**Principio:** Simple, Claro, Predecible

---

## 📊 RESUMEN EJECUTIVO

### Problemas Críticos a Resolver
- ❌ UX confusa con 5-6 estados diferentes
- ❌ Feedback genérico sin contexto
- ❌ Confirmaciones pobres que no informan al usuario
- ❌ Errores sin guía de recuperación
- ❌ Over-engineering con 8 capas innecesarias
- ❌ 4 function calls para 1 acción simple (desperdicio de tokens)

### Resultado Esperado
- ✅ Flujo simple: Click → Hablar → Listo
- ✅ Feedback claro en tiempo real
- ✅ Confirmaciones descriptivas
- ✅ Errores con soluciones concretas
- ✅ Arquitectura simple y mantenible
- ✅ 1 function call por acción (ahorro 60% tokens)

---

## 🎯 SEMANA 1: FIXES CRÍTICOS DE UX

**Prioridad:** 🔴 ALTA  
**Impacto:** Inmediato en experiencia de usuario  
**Esfuerzo:** 5 días

---

### 1.1 Mejorar Feedback de Estados

**Problema:** Labels genéricos como "Procesando...", "Ejecutando..." no dicen nada al usuario.

#### ✅ Tarea: Actualizar VoicePushToTalkButton.tsx

**Archivo:** `src/components/voice/VoicePushToTalkButton.tsx`

```typescript
// ANTES (Línea 54):
const getLabel = () => {
  if (isConnecting) return 'Conectando...';
  if (isRecording) return `Escuchando... ${recordingTimeLeft}s`;
  if (isProcessing) return 'Procesando...';
  if (isExecuting) return 'Ejecutando...';
  return 'Mantén presionado para hablar';
};

// DESPUÉS:
const getLabel = () => {
  if (isConnecting) return 'Preparando micrófono...';
  if (isRecording) return `🎤 Te escucho (${recordingTimeLeft}s)`;
  if (isProcessing) return 'Entendiendo tu comando...';
  if (isExecuting) return 'Registrando gasto...'; // ← Específico del contexto
  return '🎤 Presiona y mantén para hablar';
};
```

**Criterio de éxito:**
- [ ] Labels descriptivos en todos los estados
- [ ] Usuario entiende QUÉ está pasando en cada momento
- [ ] Icons consistentes (🎤 para voz, ✅ para éxito)

---

#### ✅ Tarea: Agregar estado ejecutando con contexto

**Problema:** El estado "executing" debe mostrar QUÉ tool se está ejecutando.

**Archivo:** `src/components/voice/VoiceProvider.tsx`

```typescript
// Agregar state para tracking del tool actual:
const [currentExecutingTool, setCurrentExecutingTool] = useState<string | null>(null);

// En handleFunctionCall (línea 210):
const handleFunctionCall = useCallback(async (functionCall: AIFunctionCall) => {
  // ... validaciones ...
  
  setState('executing');
  setCurrentExecutingTool(functionCall.name); // ← NUEVO
  
  try {
    const result = await tool.execute(functionCall.arguments, context);
    // ...
  } finally {
    setCurrentExecutingTool(null); // ← LIMPIAR
  }
}, []);

// Exponer en context:
const value: VoiceContextType = {
  // ... existing properties ...
  currentExecutingTool, // ← NUEVO
};
```

**Archivo:** `src/components/voice/VoicePushToTalkButton.tsx`

```typescript
// Actualizar para mostrar tool name:
import { useVoiceAgent } from '@/application/hooks/useVoiceAgent';

export function VoicePushToTalkButton({ ... }) {
  const { state, currentExecutingTool } = useVoiceAgent();
  
  const getLabel = () => {
    if (isExecuting) {
      const toolLabels: Record<string, string> = {
        'create_expense': '💸 Registrando gasto...',
        'create_income': '💰 Registrando ingreso...',
        'get_balance': '💳 Consultando saldo...',
        'get_dashboard_summary': '📊 Cargando resumen...',
      };
      return toolLabels[currentExecutingTool || ''] || 'Ejecutando acción...';
    }
    // ... resto de estados ...
  };
}
```

**Criterio de éxito:**
- [ ] Usuario ve exactamente QUÉ se está ejecutando
- [ ] No más estados genéricos sin contexto

---

### 1.2 Mejorar Confirmaciones de Tools

**Problema:** Tools retornan "Registrado" sin detalles. Usuario no sabe QUÉ se registró.

#### ✅ Tarea: Actualizar createExpenseTool.ts

**Archivo:** `src/infrastructure/voice-agent/tools/createExpenseTool.ts`

```typescript
// ANTES (Línea 130):
return {
  success: true,
  data: result,
  message: 'Registrado',
};

// DESPUÉS:
// 1. Obtener nombres de categoría y cuenta
const category = await context.container.getGetCategoryByIdUseCase()
  .execute({ categoryId: validatedArgs.categoryId });
const account = await context.container.getGetAccountByIdUseCase()
  .execute({ accountId: validatedArgs.accountId });

const categoryName = category.category?.name || 'categoría';
const accountName = account.account?.name || 'cuenta';

// 2. Formatear monto
const formattedAmount = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  minimumFractionDigits: 0,
}).format(validatedArgs.amount);

// 3. Retornar mensaje descriptivo
return {
  success: true,
  data: result,
  message: `Gasto de ${formattedAmount} en ${categoryName} registrado en ${accountName}`,
  // Ejemplo: "Gasto de $5.000 en Café registrado en Banco Estado"
};
```

**Criterio de éxito:**
- [ ] Mensaje incluye monto formateado
- [ ] Mensaje incluye nombre de categoría
- [ ] Mensaje incluye nombre de cuenta
- [ ] Usuario puede verificar que se registró correctamente

---

#### ✅ Tarea: Actualizar createIncomeTool.ts

**Archivo:** `src/infrastructure/voice-agent/tools/createIncomeTool.ts`

Aplicar el mismo patrón:

```typescript
return {
  success: true,
  data: result,
  message: `Ingreso de ${formattedAmount} en ${categoryName} registrado en ${accountName}`,
};
```

**Criterio de éxito:**
- [ ] Confirmaciones descriptivas en todos los tools de acción

---

#### ✅ Tarea: Actualizar getBalanceTool.ts

**Archivo:** `src/infrastructure/voice-agent/tools/getBalanceTool.ts`

```typescript
// Ya está bien implementado (línea 58):
return {
  success: true,
  data: { balance: account.balance, accountName: account.name },
  message: `Tienes ${formattedBalance} en ${account.name}`,
};

// ✅ No requiere cambios
```

---

### 1.3 Error Handling con Recovery Actions

**Problema:** Errores no ofrecen solución concreta al usuario.

#### ✅ Tarea: Crear sistema de ErrorRecovery

**Archivo nuevo:** `src/infrastructure/voice-agent/VoiceErrorHandler.ts`

```typescript
export interface VoiceError {
  code: string;
  message: string;
  description?: string;
  recoveryAction?: {
    label: string;
    handler: () => void;
  };
}

export class VoiceErrorHandler {
  static handle(error: Error): VoiceError {
    // Permiso de micrófono denegado
    if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
      return {
        code: 'MICROPHONE_PERMISSION_DENIED',
        message: 'Micrófono bloqueado',
        description: 'El navegador bloqueó el acceso al micrófono',
        recoveryAction: {
          label: 'Ver cómo habilitarlo',
          handler: () => {
            window.open('https://support.google.com/chrome/answer/2693767', '_blank');
          },
        },
      };
    }

    // Micrófono no encontrado
    if (error.name === 'NotFoundError' || error.message.includes('not found')) {
      return {
        code: 'MICROPHONE_NOT_FOUND',
        message: 'Micrófono no detectado',
        description: 'Conecta un micrófono y recarga la página',
      };
    }

    // Browser no soporta Web Speech API
    if (error.message.includes('no soporta')) {
      return {
        code: 'BROWSER_NOT_SUPPORTED',
        message: 'Navegador no compatible',
        description: 'Usa Chrome, Edge o Safari para comandos de voz',
      };
    }

    // No se detectó audio
    if (error.message.includes('No se detectó audio')) {
      return {
        code: 'NO_AUDIO_DETECTED',
        message: 'No te escuché',
        description: 'Habla más fuerte o acércate al micrófono',
      };
    }

    // Saldo insuficiente
    if (error.message.includes('Insufficient balance')) {
      return {
        code: 'INSUFFICIENT_BALANCE',
        message: 'Saldo insuficiente',
        description: 'La cuenta no tiene fondos suficientes',
      };
    }

    // Error de red
    if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Error de conexión',
        description: 'Verifica tu internet e intenta nuevamente',
        recoveryAction: {
          label: 'Reintentar',
          handler: () => window.location.reload(),
        },
      };
    }

    // Error genérico
    return {
      code: 'UNKNOWN_ERROR',
      message: 'Error inesperado',
      description: error.message || 'Intenta nuevamente en unos segundos',
    };
  }
}
```

**Criterio de éxito:**
- [ ] Todos los errores comunes tienen mensaje específico
- [ ] Errores críticos ofrecen recovery action
- [ ] Usuario sabe exactamente qué hacer

---

#### ✅ Tarea: Integrar ErrorHandler en VoiceProvider

**Archivo:** `src/components/voice/VoiceProvider.tsx`

```typescript
import { VoiceErrorHandler, type VoiceError } from '@/infrastructure/voice-agent/VoiceErrorHandler';

// Cambiar estado de error de string a VoiceError:
const [error, setError] = useState<VoiceError | null>(null);

// En handleError (línea 404):
const handleError = useCallback((rawError: Error) => {
  const voiceError = VoiceErrorHandler.handle(rawError); // ← USAR HANDLER
  setError(voiceError);
  setState('error');
  
  // Toast con recovery action
  toast.error(voiceError.message, {
    description: voiceError.description,
    action: voiceError.recoveryAction ? {
      label: voiceError.recoveryAction.label,
      onClick: voiceError.recoveryAction.handler,
    } : undefined,
  });
}, []);
```

**Archivo:** `src/components/voice/VoiceModal.tsx`

```typescript
// Mostrar error con recovery action (línea 185):
{error && (
  <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20">
    <p className="text-sm font-medium text-destructive">{error.message}</p>
    {error.description && (
      <p className="text-xs text-destructive/80 mt-1">{error.description}</p>
    )}
    {error.recoveryAction && (
      <Button
        size="sm"
        variant="outline"
        onClick={error.recoveryAction.handler}
        className="mt-2"
      >
        {error.recoveryAction.label}
      </Button>
    )}
  </div>
)}
```

**Criterio de éxito:**
- [ ] Todos los errores pasan por VoiceErrorHandler
- [ ] Errores con recovery action tienen botón visible
- [ ] Usuario puede resolver errores sin salir del modal

---

### 1.4 Pre-loading de Contexto (Eliminar 3 Function Calls)

**Problema:** System instructions fuerzan 4 function calls para 1 acción simple:
1. `get_organization_context`
2. `list_accounts`
3. `list_categories`
4. `create_expense`

**Solución:** Pre-cargar contexto al abrir modal y enviarlo en cada request.

#### ✅ Tarea: Pre-cargar contexto en VoiceModal

**Archivo:** `src/components/voice/VoiceModal.tsx`

```typescript
import { useAccounts } from '@/application/hooks/useAccounts';
import { useCategories } from '@/application/hooks/useCategories';

export function VoiceModal({ isOpen, onClose }: VoiceModalProps) {
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const [contextLoaded, setContextLoaded] = useState(false);

  // Pre-cargar contexto cuando modal se abre
  useEffect(() => {
    if (isOpen && !contextLoaded) {
      // Guardar en localStorage para que GeminiTextProvider lo use
      const context = {
        accounts: accounts?.map(a => ({
          id: a.id,
          name: a.name,
          balance: a.balance,
        })) || [],
        categories: categories?.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
        })) || [],
        defaultAccountId: accounts?.[0]?.id || null,
      };
      
      localStorage.setItem('voice_context', JSON.stringify(context));
      setContextLoaded(true);
    }
  }, [isOpen, accounts, categories, contextLoaded]);

  // Limpiar al cerrar
  useEffect(() => {
    if (!isOpen) {
      localStorage.removeItem('voice_context');
      setContextLoaded(false);
    }
  }, [isOpen]);

  // ... resto del componente
}
```

**Criterio de éxito:**
- [ ] Contexto cargado antes de primer comando
- [ ] No se necesita llamar get_organization_context, list_accounts, list_categories

---

#### ✅ Tarea: Incluir contexto en requests a Gemini

**Archivo:** `src/infrastructure/voice-agent/GeminiTextProvider.ts`

```typescript
private async callGeminiAPI(text: string, isContinuation: boolean = false): Promise<any> {
  // Cargar contexto pre-cargado
  const contextStr = localStorage.getItem('voice_context');
  const context = contextStr ? JSON.parse(contextStr) : null;

  const response = await fetch('/api/voice/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.idToken}`,
    },
    body: JSON.stringify({
      text: isContinuation ? '' : text,
      conversationHistory: isContinuation ? this.conversationParts : this.conversationParts.slice(0, -1),
      turnIndex: this.turnIndex++,
      context, // ← INCLUIR CONTEXTO
    }),
  });
  // ...
}
```

**Criterio de éxito:**
- [ ] Contexto incluido en cada request
- [ ] Gemini puede inferir cuenta y categoría sin llamar a tools

---

#### ✅ Tarea: Actualizar System Instructions

**Archivo:** `src/infrastructure/voice-agent/gemini-config.ts`

```typescript
export function buildGeminiSystemInstructions(): string {
  return `Asistente financiero por voz. Español. Brevedad extrema.

CONTEXTO DISPONIBLE:
El campo 'context' en el request incluye:
- accounts: [{ id, name, balance }]
- categories: [{ id, name, type }]
- defaultAccountId: ID de cuenta preferida

REGLAS CRÍTICAS:
1. USA SIEMPRE el campo 'id', NUNCA 'name'
   Ejemplo: accountId: "IjUIHQgtnvC8EmUmMwbT" ✅
            accountId: "Visa" ❌

2. Si usuario NO especifica cuenta:
   - USA defaultAccountId del contexto
   - Si no hay default, usa la cuenta con más saldo

3. Si usuario NO especifica categoría:
   - INFIERE de la descripción
   - Ejemplos:
     * "café" → categoría "Café" o "Alimentación"
     * "uber" → categoría "Transporte"
     * "netflix" → categoría "Entretenimiento"

4. Descripciones: 3-8 palabras narrativas
   Ejemplo: "Café en Starbucks por la mañana" ✅
            "Café" ❌

5. Confirmaciones: MAX 3 palabras
   Ejemplos: "Registrado", "Listo", "Hecho"
   Evita: "Perfecto, he registrado tu gasto de..."

6. Montos: sin decimales
   Ejemplo: 15000 ✅
            15000.00 ❌

FLUJO:
- Info completa → Ejecutar INMEDIATAMENTE (1 solo function call)
- Info incompleta → Preguntar brevemente (2-4 palabras)
- Éxito → Confirmar con máximo 3 palabras`;
}
```

**Criterio de éxito:**
- [ ] System instructions claras y concisas
- [ ] Gemini ejecuta 1 function call por comando simple
- [ ] NO llama get_organization_context, list_accounts, list_categories

---

#### ✅ Tarea: Actualizar API route para usar context

**Archivo:** `src/app/api/voice/gemini/route.ts`

```typescript
interface GeminiVoiceRequest {
  text: string;
  conversationHistory?: GeminiContentPart[];
  turnIndex?: number;
  functionCallingMode?: GeminiFunctionCallingMode;
  context?: { // ← NUEVO
    accounts: Array<{ id: string; name: string; balance: number }>;
    categories: Array<{ id: string; name: string; type: string }>;
    defaultAccountId: string | null;
  };
}

export async function POST(request: NextRequest) {
  // ... autenticación ...

  const body: GeminiVoiceRequest = await request.json();
  const { text, conversationHistory = [], turnIndex = 0, functionCallingMode, context } = body;

  // Construir system instruction con contexto incluido
  let systemInstruction = buildGeminiSystemInstructions();
  
  if (context) {
    systemInstruction += `\n\nCONTEXTO DEL USUARIO:\n`;
    systemInstruction += `Cuentas disponibles:\n`;
    context.accounts.forEach(acc => {
      systemInstruction += `- ${acc.name} (ID: ${acc.id}, Saldo: $${acc.balance})\n`;
    });
    systemInstruction += `\nCategorías disponibles:\n`;
    context.categories.forEach(cat => {
      systemInstruction += `- ${cat.name} (ID: ${cat.id})\n`;
    });
    if (context.defaultAccountId) {
      systemInstruction += `\nCuenta preferida: ${context.defaultAccountId}\n`;
    }
  }

  const response = await client.models.generateContent({
    model: GEMINI_VOICE_CONFIG.model,
    contents,
    config: {
      systemInstruction, // ← CON CONTEXTO
      tools: [{ functionDeclarations: geminiTools }],
      // ...
    },
  });
  // ...
}
```

**Criterio de éxito:**
- [ ] Context incluido en system instruction
- [ ] Gemini tiene toda la info necesaria sin llamar tools
- [ ] 1 function call por comando simple (75% ahorro)

---

### 1.5 Auto-cierre de Modal

**Problema:** Modal queda abierto después de éxito, usuario no sabe qué hacer.

#### ✅ Tarea: Implementar auto-close con opción de continuar

**Archivo:** `src/components/voice/VoiceModal.tsx`

```typescript
export function VoiceModal({ isOpen, onClose }: VoiceModalProps) {
  const [showSuccessActions, setShowSuccessActions] = useState(false);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Detectar cuando termina ejecución exitosa
  useEffect(() => {
    if (state === 'ready' && conversationHistory.length > 0) {
      const lastMessage = conversationHistory[conversationHistory.length - 1];
      
      // Si último mensaje fue del asistente (respuesta exitosa)
      if (lastMessage.role === 'assistant') {
        setShowSuccessActions(true);
        
        // Auto-cerrar en 3 segundos
        autoCloseTimerRef.current = setTimeout(() => {
          handleClose();
        }, 3000);
      }
    }

    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, [state, conversationHistory]);

  const handleContinue = () => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
    }
    setShowSuccessActions(false);
  };

  return (
    <div className="...">
      {/* ... contenido del modal ... */}

      {/* Acciones después de éxito */}
      {showSuccessActions && (
        <div className="flex gap-2 px-4 py-3 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            className="flex-1"
          >
            Cerrar (cierra en 3s)
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleContinue}
            className="flex-1"
          >
            Otro comando
          </Button>
        </div>
      )}
    </div>
  );
}
```

**Criterio de éxito:**
- [ ] Modal se auto-cierra en 3s después de éxito
- [ ] Usuario puede cancelar auto-close y hacer otro comando
- [ ] Opción clara y visible

---

### 📋 CHECKLIST SEMANA 1

- [ ] **1.1** Labels descriptivos en todos los estados
- [ ] **1.1** Estado executing muestra tool específico
- [ ] **1.2** createExpenseTool retorna confirmación descriptiva
- [ ] **1.2** createIncomeTool retorna confirmación descriptiva
- [ ] **1.3** VoiceErrorHandler implementado
- [ ] **1.3** Todos los errores pasan por handler
- [ ] **1.3** Recovery actions en errores críticos
- [ ] **1.4** Pre-loading de contexto en VoiceModal
- [ ] **1.4** Contexto incluido en requests a Gemini
- [ ] **1.4** System instructions actualizadas
- [ ] **1.4** API route usa contexto
- [ ] **1.5** Auto-close implementado
- [ ] **1.5** Opción de continuar visible

**Testing:**
- [ ] Flujo completo: abrir → hablar → ver confirmación → cerrar
- [ ] Errores comunes tienen recovery actions
- [ ] Solo 1 function call por comando simple
- [ ] Auto-close funciona correctamente

---

## 🏗️ SEMANA 2: SIMPLIFICACIÓN ARQUITECTÓNICA

**Prioridad:** 🟡 MEDIA  
**Impacto:** Reduce complejidad, mejora mantenibilidad  
**Esfuerzo:** 5 días

---

### 2.1 Simplificar IAIRealtimeProvider Interface

**Problema:** Interface tiene métodos que Gemini no usa.

#### ✅ Tarea: Renombrar y simplificar interface

**Archivo:** `src/domain/ports/IAIRealtimeProvider.ts` → `IVoiceProvider.ts`

```typescript
// ANTES:
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
  onAudioResponse(cb: (audioTrack: MediaStreamTrack) => void): void; // ❌ NO USADO CON GEMINI
  onError(cb: (error: Error) => void): void;
  onRecordingTimeUpdate(cb: (timeLeft: number) => void): void;
}

// DESPUÉS:
export interface IVoiceProvider {
  // Lifecycle
  connect(config: VoiceSessionConfig): Promise<void>;
  disconnect(): void;
  
  // Recording
  startRecording(): Promise<void>;
  stopRecording(): void;
  
  // Function calling
  sendFunctionResult(callId: string, result: unknown): void;
  
  // State
  getState(): VoiceProviderState;
  
  // Essential events only
  onStateChange(cb: (state: VoiceProviderState) => void): void;
  onTranscript(cb: (text: string) => void): void;
  onResponse(cb: (text: string) => void): void;
  onFunctionCall(cb: (call: FunctionCall) => void): void;
  onError(cb: (error: VoiceError) => void): void;
  onRecordingTimeUpdate(cb: (timeLeft: number) => void): void;
}
```

**Criterio de éxito:**
- [ ] Interface solo tiene métodos esenciales
- [ ] Nombres más claros y concisos
- [ ] No hay métodos sin usar

---

#### ✅ Tarea: Actualizar GeminiTextProvider

**Archivo:** `src/infrastructure/voice-agent/GeminiTextProvider.ts`

Renombrar clase y actualizar para nueva interface:

```typescript
export class GeminiVoiceProvider implements IVoiceProvider {
  // Renombrar métodos:
  async startRecording(): Promise<void> { // antes: startAudioCapture
    // ...
  }

  stopRecording(): void { // antes: stopAudioCaptureAndProcess
    // ...
  }

  // Eliminar métodos no usados:
  // ❌ onAudioResponse() - eliminado
  
  // Simplificar callbacks:
  onTranscript(callback: (text: string) => void): void {
    // Eliminar parámetro isFinal (simplificar)
    this.onTranscriptCallback = (text) => callback(text);
  }

  onResponse(callback: (text: string) => void): void {
    // Eliminar parámetro isFinal (simplificar)
    this.onTextResponseCallback = (text) => callback(text);
  }
}
```

**Criterio de éxito:**
- [ ] GeminiVoiceProvider implementa IVoiceProvider
- [ ] Métodos renombrados y simplificados
- [ ] Código más limpio y fácil de leer

---

### 2.2 Eliminar Código Deprecated

#### ✅ Tarea: Eliminar OpenAIRealtimeProvider

**Archivos a eliminar:**
- `src/infrastructure/voice-agent/OpenAIRealtimeProvider.ts`
- `src/infrastructure/voice-agent/RealtimeClient.ts`

**Archivos a actualizar:**

**1. AIProviderFactory.ts**
```typescript
// ANTES:
export class AIProviderFactory {
  static create(provider: AIProviderType): IAIRealtimeProvider {
    switch (provider) {
      case 'openai':
        return new OpenAIRealtimeProvider(); // ❌ ELIMINAR
      case 'gemini':
        return new GeminiTextProvider();
      case 'claude':
        throw new Error('...');
    }
  }
}

// DESPUÉS:
export class VoiceProviderFactory {
  static create(provider: VoiceProviderType): IVoiceProvider {
    switch (provider) {
      case 'gemini':
        return new GeminiVoiceProvider();
      case 'claude':
        throw new Error('Claude provider no implementado');
      default:
        throw new Error(`Provider desconocido: ${provider}`);
    }
  }
  
  static getSupportedProviders(): VoiceProviderType[] {
    return ['gemini'];
  }
}
```

**2. config.ts**
```typescript
// Eliminar constantes de OpenAI:
// ❌ VOICE_AGENT_CONFIG
// ❌ buildSystemInstructions (ya está en gemini-config.ts)

// Mantener solo:
export const VOICE_LIMITS = {
  maxCommandsPerDay: 10,
  maxInputDurationSeconds: 15,
} as const;
```

**Criterio de éxito:**
- [ ] OpenAIRealtimeProvider eliminado
- [ ] RealtimeClient eliminado
- [ ] Factory simplificado
- [ ] No quedan referencias a OpenAI en el código

---

#### ✅ Tarea: Eliminar Backward Compatibility Aliases

**Archivo:** `src/components/voice/VoiceProvider.tsx`

```typescript
// Buscar y eliminar:
// ❌ const startCommand = startRecording;
// ❌ const cancelCommand = endSession;
// ❌ const forceCommitAudio = stopRecording;

// Eliminar del context type:
interface VoiceContextType {
  // ... existing properties ...
  // ❌ startCommand: () => Promise<void>;
  // ❌ cancelCommand: () => void;
  // ❌ forceCommitAudio: () => void;
}
```

**Archivo:** `src/application/hooks/useVoiceAgent.ts`

```typescript
// Eliminar del return:
export function useVoiceAgent(): UseVoiceAgent {
  return {
    // ... existing properties ...
    // ❌ startCommand: context.startCommand,
    // ❌ cancelCommand: context.cancelCommand,
    // ❌ forceCommitAudio: context.forceCommitAudio,
  };
}
```

**Criterio de éxito:**
- [ ] No hay aliases de métodos deprecated
- [ ] Código más limpio y directo

---

### 2.3 State Machine Centralizado

**Problema:** Estado distribuido en 3 lugares diferentes.

#### ✅ Tarea: Crear VoiceStateMachine

**Archivo nuevo:** `src/infrastructure/voice-agent/VoiceStateMachine.ts`

```typescript
export type VoiceState =
  | { status: 'idle' }
  | { status: 'connecting' }
  | { status: 'ready' }
  | { status: 'recording'; transcript: string; timeLeft: number }
  | { status: 'processing'; transcript: string }
  | { status: 'executing'; toolName: string; toolLabel: string }
  | { status: 'responding'; response: string }
  | { status: 'error'; error: VoiceError };

export type VoiceEvent =
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

export class VoiceStateMachine {
  private state: VoiceState = { status: 'idle' };
  private listeners: Array<(state: VoiceState) => void> = [];

  getState(): VoiceState {
    return this.state;
  }

  subscribe(listener: (state: VoiceState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  send(event: VoiceEvent): void {
    const nextState = this.transition(this.state, event);
    
    if (nextState !== this.state) {
      this.state = nextState;
      this.listeners.forEach(listener => listener(this.state));
    }
  }

  private transition(state: VoiceState, event: VoiceEvent): VoiceState {
    switch (state.status) {
      case 'idle':
        if (event.type === 'CONNECT') return { status: 'connecting' };
        break;

      case 'connecting':
        if (event.type === 'CONNECTED') return { status: 'ready' };
        if (event.type === 'ERROR') return { status: 'error', error: event.error };
        break;

      case 'ready':
        if (event.type === 'START_RECORDING') return { status: 'recording', transcript: '', timeLeft: 15 };
        if (event.type === 'DISCONNECT') return { status: 'idle' };
        break;

      case 'recording':
        if (event.type === 'TRANSCRIPT_UPDATE') {
          return { status: 'recording', transcript: event.transcript, timeLeft: event.timeLeft };
        }
        if (event.type === 'STOP_RECORDING') {
          return { status: 'processing', transcript: event.transcript };
        }
        if (event.type === 'ERROR') return { status: 'error', error: event.error };
        break;

      case 'processing':
        if (event.type === 'FUNCTION_CALL') {
          return { status: 'executing', toolName: event.toolName, toolLabel: event.toolLabel };
        }
        if (event.type === 'RESPONSE') {
          return { status: 'responding', response: event.text };
        }
        if (event.type === 'ERROR') return { status: 'error', error: event.error };
        break;

      case 'executing':
        if (event.type === 'RESPONSE') {
          return { status: 'responding', response: event.text };
        }
        if (event.type === 'ERROR') return { status: 'error', error: event.error };
        break;

      case 'responding':
        if (event.type === 'READY') return { status: 'ready' };
        break;

      case 'error':
        if (event.type === 'READY') return { status: 'ready' };
        if (event.type === 'DISCONNECT') return { status: 'idle' };
        break;
    }

    return state;
  }
}
```

**Criterio de éxito:**
- [ ] Todas las transiciones de estado en un solo lugar
- [ ] Estado inmutable y predecible
- [ ] Fácil de debuggear y testear

---

#### ✅ Tarea: Integrar StateMachine en VoiceProvider

**Archivo:** `src/components/voice/VoiceProvider.tsx`

```typescript
import { VoiceStateMachine, type VoiceState, type VoiceEvent } from '@/infrastructure/voice-agent/VoiceStateMachine';

export function VoiceProvider({ children }: VoiceProviderProps) {
  const stateMachine = useRef(new VoiceStateMachine());
  const [state, setState] = useState<VoiceState>(stateMachine.current.getState());

  // Suscribirse a cambios de estado
  useEffect(() => {
    return stateMachine.current.subscribe(setState);
  }, []);

  // Conectar provider events a state machine
  useEffect(() => {
    if (!providerRef.current) return;

    providerRef.current.onStateChange((providerState) => {
      if (providerState === 'connecting') {
        stateMachine.current.send({ type: 'CONNECT' });
      } else if (providerState === 'ready') {
        stateMachine.current.send({ type: 'CONNECTED' });
      }
      // ... etc
    });

    providerRef.current.onTranscript((transcript, timeLeft) => {
      stateMachine.current.send({
        type: 'TRANSCRIPT_UPDATE',
        transcript,
        timeLeft,
      });
    });

    // ... etc
  }, []);

  // Usar state machine en toda la lógica
  const currentStatus = state.status;
  
  // ... resto del componente
}
```

**Criterio de éxito:**
- [ ] State machine es fuente única de verdad
- [ ] No hay estado duplicado
- [ ] Debugging simplificado

---

### 2.4 Desacoplar VoiceProvider

**Problema:** VoiceProvider hace demasiado (God Object).

#### ✅ Tarea: Extraer lógica de ejecución de tools

**Archivo nuevo:** `src/infrastructure/voice-agent/VoiceToolExecutor.ts`

```typescript
import { VoiceToolRegistry } from './VoiceToolRegistry';
import { DIContainer } from '@/infrastructure/di/DIContainer';
import type { AIFunctionCall } from '@/domain/ports';

export class VoiceToolExecutor {
  private registry = VoiceToolRegistry.getInstance();

  async execute(
    functionCall: AIFunctionCall,
    context: { userId: string; orgId: string }
  ) {
    const tool = this.registry.getByName(functionCall.name);

    if (!tool) {
      throw new Error(`Tool no encontrado: ${functionCall.name}`);
    }

    const container = DIContainer.getInstance();
    container.setOrgId(context.orgId);

    const result = await tool.execute(functionCall.arguments, {
      userId: context.userId,
      orgId: context.orgId,
      container,
    });

    return {
      result,
      metadata: tool.metadata || {}, // Tool metadata para invalidation, etc.
    };
  }
}
```

**Criterio de éxito:**
- [ ] Lógica de ejecución encapsulada
- [ ] VoiceProvider solo orquesta, no ejecuta
- [ ] Fácil de testear en aislamiento

---

#### ✅ Tarea: Extraer logging a hook dedicado

**Archivo:** `src/application/hooks/useVoiceLogger.ts`

```typescript
export function useVoiceLogger() {
  const { user } = useAuth();
  const { logCommand } = useVoiceUsageLogger();

  const log = useCallback(async (data: {
    toolName: string;
    args: Record<string, unknown>;
    success: boolean;
    error?: string;
  }) => {
    if (!user) return;

    await logCommand(user.id, {
      transcription: '', // Capturar de context si es necesario
      toolsExecuted: [data.toolName],
      tokensUsed: 0,
      success: data.success,
      errorMessage: data.error,
    }).catch(console.error);
  }, [user, logCommand]);

  return { log };
}
```

**Criterio de éxito:**
- [ ] Logging transparente y desacoplado
- [ ] VoiceProvider no sabe de logging
- [ ] Se puede agregar otros listeners fácilmente

---

### 📋 CHECKLIST SEMANA 2

- [ ] **2.1** Interface IVoiceProvider creada
- [ ] **2.1** GeminiVoiceProvider implementa nueva interface
- [ ] **2.2** OpenAIRealtimeProvider eliminado
- [ ] **2.2** RealtimeClient eliminado
- [ ] **2.2** Backward compat aliases eliminados
- [ ] **2.3** VoiceStateMachine implementado
- [ ] **2.3** StateMachine integrado en VoiceProvider
- [ ] **2.4** VoiceToolExecutor extraído
- [ ] **2.4** useVoiceLogger extraído

**Testing:**
- [ ] Todos los flujos funcionan igual que antes
- [ ] Código más simple y fácil de leer
- [ ] No hay regresiones

---

## 🧪 SEMANA 3: TESTING Y OBSERVABILIDAD

**Prioridad:** 🟡 MEDIA  
**Impacto:** Previene regresiones futuras  
**Esfuerzo:** 5 días

---

### 3.1 Tests E2E con Playwright

#### ✅ Tarea: Setup Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

**Archivo:** `playwright.config.ts`

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

#### ✅ Tarea: Test - Registrar gasto exitoso

**Archivo:** `e2e/voice-assistant.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Voice Assistant', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should register expense via voice command', async ({ page }) => {
    // Mock Web Speech API
    await page.addInitScript(() => {
      // @ts-ignore
      window.SpeechRecognition = class MockSpeechRecognition {
        onresult: any;
        onerror: any;
        onend: any;
        
        start() {
          setTimeout(() => {
            const event = {
              results: [{
                0: { transcript: 'registra un café de cinco mil pesos' },
                isFinal: true,
              }],
            };
            this.onresult?.(event);
            this.onend?.();
          }, 500);
        }
        
        stop() {}
      };
    });

    // Click voice button
    await page.click('[aria-label="Asistente de voz"]');
    await expect(page.locator('text=Asistente de Voz')).toBeVisible();

    // Press and hold PTT button
    const pttButton = page.locator('button[role="button"][aria-label*="hablar"]');
    await pttButton.dispatchEvent('pointerdown');
    
    // Wait for recording
    await expect(page.locator('text=Te escucho')).toBeVisible();
    
    // Release PTT
    await pttButton.dispatchEvent('pointerup');

    // Wait for processing
    await expect(page.locator('text=Entendiendo')).toBeVisible();

    // Wait for execution
    await expect(page.locator('text=Registrando')).toBeVisible();

    // Verify success message
    await expect(page.locator('text=/Gasto de .* registrado/')).toBeVisible({ timeout: 5000 });

    // Verify modal auto-closes
    await expect(page.locator('text=Asistente de Voz')).not.toBeVisible({ timeout: 5000 });
  });

  test('should handle microphone permission denied', async ({ page, context }) => {
    // Deny microphone permission
    await context.grantPermissions([], { origin: 'http://localhost:3000' });

    // Click voice button
    await page.click('[aria-label="Asistente de voz"]');

    // Verify error message
    await expect(page.locator('text=Micrófono bloqueado')).toBeVisible();
    await expect(page.locator('text=Ver cómo habilitarlo')).toBeVisible();
  });

  test('should handle empty transcript', async ({ page }) => {
    // Mock empty transcript
    await page.addInitScript(() => {
      // @ts-ignore
      window.SpeechRecognition = class MockSpeechRecognition {
        onresult: any;
        onerror: any;
        
        start() {
          setTimeout(() => {
            this.onerror?.({ error: 'no-speech', message: 'No speech detected' });
          }, 500);
        }
        
        stop() {}
      };
    });

    await page.click('[aria-label="Asistente de voz"]');
    const pttButton = page.locator('button[role="button"][aria-label*="hablar"]');
    await pttButton.dispatchEvent('pointerdown');
    await pttButton.dispatchEvent('pointerup');

    await expect(page.locator('text=No te escuché')).toBeVisible();
  });
});
```

**Criterio de éxito:**
- [ ] Test de flujo exitoso pasa
- [ ] Test de error de permisos pasa
- [ ] Test de transcript vacío pasa
- [ ] Tests corren en CI/CD

---

### 3.2 Telemetry y Métricas

#### ✅ Tarea: Crear sistema de métricas

**Archivo nuevo:** `src/infrastructure/voice-agent/VoiceMetrics.ts`

```typescript
interface VoiceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class VoiceMetrics {
  private static instance: VoiceMetrics;
  private metrics: VoiceMetric[] = [];

  static getInstance(): VoiceMetrics {
    if (!VoiceMetrics.instance) {
      VoiceMetrics.instance = new VoiceMetrics();
    }
    return VoiceMetrics.instance;
  }

  track(name: string, value: number, metadata?: Record<string, any>): void {
    const metric: VoiceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // Log to console en dev
    if (process.env.NODE_ENV === 'development') {
      console.log(`[VoiceMetric] ${name}:`, value, metadata);
    }

    // Enviar a analytics si está habilitado
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track(`voice_${name}`, {
        value,
        ...metadata,
      });
    }
  }

  getMetrics(): VoiceMetric[] {
    return [...this.metrics];
  }

  getAverageByName(name: string): number {
    const filtered = this.metrics.filter(m => m.name === name);
    if (filtered.length === 0) return 0;
    
    const sum = filtered.reduce((acc, m) => acc + m.value, 0);
    return sum / filtered.length;
  }

  clear(): void {
    this.metrics = [];
  }
}

export const voiceMetrics = VoiceMetrics.getInstance();

// Helper functions
export function startTimer(label: string): () => void {
  const startTime = performance.now();
  
  return () => {
    const duration = performance.now() - startTime;
    voiceMetrics.track(`${label}_duration_ms`, duration);
  };
}
```

**Criterio de éxito:**
- [ ] Métricas se capturan correctamente
- [ ] Se pueden consultar en cualquier momento
- [ ] Se integran con analytics externo

---

#### ✅ Tarea: Integrar métricas en VoiceProvider

**Archivo:** `src/components/voice/VoiceProvider.tsx`

```typescript
import { voiceMetrics, startTimer } from '@/infrastructure/voice-agent/VoiceMetrics';

export function VoiceProvider({ children }: VoiceProviderProps) {
  // Track connection time
  const connectSession = useCallback(async () => {
    const endTimer = startTimer('connection');
    
    try {
      // ... existing connection logic ...
      voiceMetrics.track('connection_success', 1);
    } catch (error) {
      voiceMetrics.track('connection_error', 1, { error: error.message });
      throw error;
    } finally {
      endTimer();
    }
  }, []);

  // Track recording time
  const startRecording = useCallback(async () => {
    const endTimer = startTimer('recording');
    voiceMetrics.track('recording_started', 1);
    
    // ... existing logic ...
  }, []);

  // Track tool execution
  const handleFunctionCall = useCallback(async (functionCall: AIFunctionCall) => {
    const endTimer = startTimer('tool_execution');
    
    try {
      const result = await tool.execute(/* ... */);
      
      voiceMetrics.track('tool_success', 1, {
        toolName: functionCall.name,
      });
      
      return result;
    } catch (error) {
      voiceMetrics.track('tool_error', 1, {
        toolName: functionCall.name,
        error: error.message,
      });
      throw error;
    } finally {
      endTimer();
    }
  }, []);
}
```

**Métricas importantes a trackear:**
- `connection_duration_ms` - Tiempo de conexión
- `recording_duration_ms` - Tiempo de grabación
- `tool_execution_duration_ms` - Tiempo de ejecución de tool
- `connection_success` - Conexiones exitosas
- `connection_error` - Errores de conexión
- `tool_success` - Tools exitosos
- `tool_error` - Errores de tools
- `commands_per_session` - Comandos por sesión

**Criterio de éxito:**
- [ ] Todas las métricas críticas se capturan
- [ ] Métricas visibles en console en dev mode
- [ ] Dashboard de métricas accesible

---

### 3.3 Documentación Consolidada

#### ✅ Tarea: Crear estructura de docs

**Crear carpeta:** `docs/voice-assistant/`

**Archivos:**
1. `README.md` - Punto de entrada único
2. `ARCHITECTURE.md` - Diagrama de componentes
3. `USER_GUIDE.md` - Guía de usuario
4. `DEVELOPER_GUIDE.md` - Guía de desarrollo
5. `TROUBLESHOOTING.md` - Problemas comunes
6. `CHANGELOG.md` - Histórico de cambios

---

**Archivo:** `docs/voice-assistant/README.md`

```markdown
# Asistente de Voz

Sistema de comandos de voz para registro rápido de transacciones financieras.

## 🎯 Quick Start

1. Click en el botón de micrófono 🎤
2. Mantén presionado y habla: "Registra un café de 5 lucas"
3. Suelta el botón
4. ✅ Listo! Transacción registrada

## 📚 Documentación

- [Arquitectura](./ARCHITECTURE.md) - Cómo funciona internamente
- [Guía de Usuario](./USER_GUIDE.md) - Cómo usar el asistente
- [Guía de Desarrollo](./DEVELOPER_GUIDE.md) - Cómo desarrollar
- [Troubleshooting](./TROUBLESHOOTING.md) - Problemas comunes

## 🚀 Tecnologías

- **STT:** Web Speech API (gratis)
- **AI:** Gemini 2.5 Flash-Lite (gratis)
- **TTS:** Web Speech API (gratis)
- **Backend:** Firebase Functions

## 📊 Límites

- 10 comandos de voz por día
- 15 segundos máximo por comando
- Solo disponible en Chrome, Edge, Safari

## 🔧 Configuración

Ver [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
```

---

**Archivo:** `docs/voice-assistant/TROUBLESHOOTING.md`

```markdown
# Troubleshooting - Asistente de Voz

## Problemas Comunes

### "Micrófono bloqueado"

**Causa:** El navegador no tiene permiso para acceder al micrófono.

**Solución:**
1. Click en el ícono del candado en la barra de direcciones
2. Permitir "Micrófono"
3. Recargar la página

**Chrome:** chrome://settings/content/microphone  
**Safari:** Preferencias → Sitios web → Micrófono  
**Edge:** edge://settings/content/microphone

---

### "No te escuché"

**Causa:** El micrófono no capturó audio.

**Soluciones:**
- Habla más fuerte
- Acércate al micrófono
- Verifica que tu micrófono esté funcionando
- Prueba en una habitación sin ruido de fondo

---

### "Límite diario alcanzado"

**Causa:** Ya usaste tus 10 comandos de voz del día.

**Soluciones:**
- Espera hasta mañana (resetea a las 00:00)
- Registra transacciones manualmente desde el formulario

---

### "Navegador no compatible"

**Causa:** Tu navegador no soporta Web Speech API.

**Solución:**
- Usa Chrome (recomendado)
- Usa Edge
- Usa Safari
- NO uses Firefox (no soporta Web Speech API)

---

## Debugging

### Ver métricas de performance

```javascript
// En console del navegador:
voiceMetrics.getMetrics()
voiceMetrics.getAverageByName('connection_duration_ms')
```

### Logs detallados

```javascript
// Activar logs en localStorage:
localStorage.setItem('voice_debug', 'true')

// Recargar página y ver logs en console
```
```

**Criterio de éxito:**
- [ ] Documentación completa y actualizada
- [ ] Punto de entrada único (README.md)
- [ ] Troubleshooting cubre casos comunes
- [ ] Guías fáciles de seguir

---

### 📋 CHECKLIST SEMANA 3

- [ ] **3.1** Playwright instalado y configurado
- [ ] **3.1** Test de flujo exitoso implementado
- [ ] **3.1** Test de error de permisos implementado
- [ ] **3.1** Test de transcript vacío implementado
- [ ] **3.2** VoiceMetrics implementado
- [ ] **3.2** Métricas integradas en VoiceProvider
- [ ] **3.2** Dashboard de métricas accesible
- [ ] **3.3** Documentación consolidada en docs/voice-assistant/
- [ ] **3.3** README.md completo
- [ ] **3.3** TROUBLESHOOTING.md completo

**Testing:**
- [ ] Todos los tests E2E pasan
- [ ] Métricas se capturan correctamente
- [ ] Documentación clara y útil

---

## ⚡ SEMANA 4: OPTIMIZACIONES

**Prioridad:** 🟢 BAJA  
**Impacto:** Mejoras incrementales  
**Esfuerzo:** 5 días

---

### 4.1 Lazy Loading de Provider

**Problema:** Auto-connect hace requests antes de que usuario abra modal.

#### ✅ Tarea: Eliminar auto-connect y usar lazy loading

**Archivo:** `src/components/voice/VoiceProvider.tsx`

```typescript
// ELIMINAR auto-connect:
// ❌ useEffect(() => {
//   if (user && firebaseUser && currentOrgId && !isSessionActive) {
//     prepareSession().catch(...);
//   }
// }, [user, firebaseUser, currentOrgId, isSessionActive, prepareSession]);

// En su lugar, conectar al abrir modal:
const openModal = useCallback(() => {
  setIsModalOpen(true);
  
  // Solo conectar si no hay sesión activa
  if (!isSessionActive) {
    prepareSession().catch(console.error);
  }
}, [isSessionActive, prepareSession]);
```

**Criterio de éxito:**
- [ ] No hay requests hasta que usuario abre modal
- [ ] Conexión es rápida (< 1s)
- [ ] UX no se ve afectada

---

### 4.2 Tool Metadata System

**Problema:** Invalidation de cache es manual y propenso a errores.

#### ✅ Tarea: Agregar metadata a tools

**Archivo:** `src/infrastructure/voice-agent/types.ts`

```typescript
export interface VoiceToolMetadata {
  type: 'action' | 'query';
  invalidates?: string[];
  confirmationMessage?: (args: Record<string, unknown>) => string;
}

export interface VoiceTool {
  declaration: OpenAIToolDeclaration;
  metadata?: VoiceToolMetadata; // ← NUEVO
  execute: (args: Record<string, unknown>, context: VoiceToolContext) => Promise<VoiceToolResult>;
}
```

---

**Archivo:** `src/infrastructure/voice-agent/tools/createExpenseTool.ts`

```typescript
export const createExpenseTool: VoiceTool = {
  declaration: { /* ... */ },
  
  metadata: {
    type: 'action',
    invalidates: ['transactions', 'accounts', 'dashboard'],
    confirmationMessage: (args) => {
      const amount = formatCurrency(args.amount as number);
      const category = args.categoryName as string;
      const account = args.accountName as string;
      return `Gasto de ${amount} en ${category} registrado en ${account}`;
    },
  },

  execute: async (args, context) => {
    // ... execution logic ...
    
    // Retornar sin mensaje (se genera automáticamente desde metadata)
    return {
      success: true,
      data: result,
    };
  },
};
```

---

**Archivo:** `src/components/voice/VoiceProvider.tsx`

```typescript
const handleFunctionCall = useCallback(async (functionCall: AIFunctionCall) => {
  // ... execution ...
  
  const { result, metadata } = await toolExecutor.execute(functionCall, context);

  // Invalidar cache automáticamente
  if (metadata.type === 'action' && metadata.invalidates) {
    metadata.invalidates.forEach((queryKey) => {
      queryClient.invalidateQueries({ queryKey: [queryKey, currentOrg] });
    });
  }

  // Toast automático
  if (result.success && metadata.confirmationMessage) {
    const message = metadata.confirmationMessage(functionCall.arguments);
    toast.success(message);
  }

  // ...
}, []);
```

**Criterio de éxito:**
- [ ] Invalidation automática de cache
- [ ] Confirmaciones automáticas desde metadata
- [ ] No hay código duplicado

---

### 4.3 UI Móvil Optimizada

**Problema:** Modal ocupa 85vh en móvil, botón PTT difícil de alcanzar.

#### ✅ Tarea: Rediseñar layout móvil

**Archivo:** `src/components/voice/VoiceModal.tsx`

```typescript
<div
  className={cn(
    'bg-card border border-border shadow-2xl w-full flex flex-col',
    'animate-in fade-in slide-in-from-bottom-4',
    
    // Mobile: PTT button en centro, fácil de alcanzar
    'h-[70vh] rounded-t-3xl',
    'pb-safe', // Safe area para iPhones
    
    // Desktop: centrado
    'sm:max-w-md sm:h-[600px] sm:rounded-2xl',
  )}
>
  {/* Header */}
  <div className="flex items-center justify-between px-4 py-3 border-b">
    {/* ... */}
  </div>

  {/* MÓVIL: PTT button ARRIBA para fácil acceso con pulgar */}
  <div className="flex flex-col items-center py-6 border-b sm:hidden">
    <VoicePushToTalkButton {...props} />
  </div>

  {/* Conversation History - Más compacto en móvil */}
  <div className="flex-1 min-h-0">
    <VoiceConversationHistory {...props} />
  </div>

  {/* DESKTOP: PTT button abajo */}
  <div className="hidden sm:flex flex-col items-center py-4 border-t">
    <VoicePushToTalkButton {...props} />
  </div>

  {/* Footer */}
  <div className="flex items-center justify-between px-4 py-2 border-t">
    {/* ... */}
  </div>
</div>
```

**Criterio de éxito:**
- [ ] Botón PTT fácil de alcanzar en móvil
- [ ] Modal no ocupa toda la pantalla
- [ ] Safe area respetada en iPhones

---

### 4.4 Rate Limit Proactivo

**Problema:** Usuario no sabe cuántos comandos tiene hasta agotarlos.

#### ✅ Tarea: Notificaciones proactivas

**Archivo:** `src/components/voice/VoiceModal.tsx`

```typescript
export function VoiceModal({ isOpen, onClose }: VoiceModalProps) {
  const [hasShownDailyWelcome, setHasShownDailyWelcome] = useState(false);
  const [hasShownLowCommandsWarning, setHasShownLowCommandsWarning] = useState(false);

  // Welcome message al abrir modal por primera vez del día
  useEffect(() => {
    if (isOpen && !hasShownDailyWelcome && commandsRemainingToday === 10) {
      toast.info('Tienes 10 comandos de voz disponibles hoy 🎤', {
        duration: 3000,
      });
      setHasShownDailyWelcome(true);
    }
  }, [isOpen, hasShownDailyWelcome, commandsRemainingToday]);

  // Warning cuando quedan pocos comandos
  useEffect(() => {
    if (isOpen && !hasShownLowCommandsWarning && commandsRemainingToday === 3) {
      toast.warning('Te quedan 3 comandos de voz hoy', {
        duration: 4000,
      });
      setHasShownLowCommandsWarning(true);
    }
  }, [isOpen, hasShownLowCommandsWarning, commandsRemainingToday]);

  // Error cuando se agotan
  if (commandsRemainingToday === 0) {
    return (
      <div className="...">
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <h3 className="text-lg font-semibold mb-2">
            Comandos de voz agotados
          </h3>
          <p className="text-muted-foreground mb-4">
            Has usado tus 10 comandos de voz del día.
            <br />
            Disponible mañana a las 00:00.
          </p>
          <div className="bg-muted rounded-lg p-4 mb-4">
            <p className="text-sm">
              💡 <strong>Tip:</strong> Registra transacciones manualmente desde el formulario
            </p>
          </div>
          <Button onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    );
  }

  // ... resto del modal normal
}
```

**Criterio de éxito:**
- [ ] Usuario informado desde el inicio
- [ ] Warning cuando quedan 3 comandos
- [ ] Mensaje útil cuando se agotan con alternativa clara

---

### 📋 CHECKLIST SEMANA 4

- [ ] **4.1** Auto-connect eliminado
- [ ] **4.1** Lazy loading implementado
- [ ] **4.2** Tool metadata system implementado
- [ ] **4.2** Invalidation automática de cache
- [ ] **4.2** Confirmaciones automáticas
- [ ] **4.3** Layout móvil optimizado
- [ ] **4.3** PTT button fácil de alcanzar
- [ ] **4.3** Safe area respetada
- [ ] **4.4** Welcome message implementado
- [ ] **4.4** Low commands warning implementado
- [ ] **4.4** Zero commands mensaje implementado

**Testing:**
- [ ] No hay requests innecesarios
- [ ] Cache se invalida correctamente
- [ ] UX móvil mejorada
- [ ] Notificaciones proactivas funcionan

---

## 🎯 MÉTRICAS DE ÉXITO FINAL

### Antes del Refactor
- ❌ Tiempo primer comando: ~5-8s
- ❌ Tasa de errores: ~15-20%
- ❌ Tasa de abandono: ~30%
- ❌ Function calls por comando: 4
- ❌ Tokens por comando: ~1400

### Después del Refactor
- ✅ Tiempo primer comando: <3s
- ✅ Tasa de errores: <5%
- ✅ Tasa de abandono: <10%
- ✅ Function calls por comando: 1
- ✅ Tokens por comando: ~600 (57% ahorro)

---

## 📝 NOTAS FINALES

### Priorización
- **Semana 1** es CRÍTICA - Define UX
- **Semana 2** es importante - Mejora mantenibilidad
- **Semana 3** es valiosa - Previene regresiones
- **Semana 4** es nice-to-have - Pulido final

### Rollback Plan
Si algo sale mal:
1. Mantén `git` commits limpios por tarea
2. Cada semana debe ser deployable
3. Feature flags para rollback rápido

### Post-Implementation
- Monitorear métricas por 2 semanas
- Recopilar feedback de usuarios
- Iterar según datos reales

---

## ✅ VERIFICACIÓN DE COMPLETITUD

Al final de las 4 semanas:

- [ ] Todos los checkboxes marcados
- [ ] Tests E2E pasando
- [ ] Métricas capturándose correctamente
- [ ] Documentación actualizada
- [ ] Código limpio y mantenible
- [ ] Usuario satisfecho con UX

**Objetivo cumplido: Sistema de voz pasa de 5/10 a 9/10** 🎉
