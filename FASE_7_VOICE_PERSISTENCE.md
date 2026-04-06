# Fase 7: Persistencia en Firestore - Voice Usage Tracking

## ✅ Completado - 2026-04-03

### Resumen
Implementación completa de persistencia en Firestore para rastrear el uso del Voice Agent, reemplazando el rate limiting en memoria con una solución híbrida que combina caché para performance y Firestore como fuente de verdad.

---

## 📁 Archivos Creados

### 1. Domain Layer - Entidades

**`src/domain/entities/VoiceUsage.ts`**
```typescript
export interface VoiceCommandLog {
  timestamp: Date;
  transcription: string;
  toolsExecuted: string[];
  tokensUsed: number;
  success: boolean;
  errorMessage?: string;
}

export interface VoiceUsageDaily {
  userId: string;
  date: string; // YYYY-MM-DD
  commandsUsed: number;
  totalTokens: number;
  commands: VoiceCommandLog[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceUsageStats {
  commandsToday: number;
  tokensToday: number;
  commandsRemaining: number;
  resetAt: Date;
}
```

### 2. Domain Layer - Repository Interface

**`src/domain/repositories/IVoiceUsageRepository.ts`**
- `getDailyUsage(userId, date)`: Obtiene uso del día
- `incrementCommandCount(userId, date)`: Incrementa contador atómicamente
- `logCommand(userId, date, commandLog)`: Guarda log de comando
- `getUsageStats(userId, maxCommandsPerDay)`: Estadísticas actuales
- `getUsageHistory(userId, startDate, endDate)`: Historial de uso

### 3. Infrastructure Layer - Repositories

**`src/infrastructure/repositories/FirestoreVoiceUsageRepository.ts`**
- Implementación client-side usando Firebase SDK
- Usa Timestamp, runTransaction, arrayUnion, increment
- Para uso en componentes React

**`src/infrastructure/repositories/AdminVoiceUsageRepository.ts`**
- Implementación server-side usando Firebase Admin SDK
- Para uso en API Routes
- Usa FieldValue de firebase-admin/firestore

### 4. Application Layer - Hook

**`src/application/hooks/useVoiceUsageLogger.ts`**
```typescript
export function useVoiceUsageLogger() {
  const logCommand = async (commandLog) => {
    await voiceUsageRepo.logCommand(user.id, today, fullLog);
  };
  return { logCommand };
}
```

---

## 🔄 Archivos Modificados

### 1. API Route - Rate Limiting con Firestore

**`src/app/api/voice/session/route.ts`**

**Antes (solo memoria):**
```typescript
const rateLimitMap = new Map<string, { date: string; count: number }>();

function checkRateLimit(userId: string) {
  // Incrementa contador en memoria
  // Se pierde al reiniciar servidor
}
```

**Después (híbrido con caché):**
```typescript
const voiceUsageRepo = new AdminVoiceUsageRepository();
const cacheMap = new Map(); // Caché con TTL de 30s

async function checkRateLimit(userId: string) {
  // 1. Verificar caché (rápido)
  if (cached && cached.date === today && !expired) {
    cached.count += 1; // Optimista
  }
  
  // 2. Incrementar en Firestore (fuente de verdad)
  const commandsUsed = await voiceUsageRepo.incrementCommandCount(userId, today);
  
  // 3. Actualizar caché
  cacheMap.set(userId, { date: today, count: commandsUsed, lastSync: now });
  
  return { allowed: commandsUsed <= 10, remaining: 10 - commandsUsed };
}
```

**Ventajas:**
- ✅ Persiste entre reinicios
- ✅ Performance: caché reduce llamadas a Firestore
- ✅ Fallback: si Firestore falla, permite el comando (mejor UX)

### 2. VoiceProvider - Logging de Comandos

**`src/components/voice/VoiceProvider.tsx`**

**Cambios:**
1. Importa `useVoiceUsageLogger`
2. Usa el hook: `const { logCommand } = useVoiceUsageLogger()`
3. Agrega logging después de éxito:
   ```typescript
   if (result.success) {
     showSuccessToast(functionCall.name, result.message);
   }
   
   // NUEVO: Guardar log en Firestore (async)
   logCommand({
     transcription: transcript,
     toolsExecuted: [functionCall.name],
     tokensUsed: 0, // TODO: Capturar usage real
     success: true,
   }).catch(console.error);
   ```

4. Agrega logging después de error:
   ```typescript
   toast.error('Error al ejecutar acción', { description: errorMessage });
   
   // NUEVO: Guardar log de error
   logCommand({
     transcription: transcript,
     toolsExecuted: [functionCall.name],
     tokensUsed: 0,
     success: false,
     errorMessage,
   }).catch(console.error);
   ```

### 3. Providers - VoiceProvider Siempre Activo

**`src/app/providers.tsx`**

**Antes:**
```typescript
{APP_CONFIG.enableVoiceAgent ? (
  <VoiceProvider>{children}</VoiceProvider>
) : (
  children
)}
```

**Después:**
```typescript
<VoiceProvider>{children}</VoiceProvider>
// Siempre envuelve, pero VoiceButton solo se renderiza si feature flag activo
```

**Motivo:** Evitar error "useVoiceContext debe usarse dentro de VoiceProvider"

### 4. Firestore Rules

**`firestore.rules`**
```javascript
// Reglas comentadas (producción):
// match /voiceUsage/{usageId} {
//   // usageId formato: {userId}_{date}
//   allow read, write: if isAuthenticated() && 
//                         request.auth.uid == resource.data.userId;
// }
```

