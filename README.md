# 💰 Control Financiero - Asurity

Sistema integral de control financiero para gestión de negocios y finanzas personales.

## 🎯 Características Principales

- ✅ **Multi-propósito**: Gestión financiera para varios negocios + finanzas personales simultáneamente
- 💳 **Control de Tarjetas de Crédito**: Gestión completa con límites, fechas de corte, intereses y cuotas
- 📊 **Dashboard Inteligente**: KPIs en tiempo real y visualizaciones interactivas
- 🔔 **Sistema de Alertas**: Notificaciones proactivas para presupuestos, pagos y gastos inusuales
- 📈 **Presupuestos**: Control detallado por categorías con alertas automáticas
- 🎯 **Metas de Ahorro**: Seguimiento de objetivos financieros con contribuciones
- 🔄 **Transacciones Recurrentes**: Automatización de gastos e ingresos periódicos
- 📑 **Reportes Avanzados**: Exportación a Excel y PDF con formato profesional

## 🏗️ Arquitectura

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

- [Arquitectura](./docs/arquitectura.md)
- [Funcionalidades](./docs/funcionalidades.md)
- [Guía de Agent Skills](./docs/guia-agent-skills.md)
- [Ejemplos de Código](./docs/ejemplos-codigo.md)
- [TODO Bases](../TODO_BASES.md)
- [TODO Features](../TODO_FEATURES.md)

## 🔐 Seguridad

- Firestore Security Rules implementadas
- Autenticación mediante Firebase Auth
- Validación de datos en cliente y servidor
- Variables de entorno para credenciales
- Sanitización de inputs

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

### Bases Completadas (95%)

- ✅ Proyecto Next.js configurado
- ✅ Firebase/Firestore integrado
- ✅ Sistema de diseño (Shadcn/ui)
- ✅ Autenticación funcional
- ✅ 9 servicios especializados
- ✅ 9 React Query hooks
- ✅ Utilidades (formato, validación)
- ✅ Constantes centralizadas

### En Desarrollo

- 🔄 Migración a Clean Architecture
- 🔄 Dashboard principal
- 🔄 Módulo de transacciones

Ver [TODO_FEATURES.md](../TODO_FEATURES.md) para el plan detallado.

## 📝 Licencia

Propiedad de Asurity - Todos los derechos reservados

## 📧 Contacto

- **Email**: info@asurity.cl
- **Website**: [www.asurity.cl](https://www.asurity.cl)

---

**Desarrollado con ❤️ por Asurity**

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
