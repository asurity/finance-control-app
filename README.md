# 💰 Control Financiero - Asurity

Sistema integral de control financiero para gestión de negocios y finanzas personales.

**Versión**: 1.0.0

## 🎯 Características Principales

- ✅ **Multi-organización**: Gestión financiera para varios negocios + finanzas personales simultáneamente
- 🎤 **Asistente de Voz con IA**: Registro de transacciones por comandos de voz usando Gemini 2.5 Flash-Lite + Web Speech API (STT/TTS gratis)
- 💳 **Control de Tarjetas de Crédito**: Gestión completa con límites, fechas de corte, intereses y cuotas
- 📊 **Dashboard Inteligente**: KPIs en tiempo real, gráficos de evolución de saldo, gastos por categoría, proyección financiera y resumen de deudas
- 🔔 **Sistema de Alertas**: Notificaciones proactivas para presupuestos, pagos y gastos inusuales
- 📈 **Presupuestos por Período**: Control detallado por categorías con asignación porcentual y alertas automáticas
- 🎯 **Metas de Ahorro**: Seguimiento de objetivos financieros con contribuciones y progreso visual
- 🔄 **Transacciones Recurrentes**: Automatización de gastos e ingresos periódicos con procesamiento automático
- 📑 **Reportes Avanzados**: Comparativa entre períodos, exportación a Excel y PDF con formato profesional
- 🧠 **Sugerencia Inteligente de Categorías**: Machine learning local basado en historial de transacciones
- 🗂️ **Sub-categorías**: Jerarquía padre/hijo con vista tree en presupuestos
- 🚀 **Onboarding Guiado**: Wizard de configuración inicial para nuevos usuarios

## � Asistente de Voz con IA

El sistema incluye un **asistente de voz conversacional** para registro rápido de transacciones por comandos de voz.

### Arquitectura del Voice Agent

```
┌──────────────────┐
│ Browser          │
│                  │
│ ┌──────────────┐ │  texto transcrito    ┌───────────────┐
│ │Web Speech API│─┼─────────────────────►│ Next.js API   │
│ │ (STT gratis) │ │  POST /api/voice/    │ /api/voice/   │
│ └──────────────┘ │  gemini              │ gemini        │
│                  │                      │               │
│ ┌──────────────┐ │  ◄── JSON response   │  ┌─────────┐  │
│ │speechSynthesis│◄┼──────────────────────┼──│ Gemini  │  │
│ │ (TTS gratis) │ │  {functionCall|text} │  │2.5 Flash│  │
│ └──────────────┘ │                      │  │  Lite   │  │
│                  │                      │  └─────────┘  │
│ ┌──────────────┐ │                      └───────────────┘
│ │Tool Execution│ │  (local, function calling)
│ │ Registry     │ │
│ └──────────────┘ │
└──────────────────┘
```

### Características del Voice Agent

- **STT (Speech-to-Text)**: Web Speech API nativa del navegador - **GRATIS**
- **TTS (Text-to-Speech)**: speechSynthesis nativa - **GRATIS**
- **IA**: Gemini 2.5 Flash-Lite con function calling - **$0.00 - $1.50/mes** (tier gratuito)
- **Multi-turno**: Conversaciones contextuales (IA pregunta si falta información)
- **Push-to-Talk**: Control manual de grabación (15s máximo)
- **Validación inteligente**: Antes de ejecutar, IA valida que tenga toda la información necesaria
- **Ahorro vs OpenAI**: **97-100%** de reducción de costos ($50-100/mes → $0-1.50/mes)

### Comandos de Ejemplo

```
🎤 "Gasté 15 mil en almuerzo en mi visa"
   → Registra gasto de $15.000 en categoría Alimentación, cuenta Visa
   → Respuesta: "Registrado" ✓

🎤 "Ingreso de 500 mil por nómina en cuenta corriente"
   → Registra ingreso de $500.000
   → Respuesta: "Listo" ✓

🎤 "Gasté 10 mil" (info incompleta)
   → IA pregunta: "¿En qué cuenta?"
   🎤 "Visa"
   → Ejecuta transacción completa
```

### Requisitos del Voice Agent

