# Troubleshooting - Asistente de Voz

Guía de solución de problemas comunes del sistema de voz.

## 🎤 Problemas con el Micrófono

### "Micrófono bloqueado"

**Síntoma:** El navegador muestra un ícono de micrófono tachado o bloqueado.

**Causa:** El navegador no tiene permiso para acceder al micrófono.

**Solución:**

1. **Chrome/Edge:**
   - Click en el ícono del candado en la barra de direcciones
   - Buscar "Micrófono" en la lista de permisos
   - Cambiar a "Permitir"
   - Recargar la página (F5)

2. **Safari:**
   - Safari → Preferencias → Sitios web → Micrófono
   - Seleccionar el sitio y cambiar a "Permitir"
   - Recargar la página

3. **Configuración del sistema:**
   - **Windows:** Configuración → Privacidad → Micrófono → Permitir acceso
   - **macOS:** Preferencias del Sistema → Seguridad y privacidad → Micrófono

**Enlaces útiles:**
- Chrome: [chrome://settings/content/microphone](chrome://settings/content/microphone)
- Edge: [edge://settings/content/microphone](edge://settings/content/microphone)

---

### "Micrófono no detectado"

**Síntoma:** Error que indica que no se encontró ningún micrófono.

**Causa:** No hay micrófono conectado o el sistema no lo reconoce.

**Solución:**
1. Verificar que el micrófono esté conectado físicamente
2. Probar el micrófono en otra aplicación (Zoom, Discord)
3. En Windows: Configuración → Sistema → Sonido → Entrada → Probar micrófono
4. En macOS: Preferencias del Sistema → Sonido → Entrada
5. Reiniciar el navegador
6. Reiniciar el sistema (si el problema persiste)

---

### "No te escuché" / "No se detectó audio"

**Síntoma:** El sistema captura el audio pero no reconoce ninguna palabra.

**Causa:** Nivel de audio muy bajo, ruido de fondo, o micrófono defectuoso.

**Solución:**
- **Hablar más fuerte** y más cerca del micrófono
- **Reducir ruido de fondo** (cerrar ventanas, apagar ventiladores)
- **Verificar nivel de volumen** del micrófono:
  - Windows: Configuración → Sonido → Entrada → Propiedades del dispositivo
  - macOS: Preferencias → Sonido → Entrada → Volumen de entrada
- **Probar en una habitación silenciosa**
- **Cambiar de micrófono** si es posible

---

## 🚫 Problemas de Acceso y Límites

### "Límite diario alcanzado"

**Síntoma:** Mensaje indicando que se agotaron los comandos de voz del día.

**Causa:** Ya se usaron los 10 comandos de voz permitidos.

**Solución:**
- **Esperar hasta mañana:** El límite resetea a las 00:00 (medianoche)
- **Usar formulario manual:** Registrar transacciones desde el formulario tradicional
- **Ver contador:** El modal muestra cuántos comandos quedan disponibles

**Por qué existe este límite:**
- Controlar costos de API de Gemini
- Prevenir abuso del sistema
- Incentivar uso estratégico del asistente de voz

---

### "Sesión expirada"

**Síntoma:** Error al intentar usar el asistente después de estar inactivo.

**Causa:** El token de Firebase expiró (después de ~1 hora de inactividad).

**Solución:**
- **Recargar la página** (F5)
- **Cerrar y volver a abrir** el modal de voz
- Si persiste: **Cerrar sesión y volver a iniciar sesión**

---

## 🌐 Problemas de Navegador

### "Navegador no compatible"

**Síntoma:** Mensaje indicando que el navegador no soporta comandos de voz.

**Causa:** El navegador no implementa Web Speech API.

**Navegadores soportados:**
- ✅ **Chrome** (recomendado)
- ✅ **Edge**
- ✅ **Safari**
- ❌ **Firefox** (no soporta Web Speech API)
- ❌ **Opera** (soporte limitado)

**Solución:**
- Cambiar a Chrome, Edge o Safari
- Actualizar el navegador a la última versión

---

### "Error de conexión" / "Failed to fetch"

**Síntoma:** Error de red al intentar conectar.

**Causa:** Problemas de internet o API de backend caída.

**Solución:**
1. **Verificar conexión a internet**
2. **Recargar la página** (F5)
3. **Intentar nuevamente** en 1-2 minutos
4. Si persiste: **Contactar soporte** (puede ser problema del servidor)

---

## 🔧 Problemas de Funcionalidad

### El asistente no entiende mi comando

**Síntoma:** El asistente escucha pero no ejecuta la acción correcta.

**Causa:** Comando ambiguo o no estructurado correctamente.

**Solución:**
- **Hablar claro y pausado**
- **Usar comandos estructurados:**
  - ✅ "Registra un café de 5 mil pesos"
  - ❌ "Café"
- **Especificar monto claramente:**
  - ✅ "5 mil", "cinco mil", "5000"
  - ❌ "cinco", "algunos pesos"
- **Esperar confirmación** antes de cerrar el modal

**Comandos recomendados:**
```bash
# ✅ Claros y completos
"Registra un gasto de 5000 en café"
"Registra 15 mil pesos en almuerzo"

# ❌ Ambiguos
"Café"
"Gasto"
```

---

### Modal no se abre

**Síntoma:** Click en botón de voz no hace nada.

**Causa:** Error de JavaScript o estado corrupto.

**Solución:**
1. **Abrir consola del navegador** (F12)
2. **Buscar errores en rojo**
3. **Recargar la página** (Ctrl+Shift+R para hard reload)
4. **Limpiar caché:**
   - Chrome: Ctrl+Shift+Delete → Borrar caché
5. Si persiste: **Reportar bug** con captura de consola

---

### Respuesta muy lenta (> 5 segundos)

**Síntoma:** El asistente tarda mucho en responder.

**Causa:** Conexión lenta, API sobrecargada, o comandos complejos.

**Solución:**
- **Verificar velocidad de internet** (necesario > 2 Mbps)
- **Simplificar el comando** (evitar comandos muy largos)
- **Intentar en horario de menor uso** (temprano en la mañana)
- **Cerrar otras pestañas** que consuman ancho de banda

---

## 📊 Debugging Avanzado

### Ver métricas de performance

Si eres desarrollador, puedes ver métricas en la consola del navegador:

```javascript
// En la consola del navegador (F12):
voiceMetrics.getMetrics()           // Todas las métricas
voiceMetrics.getSummary()           // Resumen agregado
voiceMetrics.getAverageByName('connection_duration_ms')  // Promedio de conexión
```

### Activar logs detallados

```javascript
// En localStorage:
localStorage.setItem('voice_debug', 'true')

// Recargar página y ver logs en consola
// Para desactivar:
localStorage.removeItem('voice_debug')
```

### Ver estado del state machine

```javascript
// Estado actual del sistema:
voiceStateMachine.getState()

// Historial de transiciones (si está habilitado):
voiceStateMachine.getHistory()
```

---

## 🆘 Cuando Nada Funciona

Si has probado todo y aún tienes problemas:

1. **Reporta el bug:**
   - Email: soporte@asurity.com
   - Incluye:
     - Navegador y versión
     - Sistema operativo
     - Captura de pantalla
     - Errores en consola (F12)

2. **Usa el formulario manual:**
   - Siempre puedes registrar transacciones manualmente
   - El formulario tiene todas las funcionalidades del asistente

3. **Espera la próxima versión:**
   - Estamos mejorando constantemente
   - Muchos bugs se resuelven en updates automáticos

---

## 📚 Recursos Adicionales

- [Arquitectura del sistema](./ARCHITECTURE.md)
- [Guía de usuario](./USER_GUIDE.md)
- [Guía de desarrollo](./DEVELOPER_GUIDE.md)
- [Web Speech API Docs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

---

**Última actualización:** Abril 2026  
**Si encuentras un problema no listado aquí, por favor repórtalo.**