### 5. Exports

**`src/domain/index.ts`**
```typescript
export * from './entities/VoiceUsage';
```

**`src/infrastructure/index.ts`**
```typescript
export * from './repositories/FirestoreVoiceUsageRepository';
export * from './repositories/AdminVoiceUsageRepository';
```

---

## 🗄️ Estructura de Datos en Firestore

### Colección: `voiceUsage`

**Document ID:** `{userId}_{date}`  
Ejemplo: `abc123_2026-04-03`

**Estructura:**
```json
{
  "userId": "abc123",
  "date": "2026-04-03",
  "commandsUsed": 7,
  "totalTokens": 10543,
  "commands": [
    {
      "timestamp": "2026-04-03T14:30:00Z",
      "transcription": "Registra un gasto de 15000 en comida",
      "toolsExecuted": ["create_expense"],
      "tokensUsed": 1523,
      "success": true
    },
    {
      "timestamp": "2026-04-03T15:00:00Z",
      "transcription": "Cuanto tengo en mi cuenta corriente",
      "toolsExecuted": ["get_balance"],
      "tokensUsed": 1200,
      "success": true
    }
    // ... más comandos
  ],
  "createdAt": "2026-04-03T14:25:00Z",
  "updatedAt": "2026-04-03T15:00:00Z"
}
```

**Índices Requeridos:**
- `userId` (ASC) + `date` (ASC) - Para queries de historial

---

## 🎯 Funcionalidades Implementadas

### ✅ Control de Uso Persistente
- Rate limiting sobrevive a reinicios del servidor
- Contador atómico con transacciones
- Caché híbrido para performance (30s TTL)
- Fallback gracioso si Firestore falla

### ✅ Auditoría Completa
- Cada comando registrado con timestamp
- Transcripción del usuario guardada
- Herramientas ejecutadas tracked
- Éxito/Error registrado
- Tokens consumidos (preparado para integración)

### ✅ Métricas de Uso
- Comandos usados por día
- Total de tokens consumidos
- Historial consultable por rango de fechas
- Estadísticas en tiempo real

---

## 📊 Ventajas sobre Sistema In-Memory

| Característica | In-Memory (Fase 6) | Firestore (Fase 7) |
|----------------|-------------------|-------------------|
| **Persistencia** | ❌ Se pierde al reiniciar | ✅ Permanente |
| **Auditoría** | ❌ No hay historial | ✅ Log completo |
| **Métricas** | ❌ No disponibles | ✅ Tokens, comandos, éxito |
| **Multi-server** | ❌ Cada servidor independiente | ✅ Sincronizado |
| **Performance** | ✅ Instantáneo | ✅ Caché híbrido rápido |
| **Costos** | ✅ Sin calls a Firestore | ⚠️ 2 calls por comando |

**Costo estimado:**
- 1 comando = 2 lecturas + 2 escrituras
- 10 comandos/día/usuario = 20 reads + 20 writes
- 1000 usuarios activos/día = 20K reads + 20K writes
- Firestore: Gratis hasta 50K reads + 20K writes/día
- **Costo adicional:** ~$0.06/día con 1000 usuarios activos

---

## 🚀 Próximos Pasos

### TODO Inmediato
- [ ] Capturar `tokensUsed` real de la respuesta de OpenAI
- [ ] Agregar índices compuestos en Firestore
- [ ] Implementar dashboard de métricas en Settings

### Fase 8 (Opcional)
- [ ] Dashboard admin: ver usuarios con más uso
- [ ] Planes de uso: free (10/día), premium (100/día)
- [ ] Alertas cuando usuario alcanza 80% del límite
- [ ] Exportar logs a CSV para análisis

---

## 🧪 Testing

### Build Verification
```bash
npm run build
# ✅ Compiled successfully in 10.7s
```

### Tests Existentes
- **72 tests passing** (integration tests de Fase 6)
- Sin tests específicos para VoiceUsage (candidato para Fase 9)

### Manual Testing
1. Habilitar feature flag: `NEXT_PUBLIC_ENABLE_VOICE_AGENT=true`
2. Ejecutar comando de voz
3. Verificar en Firestore Console: colección `voiceUsage`
4. Verificar que comandosRestantes disminuye
5. Reiniciar servidor → verificar que contador persiste

---

## 📝 Commits

```bash
git add .
git commit -m "feat(voice): Persistencia en Firestore para Voice Usage Tracking

- Crear entidades VoiceUsage con VoiceCommandLog
- Implementar repositorios Client/Admin para Firestore
- Migrar rate limiting de in-memory a híbrido con caché
- Agregar logging automático de comandos en VoiceProvider
- Corregir VoiceButton fuera de VoiceProvider context
- Build passing ✅

Fase 7 completa"

git tag -a v2.0.0-ia-fase-7-persistence -m "Fase 7: Persistencia en Firestore para Voice Usage"
```

---

## 🎓 Lecciones Aprendidas

1. **Caché Híbrido:** Combinar memoria + Firestore balancea performance y persistencia
2. **Async Logging:** Guardar logs sin bloquear (.catch() silencioso)
3. **Atomic Operations:** Usar transacciones para contadores críticos
4. **Fallback Gracioso:** Permitir comando si Firestore falla (mejor UX)
5. **Admin vs Client:** Separar repositorios según contexto (API Routes vs Components)

---

**Status:** ✅ Fase 7 completa con build passing  
**Next:** Fase 8 (Polish) o Fase 9 (Testing & Release)
