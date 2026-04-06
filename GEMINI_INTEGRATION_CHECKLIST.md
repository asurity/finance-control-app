# Checklist de Integración - Migración a Gemini

**Fecha:** 2026-04-05  
**Fase:** FASE 8 - Testing y configuración final  
**Provider:** Gemini 2.5 Flash-Lite + Web Speech API

---

## ✅ Pre-requisitos

- [x] FASE 1-7 completadas y con tags
- [x] `GEMINI_API_KEY` configurada en `.env.local`
- [x] `NEXT_PUBLIC_AI_PROVIDER=gemini` en `.env.local`
- [x] `NEXT_PUBLIC_ENABLE_VOICE_AGENT=true` en `.env.local`
- [ ] Navegador: Chrome o Edge (Web Speech API requerida)
- [ ] Micrófono funcional y con permisos habilitados

---

## 🧪 Tests de Integración Manual

### 1. Compatibilidad de Navegador

- [ ] **Chrome Desktop**: Abrir aplicación, verificar que modal de voz se abre sin errores
- [ ] **Edge Desktop**: Abrir aplicación, verificar que modal de voz se abre sin errores
- [ ] **Safari/Firefox**: Verificar que muestra mensaje de incompatibilidad claro
  - Mensaje esperado: "Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge."

### 2. Inicio de Sesión de Voz

- [ ] Click en botón de micrófono en dashboard
- [ ] Modal se abre correctamente
- [ ] Estado inicial: "Sesión activa" con punto verde visible
- [ ] No hay errores en consola de navegador
- [ ] Estado del provider: `ready` (visible en dev tools si usas React DevTools)

### 3. Push-to-Talk Básico

- [ ] Presionar botón PTT (mantener presionado)
- [ ] Botón cambia a estado "recording" (rojo pulsante)
- [ ] Timer de 15 segundos comienza countdown
- [ ] Hablar: "Hola" (cualquier texto corto)
- [ ] Soltar botón PTT
- [ ] Transcripción aparece en historial de conversación
- [ ] Estado cambia a "processing" → "ready"

### 4. Comando Completo: Gasto con Toda la Información

**Comando:** "Gasté 15 mil en almuerzo en mi visa"

- [ ] PTT presionado → hablar comando → soltar PTT
- [ ] Transcripción visible: "Gasté 15 mil en almuerzo en mi visa"
- [ ] Estado: recording → processing → executing
- [ ] Function calls ejecutados:
  - [ ] `get_organization_context`
  - [ ] `list_accounts`
  - [ ] `list_categories`
  - [ ] `create_expense`
- [ ] Respuesta TTS del asistente: "Registrado" o "Listo" (máximo 3 palabras)
- [ ] **Verificar speechSynthesis**: Ícono `Volume2` con `animate-pulse` visible durante TTS
- [ ] Transacción creada en Firestore (verificar en /transactions)
- [ ] Cache de React Query invalidado (transacción aparece inmediatamente en lista)

### 5. Comando Incompleto: Pregunta Aclaratoria (Multi-turno)

**Turno 1:** "Gasté 10 mil"

- [ ] PTT → hablar → soltar
- [ ] Transcripción visible
- [ ] Estado: recording → processing
- [ ] IA pregunta: "¿En qué cuenta?" (función calling mode AUTO)
- [ ] Respuesta TTS escuchada
- [ ] Historial muestra mensaje de IA

**Turno 2:** "Visa"

- [ ] PTT → hablar "Visa" → soltar
- [ ] Estado: recording → processing → executing
- [ ] Function call: `create_expense` con accountId de Visa
- [ ] Respuesta TTS: "Registrado"
- [ ] Transacción creada correctamente con cuenta Visa

### 6. Comando de Ingreso

**Comando:** "Ingreso de 500 mil por nómina en cuenta corriente"

- [ ] PTT → hablar → soltar
- [ ] Function calls ejecutados correctamente
- [ ] Respuesta TTS: "Registrado"
- [ ] Ingreso creado en Firestore con type="income"
- [ ] Aparece en lista de transacciones

