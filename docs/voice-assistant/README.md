# Asistente de Voz

Sistema de comandos de voz para registro rápido de transacciones financieras usando Gemini 2.5 Flash-Lite.

## 🎯 Quick Start

1. Click en el botón de micrófono 🎤 en la navegación
2. Mantén presionado el botón PTT y habla: "Registra un café de 5 mil pesos"
3. Suelta el botón
4. ✅ Listo! Transacción registrada

## 📚 Documentación

- [**Arquitectura**](./ARCHITECTURE.md) - Cómo funciona internamente (capas, componentes, state machine)
- [**Guía de Usuario**](./USER_GUIDE.md) - Comandos disponibles y mejores prácticas
- [**Guía de Desarrollo**](./DEVELOPER_GUIDE.md) - Cómo extender y mantener el sistema
- [**Troubleshooting**](./TROUBLESHOOTING.md) - Problemas comunes y soluciones

## 🚀 Tecnologías

- **STT:** Web Speech API (gratis, nativo del navegador)
- **AI Model:** Gemini 2.5 Flash-Lite (gratis, multimodal)
- **TTS:** Web Speech API (gratis, nativo del navegador)
- **Backend:** Firebase Functions (serverless)
- **Architecture:** Clean Architecture + State Machine

## 📊 Límites Actuales

- **10 comandos de voz por día** (resetea a las 00:00)
- **15 segundos máximo** por comando
- **Navegadores soportados:** Chrome, Edge, Safari (no Firefox)

## 🎤 Comandos Básicos

```bash
# Registrar gastos
"Registra un café de 5 lucas"
"Registra 3 mil pesos en Uber"
"Anota un gasto de 15000 en almuerzo"

# Registrar ingresos
"Registra un ingreso de 500 mil pesos en sueldo"

# Consultas
"Cuánto tengo en Banco Estado"
"Dame el resumen del dashboard"
```

## ⚡ Performance

- **Tiempo de conexión:** < 1s
- **Tiempo de respuesta:** < 2s
- **Tokens por comando:** ~600 (optimizado con pre-loading)
- **Tasa de éxito:** > 95%

## 🔧 Configuración Técnica

Ver [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) para:
- Setup local
- Variables de entorno
- Extensión de tools
- Testing

## 🐛 Problemas Comunes

Si encuentras problemas, consulta [TROUBLESHOOTING.md](./TROUBLESHOOTING.md):
- Micrófono bloqueado
- No se detecta audio
- Límite diario alcanzado
- Navegador no compatible

## 📈 Roadmap

- [ ] Soporte para edición de transacciones
- [ ] Comandos de navegación avanzados
- [ ] Integración con transferencias
- [ ] Multi-idioma (EN, PT)
- [ ] Modo conversacional extendido

## 🤝 Contribuir

Este es un sistema interno, pero puedes:
1. Reportar bugs vía Issues
2. Sugerir mejoras
3. Extender tools nuevos
4. Mejorar documentación

## 📄 Licencia

Uso interno - Asurity Finance Control App

---

**Última actualización:** Abril 2026  
**Versión:** 2.0 (Post-refactor arquitectónico)