- **Navegador**: Chrome o Edge (Web Speech API requerida)
- **Micrófono**: Funcional con permisos habilitados
- **API Key**: `GEMINI_API_KEY` configurada en `.env.local` (obtener en https://aistudio.google.com/apikey)

### Documentación Voice Agent

- [Plan de Migración a Gemini](./PLAN_MIGRACION_GEMINI.md)
- [Checklist de Integración](./GEMINI_INTEGRATION_CHECKLIST.md)
- [Instrucciones de Variables de Entorno](./INSTRUCCIONES_ENV.md)
- [Arquitectura de Voz (Fase 7)](./FASE_7_VOICE_PERSISTENCE.md)

## �🏗️ Arquitectura

Este proyecto sigue los principios de **Clean Architecture** con las siguientes capas:

```
📁 Estructura de Capas
├── Presentation Layer (UI Components, Pages)
├── Application Layer (Use Cases, Hooks, DTOs)
├── Domain Layer (Entities, Business Logic, Interfaces)
└── Infrastructure Layer (Repositories, Mappers, Firebase)
```

### Principios de Diseño

- **Desacoplamiento**: Interfaces y abstracciones para toda comunicación entre capas
- **DRY**: Componentes reutilizables y utilidades centralizadas
- **Escalabilidad**: Feature folders y código modular
- **Repository Pattern**: Abstracción de acceso a datos
- **Dependency Injection**: Inyección de dependencias para testing y flexibilidad

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 14 (App Router)
- **Lenguaje**: TypeScript 5
- **Base de Datos**: Firebase Firestore
- **Autenticación**: Firebase Auth
- **IA/Voice Agent**: Gemini 2.5 Flash-Lite + Web Speech API
- **UI**: Shadcn/ui + TailwindCSS
- **Estado**: React Query (TanStack Query)
- **Formularios**: React Hook Form + Zod
- **Gráficos**: Recharts
- **Testing**: Jest + React Testing Library + Playwright

## 📋 Requisitos Previos

- Node.js 20+ y npm 10+
- Python 3.9+ (para Agent Skills)
- Cuenta de Firebase
- Git

## 🚀 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/asurity/finance-control-app.git
   cd finance-control-app
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.example .env.local
   ```
   Editar `.env.local` con tus credenciales de Firebase

4. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```

5. **Abrir en navegador**
   ```
   http://localhost:3000
   ```

## 📁 Estructura del Proyecto

```
finance-control-app/
├── src/
│   ├── app/                      # Next.js App Router (páginas)
│   ├── domain/                   # Capa de dominio (Clean Architecture)
│   │   ├── entities/            # Entidades del negocio
│   │   ├── repositories/        # Interfaces de repositorios
│   │   └── use-cases/           # Casos de uso (lógica de negocio)
│   ├── infrastructure/           # Capa de infraestructura
│   │   ├── repositories/        # Implementaciones Firestore
│   │   └── mappers/             # Transformadores de datos
│   ├── application/              # Capa de aplicación
│   │   ├── hooks/               # Custom React hooks
│   │   ├── dto/                 # Data Transfer Objects
│   │   └── validators/          # Validadores
│   ├── presentation/             # Capa de presentación
│   │   └── components/          # Componentes React
│   │       ├── shared/          # Componentes reutilizables
│   │       ├── features/        # Componentes por feature
│   │       └── layout/          # Layout components
│   ├── lib/                      # Utilidades y configuración
│   │   ├── constants/           # Constantes de la app
│   │   ├── utils/               # Funciones helper
│   │   └── firebase/            # Configuración Firebase
│   └── types/                    # Tipos TypeScript globales
├── docs/                         # Documentación
├── public/                       # Archivos estáticos
└── tests/                        # Tests E2E
```

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Iniciar servidor de desarrollo
npm run build            # Compilar para producción
npm run start            # Iniciar servidor de producción
npm run lint             # Ejecutar ESLint
npm run lint:fix         # Corregir errores de ESLint
npm run format           # Formatear código con Prettier

# Testing
npm run test             # Ejecutar tests unitarios
npm run test:watch       # Tests en modo watch
npm run test:e2e         # Ejecutar tests E2E con Playwright
npm run test:coverage    # Generar reporte de cobertura
```

## 📖 Documentación

### Arquitectura y Diseño
- [Clean Architecture](./docs/clean-architecture.md)
- [Mejoras de Autenticación](./docs/mejoras-autenticacion.md)
- [Permisos y Roles](./docs/permisos-roles.md)

### Voice Agent (Asistente de Voz)
- [Plan de Migración a Gemini](./PLAN_MIGRACION_GEMINI.md)
- [Checklist de Integración Gemini](./GEMINI_INTEGRATION_CHECKLIST.md)
- [Instrucciones de Variables de Entorno](./INSTRUCCIONES_ENV.md)
- [Fase 7: Voice Persistence](./FASE_7_VOICE_PERSISTENCE.md)

### Despliegue y Configuración
- [Guía de Despliegue](./DEPLOYMENT.md)
- [Plan de Upgrade](./TODO_UPGRADE.md)

## 🔐 Seguridad

- Firestore Security Rules reforzadas con verificación de membresía organizacional (`isMemberOfOrg`)
- Reglas granulares por operación (read/create/update/delete) en todas las colecciones
- Autenticación mediante Firebase Auth
- Validación de datos con Zod en cliente
- Variables de entorno para credenciales
- Multi-tenant con aislamiento por `orgId`

## 🌍 Localización

- **Moneda**: Pesos Chilenos (CLP) únicamente
- **Idioma**: Español (es-CL)
- **Zona horaria**: America/Santiago
- **Formatos**: Fechas y números según estándar chileno
- **Validación RUT**: Algoritmo Módulo 11 implementado

## 🤝 Contribución

Este proyecto sigue principios estrictos de calidad de código:

1. Seguir Clean Architecture
2. Escribir tests para nuevo código
3. Documentar funciones con JSDoc
4. Usar TypeScript estricto
5. Consultar Agent Skills para features complejas

### Flujo de Trabajo Git

```bash
# Crear branch desde develop
git checkout develop
git checkout -b feature/nombre-feature

# Hacer commits descriptivos
git commit -m "feat(modulo): descripción corta"

# Push y crear Pull Request
git push origin feature/nombre-feature
```

### Formato de Commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(módulo):` Nueva funcionalidad
- `fix(módulo):` Corrección de bug
- `docs:` Cambios en documentación
- `style:` Formato, punto y coma, etc.
- `refactor:` Refactorización de código
- `test:` Agregar tests
- `chore:` Tareas de mantenimiento

## 📊 Estado del Proyecto

### v1.0.0 — Release Completo

- ✅ Proyecto Next.js 14 con App Router
- ✅ Firebase/Firestore integrado con reglas de seguridad reforzadas
- ✅ Clean Architecture completa (Domain, Application, Infrastructure, Presentation)
- ✅ Sistema de diseño (Shadcn/ui + TailwindCSS)
- ✅ Autenticación funcional con Firebase Auth
- ✅ Dashboard con KPIs, gráficos y proyección financiera
- ✅ Módulo de transacciones con gasto rápido
- ✅ Módulo de cuentas con resumen de patrimonio y deudas
- ✅ Presupuestos por período con asignación porcentual por categoría
- ✅ Sub-categorías con vista tree en presupuestos
- ✅ Sugerencia inteligente de categoría por historial
- ✅ Tarjetas de crédito con seguimiento de cuotas
- ✅ Metas de ahorro con contribuciones y progreso visual
- ✅ Transacciones recurrentes con procesamiento automático
- ✅ Sistema de alertas y notificaciones proactivas
- ✅ Reportes comparativos entre períodos con exportación Excel/PDF
- ✅ Onboarding guiado para nuevos usuarios
- ✅ Inyección de dependencias con DIContainer
- ✅ React Query con staleTime optimizado por tipo de dato

### Próximamente (v2.0)

- 🔜 Cuentas por cobrar
- 🔜 Cuentas por pagar

## 📝 Licencia

Propiedad de Asurity - Todos los derechos reservados

## 📧 Contacto

- **Email**: info@asurity.cl
- **Website**: [www.asurity.cl](https://www.asurity.cl)

---

**Desarrollado con ❤️ por Asurity**