### 7. Gestión de Sesión Multi-turno

- [ ] Ejecutar comando 1: "Gasté 5 mil en café en visa"
- [ ] Esperar respuesta TTS "Registrado"
- [ ] Estado vuelve a "ready"
- [ ] Ejecutar comando 2: "Gasté 3 mil en uber en efectivo"
- [ ] Session persiste (NO se cierra automáticamente)
- [ ] Historial muestra TODOS los mensajes de ambos comandos
- [ ] Contador de comandos restantes decrementa correctamente

### 8. Indicador "IA Hablando"

- [ ] Durante TTS de cualquier respuesta:
  - [ ] Ícono `Volume2` con `animate-pulse` visible en header del modal
  - [ ] Botón PTT deshabilitado mientras IA habla
- [ ] Después de TTS:
  - [ ] Ícono desaparece
  - [ ] Botón PTT vuelve a estar habilitado

### 9. Rate Limiting

- [ ] Verificar contador de comandos inicial (debe ser <= 1000)
- [ ] Ejecutar 1 comando → contador decrementa en 1
- [ ] Si se alcanzan 0 comandos:
  - [ ] Botón PTT deshabilitado
  - [ ] Mensaje claro: "Límite diario alcanzado"
  - [ ] Se muestra hora de reset

### 10. Manejo de Errores

#### Error 1: Micrófono denegado
- [ ] Denegar permisos de micrófono en navegador
- [ ] Intentar abrir modal de voz
- [ ] Error claro: "Permiso de micrófono denegado. Habilita el micrófono..."
- [ ] Toast de error visible

#### Error 2: Sin audio detectado
- [ ] PTT → NO hablar (silencio) → soltar
- [ ] Error: "No se detectó audio. Intenta de nuevo."
- [ ] Estado vuelve a "ready" automáticamente después de 2 segundos

#### Error 3: GEMINI_API_KEY inválida o faltante
- [ ] Remover `GEMINI_API_KEY` de `.env.local` temporalmente
- [ ] Reiniciar servidor
- [ ] Intentar usar voz
- [ ] Error 503: "Servicio de voz de Gemini no disponible"

#### Error 4: Red caída
- [ ] Usar DevTools → Network → Offline
- [ ] Intentar comando de voz
- [ ] Error claro sobre conexión
- [ ] Al reconectar, volver a intentar funciona correctamente

### 11. Timer de Grabación (15s máximo)

- [ ] PTT presionado
- [ ] Countdown visible desde 15s
- [ ] Mantener presionado SIN soltar por 15 segundos completos
- [ ] Al llegar a 0s:
  - [ ] Grabación se detiene automáticamente
  - [ ] Procesa el audio capturado hasta ese momento
  - [ ] Console log: "Tiempo máximo de grabación alcanzado"

### 12. Transcripción Parcial (Interim Results)

- [ ] PTT presionado
- [ ] Hablar lentamente: "Gasté... quince mil... en almuerzo"
- [ ] Durante grabación:
  - [ ] Transcripción parcial visible en tiempo real
  - [ ] Se actualiza mientras hablas
- [ ] Al soltar PTT:
  - [ ] Transcripción final fija en historial

### 13. Descripción Narrativa (REGLA DE GEMINI)

**Comando:** "Gasté 3500 en café en Starbucks por la mañana en visa"

- [ ] Transacción creada
- [ ] Descripción generada: "Café en Starbucks por la mañana" (3-8 palabras narrativas)
- [ ] NO solo: "Café"
- [ ] NO incluye monto en descripción

### 14. Inferencia de Categoría (Mapeo Inteligente)

**Comando:** "Gasté 25 mil en supermercado Jumbo en visa"

- [ ] Categoría inferida automáticamente: "Supermercado" o "Alimentación"
- [ ] NO pregunta por categoría (inferencia exitosa)
- [ ] Descripción: "Compra semanal en Jumbo" o similar

### 15. Confirmaciones Ultra-breves

- [ ] Respuesta TTS después de ejecutar comando exitosamente:
  - [ ] Máximo 3 palabras: "Listo", "Registrado", "Hecho"
  - [ ] NO respuestas largas: "Perfecto, he registrado..."

### 16. Cache Invalidation

- [ ] Antes de comando: Contar transacciones en `/transactions`
- [ ] Ejecutar comando de voz: "Gasté 1000 en test en visa"
- [ ] Inmediatamente después (sin refresh manual):
  - [ ] Transacción nueva visible en lista
  - [ ] No requiere `F5` o reload
  - [ ] React Query cache invalidado correctamente

### 17. Historial de Conversación Persistente

- [ ] Ejecutar 3 comandos diferentes
- [ ] Modal de voz NO se cierra entre comandos
- [ ] Scroll del historial funciona correctamente
- [ ] Todos los mensajes (usuario + IA) visibles en orden cronológico
- [ ] Al cerrar modal manualmente:
  - [ ] Session termina (`disconnect()` llamado)
  - [ ] Al reabrir modal:
    - [ ] Nueva sesión comienza
    - [ ] Historial VACÍO (limpio)

### 18. Logs de Consola (Debugging)

Verificar que los siguientes logs aparecen en consola del navegador:

- [ ] `[GeminiTextProvider] Estado: idle → connecting`
- [ ] `[GeminiTextProvider] Estado: connecting → ready`
- [ ] Durante comando:
  - [ ] `[GeminiTextProvider] Estado: ready → recording`
  - [ ] `[GeminiTextProvider] Estado: recording → processing`
  - [ ] `[GeminiTextProvider] Estado: processing → executing` (si hay function calls)
  - [ ] `[GeminiTextProvider] Estado: executing → ready`
- [ ] NO hay errores de TypeScript en consola

### 19. Compatibilidad con OpenAI (Rollback Test)

**Solo si se necesita verificar rollback:**

- [ ] Cambiar `.env.local`: `NEXT_PUBLIC_AI_PROVIDER=openai`
- [ ] Reiniciar servidor
- [ ] Verificar que voz sigue funcionando con OpenAI WebRTC
- [ ] Volver a `NEXT_PUBLIC_AI_PROVIDER=gemini`
- [ ] Reiniciar servidor
- [ ] Verificar funcionamiento con Gemini nuevamente

---

## 📊 Métricas de Éxito

| Métrica | Objetivo | Estado |
|---------|----------|--------|
| **Comando simple exitoso** | >95% | [ ] |
| **Multi-turno exitoso** | >90% | [ ] |
| **Transcripción precisa** | >85% | [ ] |
| **TTS audible y claro** | 100% | [ ] |
| **Latencia total por comando** | <3s | [ ] |
| **Errores manejados gracefully** | 100% | [ ] |
| **Cache invalidation funciona** | 100% | [ ] |

---

## 🐛 Issues Encontrados

Documentar aquí cualquier bug o comportamiento inesperado:

```
Ejemplo:
- [FECHA] Descripción del issue
- Pasos para reproducir
- Comportamiento esperado vs actual
- Workaround (si existe)
```

---

## 📝 Notas de Testing

- **STT (Web Speech API)**: La precisión depende del acento. Probar con diferentes hablantes.
- **TTS (speechSynthesis)**: Las voces disponibles varían por sistema operativo. En Windows, la voz española puede ser "Microsoft Helena" o similar.
- **Rate Limits Gemini**: En tier gratuito, 30 RPM. Si se excede, Gemini devuelve error 429. El sistema debe manejar esto gracefully.

---

## ✅ Checklist Final FASE 8

- [ ] Todos los tests de integración manual pasados
- [ ] Documentación actualizada en INSTRUCCIONES_ENV.md
- [ ] No hay console.error en flujo normal
- [ ] Performance aceptable (<3s por comando)
- [ ] Compatibilidad de navegador verificada
- [ ] Pronto para FASE 9 (deprecación de OpenAI)

---

**Estado General:** 🟡 En Progreso  
**Próximo Paso:** Ejecutar checklist completo, documentar resultados, commit FASE 8
