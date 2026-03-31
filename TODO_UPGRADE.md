# TODO_UPGRADE.md — Plan Maestro de Mejora v1.0

> **Fecha**: 31 de marzo de 2026  
> **Origen**: Diagnóstico completo de la aplicación (gastos diarios/semanales, deudas, UX de carga, períodos, gráficos, features faltantes)  
> **Restricción principal**: NO alterar el flujo existente. Mejorar lo que hay y agregar lo que falta.  
> **Versión actual**: `v0.6.0-period-reports` (tag más reciente en `develop`)  
> **Branch base**: `develop`  
> **Versión objetivo**: `v1.0.0`

---

## Flujo Existente (INTOCABLE)

Este flujo ya funciona y NO se modifica su estructura. Solo se mejora internamente.

```
1. Login → Sistema reconoce organizaciones del usuario
2. Selector de organización → Crear nuevas organizaciones
3. Datos almacenados en collections de Firestore por organización
4. Establecer presupuesto por período (fecha inicio → fecha fin)
5. Asignar categorías con porcentajes al presupuesto
6. Crear cuentas (débito, crédito, líneas de crédito) con límites y disponibles
7. Cargar gastos/ingresos → montos SIEMPRE positivos al usuario, el sistema opera con type INCOME/EXPENSE
8. Dashboard muestra valores absolutos + línea de balance real
9. Al finalizar período → reporte de cierre
```

---

## Principios Rectores

| Principio | Aplicación |
|---|---|
| **Clean Architecture** | Domain → Application → Infrastructure → Presentation. Sin excepciones. |
| **DRY** | Cero duplicación. `MoneyDisplay`, `format.ts`, constantes centralizadas. Antes de crear algo, verificar que no existe. |
| **Desacoplamiento** | Use Cases independientes de UI. Repositorios independientes de Use Cases. Hooks como puente único. |
| **Escalabilidad** | Nuevas features como módulos aislados. Nuevos gráficos como componentes independientes. |
| **Mantenibilidad** | Cada fase es un commit atómico con tag. Se puede revertir cualquier fase sin romper las demás. |
| **Pipeline** | `User Action → Component → Hook → Use Case → Repository → Firestore` siempre. |

---

## Recomendación: Flujo Continuo vs Cortes Mensuales

**Recomendación: Flujo continuo con ventanas de período.**

Razones:
- Los cortes mensuales fuerzan al usuario a "cerrar" un período antes de abrir otro. Si olvida hacerlo, queda en un limbo sin presupuesto.
- El flujo continuo permite que las transacciones siempre se registren, independientemente de si hay un período activo o no.
- Los períodos de presupuesto funcionan como **ventanas de observación**, no como puertas. Si hay período activo, las transacciones se vinculan a él y actualizan los gastos por categoría. Si no hay período, las transacciones se registran igual pero sin tracking de presupuesto.
- Al finalizar un período, se genera un snapshot/reporte automático. No se "cierra" nada — simplemente expira y el usuario crea el siguiente (o el sistema le avisa que debe hacerlo).
- El historial siempre es consultable por rango de fechas, independiente de períodos.

**Impacto en la implementación:**
- `CreateTransactionUseCase` ya vincula transacciones al período activo si existe. No cambia.
- Se agrega un sistema de notificaciones para avisar cuando no hay período activo.
- Se agrega auto-sugerencia de crear período basado en el anterior.
- Los reportes pueden consultarse por período O por rango de fechas (ya parcialmente implementado).

---

## Estrategia de Versionado y Branches

### Estado Actual
```
Tags existentes:   v0.0.0-baseline → v0.6.0-period-reports
Branch de trabajo: develop
Branch estable:    main
Branch backup:     backup/develop-before-v1
```

### Estrategia
```
1. Commit inicial de snapshot en develop
2. Cada FASE = 1 feature branch desde develop
3. Al completar la fase → merge a develop + tag
4. Al completar TODAS las fases → merge develop → main + tag v1.0.0
```

### Convención de Branches
```
feature/upgrade-phase-XX-nombre-corto
```

### Convención de Tags
```
v0.7.0-fase-descripcion
v0.8.0-fase-descripcion
...
v1.0.0  (release final)
```

### Convención de Commits
```
tipo(alcance): descripción

Tipos: feat, fix, refactor, chore, docs, test, perf
Alcance: domain, application, infrastructure, presentation, config
```

---

## COMMIT INICIAL — Punto de Partida

- [ ] Verificar que no hay cambios sin commitear en `develop`:
  ```bash
  git status
  ```
- [ ] Si hay cambios pendientes, commitear:
  ```bash
  git add -A
  git commit -m "chore: snapshot pre-upgrade v1.0"
  ```
- [ ] Crear tag de punto de partida:
  ```bash
  git tag v0.6.1-pre-upgrade
  ```
- [ ] Crear branch de backup por seguridad:
  ```bash
  git branch backup/develop-pre-upgrade-v1
  ```

---

## ÍNDICE DE FASES

| Fase | Nombre | Prioridad | Tag |
|------|--------|-----------|-----|
| 01 | Limpieza y Sanitización | BLOQUEANTE | `v0.7.0-cleanup` |
| 02 | Gastos Diarios y Semanales | BLOQUEANTE | `v0.7.1-daily-weekly` |
| 03 | Filtros Funcionales en Transacciones | BLOQUEANTE | `v0.7.2-transaction-filters` |
| 04 | Resumen Consolidado de Deudas | BLOQUEANTE | `v0.7.3-debt-summary` |
| 05 | Proyección Financiera | BLOQUEANTE | `v0.7.4-financial-projection` |
| 06 | Simplificar Carga de Transacciones | URGENTE | `v0.8.0-quick-entry` |
| 07 | Gráficos: Presupuesto vs Real + Nuevos | URGENTE | `v0.8.1-charts-upgrade` |
| 08 | Períodos: Plantillas y Auto-renovación | URGENTE | `v0.8.2-period-automation` |
| 09 | Transacciones Recurrentes UI | URGENTE | `v0.8.3-recurring-ui` |
| 10 | Metas de Ahorro UI | IMPORTANTE | `v0.9.0-savings-goals` |
| 11 | Sistema de Notificaciones y Alertas | IMPORTANTE | `v0.9.1-notifications` |
| 12 | Onboarding y UX General | IMPORTANTE | `v0.9.2-onboarding` |
| 13 | Mejoras en Reportes y Exportación | IMPORTANTE | `v0.9.3-reports-upgrade` |
| 14 | Categorías Inteligentes y Sub-categorías | IMPORTANTE | `v0.9.4-smart-categories` |
| 15 | Pulido Final y Release v1.0 | RELEASE | `v1.0.0` |

---

## FASE 01 — Limpieza y Sanitización

> **Branch**: `feature/upgrade-phase-01-cleanup`  
> **Tag**: `v0.7.0-cleanup`  
> **Objetivo**: Limpiar la app de herramientas de debug expuestas, preparar la base para las mejoras.  
> **Capas afectadas**: Presentation, Config

### 01.1 — Ocultar herramientas de debug del sidebar

- [ ] **Editar** `src/components/layout/Sidebar.tsx`
  - Envolver los links de debug (`debug-transactions`, `analyze-alondrita`, `fix-budget-spent`) en una condición de entorno:
    ```typescript
    const showDebugTools = process.env.NODE_ENV === 'development';
    ```
  - Solo renderizar los items con `icon: Bug` cuando `showDebugTools === true`
  - **NO eliminar las páginas** — solo ocultarlas de la navegación en producción

### 01.2 — Agregar Dark Mode toggle

- [ ] **Crear** `src/presentation/components/shared/ThemeToggle.tsx`
  - Usar `next-themes` (ya está en `package.json` como dependencia)
  - Botón simple con iconos Sun/Moon de Lucide
  - Cicla entre `light` → `dark` → `system`

- [ ] **Editar** `src/components/layout/Header.tsx`
  - Agregar `ThemeToggle` junto al avatar/menú de usuario
  - Ubicarlo antes del dropdown de organizaciones para no interferir con el flujo

- [ ] **Editar** `src/app/layout.tsx`
  - Envolver con `<ThemeProvider attribute="class" defaultTheme="system">` de `next-themes`
  - Verificar que ya no esté envuelto (revisar `providers.tsx` también)

### 01.3 — Actualizar versión en Sidebar

- [ ] **Editar** `src/components/layout/Sidebar.tsx`
  - Cambiar `v0.6.0` hardcodeado a leer de una constante:
    ```typescript
    // En src/lib/constants/config.ts
    export const APP_VERSION = '0.7.0';
    ```
  - Usar `APP_VERSION` en el sidebar footer

### 01.4 — Limpiar botones no funcionales

- [ ] **Editar** `src/app/(dashboard)/transactions/page.tsx`
  - El botón "Filtrar" actualmente no hace nada. Dos opciones:
    - **Opción A** (recomendada): Eliminarlo temporalmente y re-agregarlo en Fase 03 cuando los filtros estén implementados
    - **Opción B**: Dejarlo deshabilitado con tooltip "Próximamente"
  - El botón "Exportar" igual — eliminarlo o deshabilitarlo hasta Fase 13

### 01.5 — Commit de Fase 01

```bash
git checkout -b feature/upgrade-phase-01-cleanup develop
# ... hacer cambios ...
git add -A
git commit -m "chore(presentation): sanitizar UI, ocultar debug tools, agregar dark mode toggle

- Ocultar links de debug del sidebar en producción
- Agregar ThemeToggle con next-themes
- Centralizar APP_VERSION en constantes
- Limpiar botones no funcionales en transacciones"

git checkout develop
git merge --no-ff feature/upgrade-phase-01-cleanup -m "Merge fase 01: limpieza y sanitización"
git tag v0.7.0-cleanup
```

---

## FASE 02 — Gastos Diarios y Semanales

> **Branch**: `feature/upgrade-phase-02-daily-weekly`  
> **Tag**: `v0.7.1-daily-weekly`  
> **Objetivo**: Dar al usuario visibilidad inmediata de cuánto lleva gastado hoy y esta semana.  
> **Capas afectadas**: Domain (use case nuevo), Application (hook nuevo), Presentation (widgets nuevos)

### 02.1 — Nuevo Use Case: GetDailyWeeklyStats

- [ ] **Crear** `src/domain/use-cases/dashboard/GetDailyWeeklyStatsUseCase.ts`
  - Input: `{ userId: string; date: Date }`
  - Output:
    ```typescript
    interface DailyWeeklyStats {
      today: {
        totalExpenses: number;
        totalIncome: number;
        transactionCount: number;
      };
      thisWeek: {
        totalExpenses: number;
        totalIncome: number;
        transactionCount: number;
        dailyAverage: number;         // promedio diario de gasto esta semana
        daysElapsed: number;          // días transcurridos de la semana
      };
      lastWeek: {
        totalExpenses: number;
        totalIncome: number;
      };
      dailyBudget: number | null;     // presupuesto mensual / días del mes (si hay período activo)
      todayVsBudget: 'under' | 'over' | 'no-budget';
    }
    ```
  - Lógica:
    - Obtener fecha inicio/fin de hoy (00:00 → 23:59)
    - Obtener fecha inicio/fin de esta semana (lunes → domingo, usar `startOfWeek` de date-fns con `{ weekStartsOn: 1 }`)
    - Obtener fecha inicio/fin de semana pasada
    - Consultar transacciones por cada rango
    - Si hay `BudgetPeriod` activo, calcular `dailyBudget = totalAmount / durationInDays`
    - Comparar gasto de hoy vs `dailyBudget`

- [ ] **Registrar** en `src/infrastructure/di/DIContainer.ts`
  - Agregar getter: `getGetDailyWeeklyStatsUseCase()`
  - Inyectar: `transactionRepo`, `budgetPeriodRepo`

### 02.2 — Nuevo Hook: useDailyWeeklyStats

- [ ] **Crear** `src/presentation/components/features/dashboard/hooks/useDailyWeeklyStats.ts`
  - Usar React Query con key `['daily-weekly-stats', orgId, userId, todayStr]`
  - `todayStr` es `format(new Date(), 'yyyy-MM-dd')` para que invalide diariamente
  - `staleTime: 2 * 60 * 1000` (2 minutos — los gastos diarios cambian más seguido)
  - `refetchOnWindowFocus: true`

### 02.3 — Nuevo Widget: DailyExpenseWidget

- [ ] **Crear** `src/presentation/components/features/dashboard/widgets/DailyExpenseWidget.tsx`
  - Card compacta que muestra:
    - **Título**: "Hoy" con la fecha formateada
    - **Monto principal**: Gasto total de hoy con `<MoneyDisplay type="expense">`
    - **Indicador vs presupuesto diario**: Si hay presupuesto, mostrar barra de progreso (gasto hoy / presupuesto diario * 100)
      - Verde si < 80%
      - Amarillo si 80-100%
      - Rojo si > 100%
    - **Texto**: "Presupuesto diario: $X" o "Sin presupuesto activo"
    - **Transacciones**: "X transacciones hoy"
  - Skeleton variant para loading

### 02.4 — Nuevo Widget: WeeklyExpenseWidget

- [ ] **Crear** `src/presentation/components/features/dashboard/widgets/WeeklyExpenseWidget.tsx`
  - Card que muestra:
    - **Título**: "Esta semana" con rango de fechas
    - **Monto principal**: Gasto total de la semana con `<MoneyDisplay type="expense">`
    - **Comparación**: "Semana pasada: $X" con flecha arriba/abajo y porcentaje de cambio
    - **Promedio diario**: "Promedio: $X/día"
    - **Ingresos de la semana** (subtexto): "$X en ingresos"
  - Skeleton variant para loading

### 02.5 — Integrar widgets en Dashboard

- [ ] **Editar** `src/app/(dashboard)/dashboard/page.tsx`
  - Importar `useDailyWeeklyStats`, `DailyExpenseWidget`, `WeeklyExpenseWidget`
  - Agregar los widgets **ENCIMA** del grid de KPIs existente (son la información más inmediata)
  - Layout: grid de 2 columnas en desktop, 1 en móvil
    ```tsx
    {/* Daily & Weekly Widgets - Información inmediata */}
    <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
      <DailyExpenseWidget ... />
      <WeeklyExpenseWidget ... />
    </div>
    ```
  - Los KPIs mensuales existentes permanecen debajo sin modificación

### 02.6 — Agregar opción "week" al selector de período del Dashboard

- [ ] **Editar** `src/app/(dashboard)/dashboard/page.tsx`
  - Agregar `'week'` al tipo `DashboardPeriod` (actualizar también el hook `useDashboardStats` para soportarlo)
  - En el `<Select>` agregar:
    ```tsx
    <SelectItem value="week">Esta semana</SelectItem>
    ```
  - Esto permite que los KPIs y gráficos existentes también muestren datos semanales

- [ ] **Editar** `src/domain/use-cases/dashboard/GetDashboardStatisticsUseCase.ts`
  - En `calculateDateRange`, agregar case para `'week'`:
    - `startDate` = inicio de la semana actual (lunes)
    - `endDate` = fin de la semana actual (domingo)
    - `previousStartDate/previousEndDate` = semana anterior

### 02.7 — Commit de Fase 02

```bash
git checkout -b feature/upgrade-phase-02-daily-weekly develop
# ... hacer cambios ...
git add -A
git commit -m "feat(presentation): widgets de gastos diarios y semanales en dashboard

- Crear GetDailyWeeklyStatsUseCase con cálculo de presupuesto diario
- Crear hook useDailyWeeklyStats con invalidación diaria
- Crear DailyExpenseWidget con indicador vs presupuesto diario
- Crear WeeklyExpenseWidget con comparación semanal
- Agregar opción 'week' al selector de período del dashboard
- Integrar widgets encima de KPIs existentes"

git checkout develop
git merge --no-ff feature/upgrade-phase-02-daily-weekly -m "Merge fase 02: gastos diarios y semanales"
git tag v0.7.1-daily-weekly
```

---

## FASE 03 — Filtros Funcionales en Transacciones

> **Branch**: `feature/upgrade-phase-03-transaction-filters`  
> **Tag**: `v0.7.2-transaction-filters`  
> **Objetivo**: Hacer que la página de transacciones sea realmente útil para consultar historial.  
> **Capas afectadas**: Presentation (principal), Application (modificar queries en hook)

### 03.1 — Crear componente TransactionFilters

- [ ] **Crear** `src/presentation/components/features/transactions/TransactionFilters.tsx`
  - Props:
    ```typescript
    interface TransactionFiltersProps {
      accounts: Account[];
      categories: Category[];
      onFiltersChange: (filters: TransactionFilterState) => void;
      initialFilters: TransactionFilterState;
    }

    interface TransactionFilterState {
      dateRange: { startDate: Date; endDate: Date };
      type: 'ALL' | 'INCOME' | 'EXPENSE';
      categoryId: string | null;
      accountId: string | null;
      searchText: string;
      minAmount: number | null;
      maxAmount: number | null;
    }
    ```
  - UI:
    - **Rango de fechas**: Dos inputs type="date" (inicio/fin) + presets rápidos (Hoy, Esta semana, Este mes, Mes pasado, Últimos 3 meses, Personalizado)
    - **Tipo**: Select con "Todos", "Ingresos", "Gastos"
    - **Categoría**: Select con todas las categorías (filtradas por tipo seleccionado)
    - **Cuenta**: Select con todas las cuentas activas
    - **Búsqueda**: Input de texto para buscar en descripción
    - **Rango de monto**: Dos inputs numéricos (mínimo/máximo) — colapsable, no visible por defecto
    - **Botón "Limpiar filtros"**: Reset a valores por defecto
  - Diseño: Colapsable en móvil (Sheet o Accordion), visible en desktop como barra horizontal con wrap

### 03.2 — Hacer que la página de transacciones use los filtros

- [ ] **Editar** `src/app/(dashboard)/transactions/page.tsx`
  - Reemplazar el `dateRange` estático por un estado controlado:
    ```typescript
    const [filters, setFilters] = useState<TransactionFilterState>({
      dateRange: { startDate: startOfMonth(new Date()), endDate: endOfMonth(new Date()) },
      type: 'ALL',
      categoryId: null,
      accountId: null,
      searchText: '',
      minAmount: null,
      maxAmount: null,
    });
    ```
  - Usar `filters.dateRange` para la query de transacciones
  - Aplicar filtros client-side sobre los resultados:
    ```typescript
    const filteredTransactions = useMemo(() => {
      return transactionsData
        .filter(t => filters.type === 'ALL' || t.type === filters.type)
        .filter(t => !filters.categoryId || t.categoryId === filters.categoryId)
        .filter(t => !filters.accountId || t.accountId === filters.accountId)
        .filter(t => !filters.searchText || t.description.toLowerCase().includes(filters.searchText.toLowerCase()))
        .filter(t => !filters.minAmount || t.amount >= filters.minAmount)
        .filter(t => !filters.maxAmount || t.amount <= filters.maxAmount)
        .sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [transactionsData, filters]);
    ```
  - Reemplazar el botón "Filtrar" decorativo por el componente `TransactionFilters`
  - Mostrar contador de resultados: "X de Y transacciones"

### 03.3 — Agregar totalizadores visibles

- [ ] **Editar** `src/app/(dashboard)/transactions/page.tsx`
  - Debajo de los filtros, agregar barra de totales del conjunto filtrado:
    ```tsx
    <div className="grid grid-cols-3 gap-3">
      <div>Ingresos: <MoneyDisplay amount={totalIncome} type="income" /></div>
      <div>Gastos: <MoneyDisplay amount={totalExpenses} type="expense" /></div>
      <div>Balance: <MoneyDisplay amount={totalIncome - totalExpenses} type="balance" /></div>
    </div>
    ```

### 03.4 — Búsqueda rápida en header de transacciones

- [ ] **Editar** `src/app/(dashboard)/transactions/page.tsx`
  - Agregar un input de búsqueda rápida en el header de la página (al lado del título) que filtre por descripción en tiempo real
  - Debounce de 300ms para no re-filtrar en cada keystroke
  - Usar `useMemo` para el filtrado, no consultas nuevas a Firestore

### 03.5 — Commit de Fase 03

```bash
git checkout -b feature/upgrade-phase-03-transaction-filters develop
# ... hacer cambios ...
git add -A
git commit -m "feat(presentation): filtros funcionales en página de transacciones

- Crear componente TransactionFilters con fecha, tipo, categoría, cuenta, búsqueda, monto
- Reemplazar dateRange estático por estado controlado con filtros
- Agregar barra de totales (ingresos/gastos/balance) del set filtrado
- Agregar búsqueda rápida por descripción con debounce
- Eliminar botones decorativos no funcionales"

git checkout develop
git merge --no-ff feature/upgrade-phase-03-transaction-filters -m "Merge fase 03: filtros de transacciones"
git tag v0.7.2-transaction-filters
```

---

## FASE 04 — Resumen Consolidado de Deudas

> **Branch**: `feature/upgrade-phase-04-debt-summary`  
> **Tag**: `v0.7.3-debt-summary`  
> **Objetivo**: Que el usuario vea de un vistazo cuánto debe en total y por cuenta.  
> **Capas afectadas**: Domain (use case), Presentation (widget + página cuentas)

### 04.1 — Nuevo Use Case: GetDebtSummary

- [ ] **Crear** `src/domain/use-cases/accounts/GetDebtSummaryUseCase.ts`
  - Input: `{ userId: string }`
  - Output:
    ```typescript
    interface DebtSummary {
      totalDebt: number;           // Suma de balances negativos / usados de crédito
      totalAssets: number;         // Suma de balances positivos (checking, savings, cash, investment)
      netWorth: number;            // totalAssets - totalDebt
      creditCards: Array<{
        accountId: string;
        accountName: string;
        balance: number;           // Cuánto se debe (valor absoluto)
        creditLimit: number;
        availableCredit: number;
        utilizationPercent: number;
        cutoffDay: number | null;
        paymentDueDay: number | null;
        daysUntilPayment: number | null;  // Días hasta el próximo pago
      }>;
      linesOfCredit: Array<{
        accountId: string;
        accountName: string;
        balance: number;
        creditLimit: number;
        availableCredit: number;
        utilizationPercent: number;
      }>;
      debitAccounts: Array<{
        accountId: string;
        accountName: string;
        balance: number;
        type: AccountType;
      }>;
    }
    ```
  - Lógica:
    - Obtener todas las cuentas activas
    - Separar por tipo: crédito (CREDIT_CARD, LINE_OF_CREDIT) vs débito (CHECKING, SAVINGS, CASH, INVESTMENT)
    - Para tarjetas de crédito: calcular días hasta próximo pago basado en `paymentDueDay`
    - Calcular utilización de crédito: `(creditLimit - availableCredit) / creditLimit * 100`

- [ ] **Registrar** en `src/infrastructure/di/DIContainer.ts`

### 04.2 — Nuevo Widget: DebtSummaryWidget

- [ ] **Crear** `src/presentation/components/features/dashboard/widgets/DebtSummaryWidget.tsx`
  - Muestra:
    - **Patrimonio neto**: `<MoneyDisplay type="balance">` grande y prominente
    - **Barra visual**: Una barra dividida que muestra proporción activos vs deudas
    - **Total Activos**: en verde
    - **Total Deudas**: en rojo
    - **Lista de tarjetas de crédito** (si hay):
      - Nombre | Deuda | Límite | % utilización | Próximo pago en X días
      - Progress bar de utilización (verde < 30%, amarillo 30-70%, rojo > 70%)
    - **Link**: "Ver todas las cuentas →" apuntando a `/accounts`

### 04.3 — Mejorar página de Cuentas con sección de deudas

- [ ] **Editar** `src/app/(dashboard)/accounts/page.tsx`
  - Agregar sección superior con resumen visual:
    ```
    ┌─────────────────────────────────────────────────┐
    │  RESUMEN FINANCIERO                              │
    │  Activos: $X    |    Deudas: $X    |    Neto: $X│
    │  [============ barra visual ==================]  │
    └─────────────────────────────────────────────────┘
    ```
  - Separar la tabla de cuentas en dos secciones:
    - **Mis Cuentas** (CHECKING, SAVINGS, CASH, INVESTMENT) — con icono de billetera
    - **Mis Deudas** (CREDIT_CARD, LINE_OF_CREDIT) — con icono de tarjeta
  - En la sección de deudas, mostrar por cada tarjeta:
    - Nombre | Banco | Deuda actual | Límite | Crédito disponible | Día de corte | Día de pago
    - Progress bar de utilización de crédito
  - Mantener el formulario de creación de cuentas existente sin cambios

### 04.4 — Integrar DebtSummaryWidget en Dashboard

- [ ] **Editar** `src/app/(dashboard)/dashboard/page.tsx`
  - Reemplazar o complementar el `AccountsSummaryWidget` actual con `DebtSummaryWidget`
  - El widget de cuentas actual se sustituye porque el nuevo lo contiene con más información

### 04.5 — Commit de Fase 04

```bash
git checkout -b feature/upgrade-phase-04-debt-summary develop
# ... hacer cambios ...
git add -A
git commit -m "feat(domain,presentation): resumen consolidado de deudas y patrimonio neto

- Crear GetDebtSummaryUseCase con cálculo de patrimonio, utilización de crédito, días hasta pago
- Crear DebtSummaryWidget para dashboard con barra activos vs deudas
- Mejorar página de cuentas con separación activos/deudas y barras de utilización
- Reemplazar AccountsSummaryWidget con DebtSummaryWidget en dashboard"

git checkout develop
git merge --no-ff feature/upgrade-phase-04-debt-summary -m "Merge fase 04: resumen de deudas"
git tag v0.7.3-debt-summary
```

---

## FASE 05 — Proyección Financiera ("¿Me va a alcanzar?")

> **Branch**: `feature/upgrade-phase-05-financial-projection`  
> **Tag**: `v0.7.4-financial-projection`  
> **Objetivo**: Responder la pregunta más importante: ¿me va a alcanzar la plata hasta fin de mes?  
> **Capas afectadas**: Domain (use case), Presentation (widget)

### 05.1 — Nuevo Use Case: CalculateFinancialProjection

- [ ] **Crear** `src/domain/use-cases/dashboard/CalculateFinancialProjectionUseCase.ts`
  - Input: `{ userId: string }`
  - Output:
    ```typescript
    interface FinancialProjection {
      currentPeriod: {
        name: string;
        startDate: Date;
        endDate: Date;
        totalBudget: number;
        daysTotal: number;
        daysElapsed: number;
        daysRemaining: number;
      } | null;
      spending: {
        totalSpent: number;
        dailyAverageSpent: number;        // totalSpent / daysElapsed
        projectedMonthTotal: number;       // dailyAverageSpent * daysTotal
        budgetRemaining: number;           // totalBudget - totalSpent
        dailyBudgetRemaining: number;      // budgetRemaining / daysRemaining
      };
      projection: {
        willExceedBudget: boolean;
        projectedExcessOrSavings: number;  // positivo = ahorro, negativo = exceso
        dayBudgetRunsOut: Date | null;     // fecha estimada en que se acaba el presupuesto
        safeToSpendToday: number;          // cuánto puede gastar hoy sin exceder el presupuesto
      };
      status: 'excellent' | 'good' | 'warning' | 'danger' | 'no-budget';
      message: string;                     // mensaje humano: "A este ritmo ahorrarás $X" / "el día 25 te quedas sin presupuesto"
    }
    ```
  - Lógica:
    - Obtener período activo. Si no hay → `status: 'no-budget'`, `message: 'No hay período de presupuesto activo'`
    - Obtener todas las transacciones EXPENSE del período
    - Calcular promedio diario de gasto
    - Proyectar: `projectedMonthTotal = dailyAverageSpent * daysTotal`
    - Si `projectedMonthTotal > totalBudget` → calcular día en que se agota: `dayBudgetRunsOut = startDate + (totalBudget / dailyAverageSpent) días`
    - `safeToSpendToday = budgetRemaining / daysRemaining`
    - Status:
      - `excellent`: tasa de gasto < 70% del presupuesto prorrateado
      - `good`: 70-90%
      - `warning`: 90-100%
      - `danger`: > 100%

- [ ] **Registrar** en `src/infrastructure/di/DIContainer.ts`

### 05.2 — Nuevo Widget: FinancialProjectionWidget

- [ ] **Crear** `src/presentation/components/features/dashboard/widgets/FinancialProjectionWidget.tsx`
  - Card destacada que muestra:
    - **Icono de status**: check verde / triángulo amarillo / X roja
    - **Mensaje principal**: "A este ritmo ahorrarás $45.000" o "El día 25 te quedas sin presupuesto"
    - **Puedes gastar hoy**: `<MoneyDisplay>` con el monto seguro
    - **Barra de progreso**: gasto actual vs presupuesto total del período
    - **Texto secundario**: "Promedio diario: $X | Te quedan Y días"
  - Si no hay período activo:
    - Mostrar mensaje: "No hay presupuesto activo. Crea uno para ver tu proyección."
    - Botón: "Crear período" → navega a `/budgets`
  - Colores según status:
    - `excellent`: border-green, bg-green/10
    - `good`: border-blue, bg-blue/10
    - `warning`: border-yellow, bg-yellow/10
    - `danger`: border-red, bg-red/10

### 05.3 — Integrar en Dashboard

- [ ] **Editar** `src/app/(dashboard)/dashboard/page.tsx`
  - Colocar `FinancialProjectionWidget` **inmediatamente después** del card "Balance del Período" existente
  - Este widget es la respuesta directa a "¿me va a alcanzar?"

### 05.4 — Commit de Fase 05

```bash
git checkout -b feature/upgrade-phase-05-financial-projection develop
# ... hacer cambios ...
git add -A
git commit -m "feat(domain,presentation): proyección financiera con estimación de alcance

- Crear CalculateFinancialProjectionUseCase con cálculo de promedio diario, proyección y safe-to-spend
- Crear FinancialProjectionWidget con status visual y mensaje predictivo
- Integrar widget en dashboard después del balance del período
- Manejar caso sin período activo con CTA para crear uno"

git checkout develop
git merge --no-ff feature/upgrade-phase-05-financial-projection -m "Merge fase 05: proyección financiera"
git tag v0.7.4-financial-projection
```

---

## FASE 06 — Simplificar Carga de Transacciones ✅

> **Branch**: `feature/upgrade-phase-06-quick-entry`  
> **Tag**: `v0.8.0-quick-entry` ✅  
> **Objetivo**: Que cargar un gasto tome 3 taps y 5 segundos, no 30 segundos rellenando 7 campos.  
> **Capas afectadas**: Presentation (componentes nuevos), Application (hook con defaults inteligentes)

### 06.1 — Crear hook useSmartDefaults

- [x] **Crear** `src/presentation/components/features/transactions/hooks/useSmartDefaults.ts`
  - Lógica:
    - **Cuenta predeterminada**: La cuenta con más transacciones en el último mes. Almacenar en `localStorage` la última cuenta usada como fallback.
    - **Categoría sugerida**: La categoría más frecuente del tipo seleccionado (INCOME/EXPENSE) en el último mes.
    - **Fecha**: Siempre hoy.
  - Output:
    ```typescript
    interface SmartDefaults {
      defaultAccountId: string | null;
      suggestedCategoryId: string | null;
      defaultDate: Date;
      recentCategories: Array<{ id: string; name: string; count: number }>;  // top 5 más usadas
    }
    ```

### 06.2 — Crear componente QuickExpenseForm

- [x] **Crear** `src/presentation/components/features/transactions/QuickExpenseForm.tsx`
  - Formulario minimalista para carga ultra-rápida:
    ```
    ┌─────────────────────────────────────────┐
    │  $  [_________monto_________]           │
    │                                          │
    │  [Alimentación] [Transporte] [Servicios] │
    │  [Entretenimiento] [Salud] [+ Más]       │
    │                                          │
    │  Cuenta: [Banco Principal ▼]             │
    │  Descripción: [_________] (opcional)     │
    │                                          │
    │  [Registrar Gasto]                       │
    └─────────────────────────────────────────┘
    ```
  - **Monto**: Input grande, numérico, foco automático al abrir
  - **Categorías**: Botones/chips de las 5-6 categorías más usadas + botón "Más" que abre el Select completo
  - **Cuenta**: Pre-seleccionada con la cuenta por defecto. Select solo si quiere cambiar
  - **Descripción**: Campo opcional, colapsado por defecto, se expande al tocar
  - **Fecha**: Hoy por defecto. Link pequeño "Cambiar fecha" que despliega el input
  - **Total de campos visibles por defecto**: Monto + Categoría = 2 campos. El resto tiene defaults.
  - Reusar la misma lógica de `createTransaction.mutateAsync` del hook existente

### 06.3 — Crear componente QuickIncomeForm

- [x] **Crear** `src/presentation/components/features/transactions/QuickIncomeForm.tsx`
  - Mismo concepto que `QuickExpenseForm` pero:
    - Categorías de ingreso en vez de gasto
    - Color verde en el botón y el monto
    - Texto "Registrar Ingreso"

### 06.4 — Actualizar FAB y Header modal

- [x] **Editar** `src/components/layout/GlobalTransactionFAB.tsx`
  - Reemplazar `TransactionForm` por `QuickExpenseForm` en el diálogo de gasto
  - Reemplazar `TransactionForm` por `QuickIncomeForm` en el diálogo de ingreso
  - Agregar link "Formulario completo" al final de cada quick form que abra el `TransactionForm` original para casos que necesiten campos avanzados (cuotas, URL de recibo)

- [x] **Editar** `src/presentation/components/features/transactions/QuickTransactionModal.tsx`
  - Mismo cambio: usar quick forms como default, con link a formulario completo

### 06.5 — Mantener TransactionForm para uso avanzado

- [x] **NO eliminar** `src/presentation/components/features/transactions/TransactionForm.tsx`
  - Se mantiene como formulario completo para:
    - Edición de transacciones existentes
    - Transacciones con cuotas
    - Transacciones con recibo adjunto
    - Acceso desde link "Formulario completo" en quick forms
  - Agregar los smart defaults como valores iniciales también aquí

### 06.6 — Persistir última cuenta usada

- [x] **Implementado en QuickForms y TransactionForm**
  - En el `onSuccess` de `createTransaction`, guardar `accountId` en localStorage:
    ```typescript
    localStorage.setItem(`lastAccountId_${orgId}`, data.accountId);
    ```
  - El hook `useSmartDefaults` lee este valor como fallback

### 06.7 — Commit de Fase 06 ✅

```bash
✅ git checkout -b feature/upgrade-phase-06-quick-entry develop
✅ # ... hacer cambios ...
✅ git add -A
✅ git commit -m "feat(presentation): carga rápida de transacciones con smart defaults

- Crear useSmartDefaults hook con cuenta más usada, categorías frecuentes, fecha auto
- Crear QuickExpenseForm con monto + categoría chips + defaults inteligentes
- Crear QuickIncomeForm con misma lógica para ingresos
- Actualizar FAB y header modal para usar quick forms
- Mantener TransactionForm como formulario avanzado accesible
- Persistir última cuenta usada en localStorage"

✅ git checkout develop
✅ git merge --no-ff feature/upgrade-phase-06-quick-entry -m "Merge fase 06: carga rápida de transacciones"
✅ git tag v0.8.0-quick-entry
```

---

## FASE 07 — Gráficos: Presupuesto vs Real + Nuevos Charts

> **Branch**: `feature/upgrade-phase-07-charts-upgrade`  
> **Tag**: `v0.8.1-charts-upgrade`  
> **Objetivo**: Gráficos que muestren insight real, no solo datos.  
> **Capas afectadas**: Presentation (componentes de gráficos), Application (hooks de datos)

### 07.1 — Gráfico de barras: Presupuesto vs Real por categoría

- [x] **Crear** `src/presentation/components/features/dashboard/charts/BudgetVsActualChart.tsx`
  - **Tipo**: Barras horizontales agrupadas (Recharts `BarChart` con `layout="vertical"`)
  - **Datos**: Para cada categoría con presupuesto asignado: barra azul (presupuesto) + barra verde/roja (real)
    - Verde si real < presupuesto
    - Roja si real > presupuesto
  - **Props**:
    ```typescript
    interface BudgetVsActualChartProps {
      data: Array<{
        categoryName: string;
        budgeted: number;
        spent: number;
        color: string;
      }>;
    }
    ```
  - **Tooltip**: Muestra categoría, presupuesto, gasto real, diferencia, % de uso
  - **Etiquetas**: % de uso al final de cada barra

### 07.2 — Gráfico de barras apiladas: Gastos por día de la semana

- [x] **Crear** `src/presentation/components/features/dashboard/charts/WeeklyPatternChart.tsx`
  - **Tipo**: Barras verticales (7 barras, una por día de la semana)
  - **Datos**: Promedio de gasto por día de la semana (Lun-Dom) en el período seleccionado
  - Resaltar el día actual
  - **Insight**: "Tu día de mayor gasto es el [Sábado]"

### 07.3 — Gauge: Presupuesto restante del período

- [x] **Crear** `src/presentation/components/features/dashboard/charts/BudgetGauge.tsx`
  - **Tipo**: Semicírculo gauge (implementar con SVG o librería `react-gauge-chart`)
  - **Datos**: Porcentaje de presupuesto usado del período activo
  - **Colores**: Gradiente verde → amarillo → rojo
  - **Centro**: Monto restante en texto grande
  - **Fallback**: Si no hay período, mostrar "Sin presupuesto"

### 07.4 — Sparklines en KPIs

- [x] **Crear** `src/presentation/components/shared/Sparkline.tsx`
  - Mini line chart de 80x30px sin ejes ni leyendas
  - Props: `data: number[]`, `color: string`, `trend: 'up' | 'down' | 'stable'`
  - Usar Recharts `LineChart` minimalista o SVG puro para rendimiento

- [x] **Editar** `src/presentation/components/shared/Cards/KPICard.tsx`
  - Agregar prop opcional `sparklineData?: number[]`
  - Si tiene datos, renderizar `Sparkline` debajo del valor principal

### 07.5 — Hook para datos de gráficos nuevos

- [x] **Crear** `src/presentation/components/features/dashboard/hooks/useBudgetVsActual.ts`
  - Consulta períodos activos + category budgets + gastos reales
  - Devuelve datos formateados para `BudgetVsActualChart`

- [x] **Crear** `src/presentation/components/features/dashboard/hooks/useWeeklyPattern.ts`
  - Consulta transacciones del período y agrupa por día de la semana
  - Calcula promedio por día

### 07.6 — Integrar gráficos en Dashboard

- [x] **Editar** `src/app/(dashboard)/dashboard/page.tsx`
  - Reorganizar sección de gráficos:
    ```
    ┌─────────────────────┬─────────────────────┐
    │  Balance Evolution   │  Budget vs Actual   │
    │  (existente)         │  (NUEVO)            │
    ├─────────────────────┼─────────────────────┤
    │  Expenses by Cat     │  Weekly Pattern     │
    │  (existente)         │  (NUEVO)            │
    └─────────────────────┴─────────────────────┘
    ```
  - Agregar `BudgetGauge` como widget inline en la fila de KPIs secundarios

### 07.7 — Reemplazar Pie Chart por Treemap (opcional, si el tiempo lo permite)

- [ ] **Crear** `src/presentation/components/features/dashboard/charts/ExpensesTreemap.tsx`
  - Usar Recharts `Treemap` para mostrar gastos por categoría de forma proporcional y legible
  - Dejar el pie chart como vista alternativa: tabs "Torta | Mapa" en la card

### 07.8 — Commit de Fase 07

```bash
git checkout -b feature/upgrade-phase-07-charts-upgrade develop
# ... hacer cambios ...
git add -A
git commit -m "feat(presentation): nuevos gráficos con insight real

- Crear BudgetVsActualChart con barras horizontales presupuesto vs real
- Crear WeeklyPatternChart con patrón de gasto por día de semana
- Crear BudgetGauge con indicador visual de presupuesto restante
- Crear Sparkline reutilizable para KPIs
- Crear hooks useBudgetVsActual y useWeeklyPattern
- Integrar nuevos gráficos en dashboard"

git checkout develop
git merge --no-ff feature/upgrade-phase-07-charts-upgrade -m "Merge fase 07: upgrade de gráficos"
git tag v0.8.1-charts-upgrade
```

---

## FASE 08 — Períodos: Plantillas, Copiar y Auto-Renovación

> **Branch**: `feature/upgrade-phase-08-period-automation`  
> **Tag**: `v0.8.2-period-automation`  
> **Objetivo**: Eliminar el riesgo de que el usuario se quede sin período de presupuesto.  
> **Capas afectadas**: Domain (use cases nuevos), Application (hooks), Presentation (UI), Infrastructure (Cloud Function opcional)

### 08.1 — Use Case: CloneBudgetPeriod

- [x] **Crear** `src/domain/use-cases/budget-periods/CloneBudgetPeriodUseCase.ts`
  - Input: `{ sourcePeriodId: string; newStartDate: Date; newEndDate: Date; newTotalAmount?: number; userId: string }`
  - Lógica:
    1. Obtener el período fuente con sus CategoryBudgets
    2. Crear nuevo BudgetPeriod con las mismas propiedades (nuevo nombre: "Copia de [nombre]" o autogenerar nombre por mes)
    3. Copiar todos los CategoryBudgets del período fuente con los mismos porcentajes
    4. Resetear `spentAmount` a 0 en cada CategoryBudget clonado
  - Output: `{ budgetPeriodId: string; categoryBudgetCount: number }`

- [x] **Registrar** en DIContainer

### 08.2 — Use Case: CheckPeriodExpiration

- [x] **Crear** `src/domain/use-cases/budget-periods/CheckPeriodExpirationUseCase.ts`
  - Input: `{ userId: string }`
  - Output:
    ```typescript
    interface PeriodExpirationStatus {
      hasActivePeriod: boolean;
      activePeriod: BudgetPeriod | null;
      isExpiringSoon: boolean;           // < 3 días para expirar
      daysUntilExpiration: number | null;
      lastExpiredPeriod: BudgetPeriod | null;  // último período expirado (para facilitar clon)
      suggestion: 'none' | 'create-first' | 'renew-expiring' | 'create-from-expired';
    }
    ```
  - Lógica:
    - Buscar período activo del usuario
    - Si no hay: buscar el último expirado
    - Si hay activo: verificar si faltan < 3 días
    - Generar sugerencia según el caso

- [x] **Registrar** en DIContainer

### 08.3 — Banner de estado de período en Dashboard

- [x] **Crear** `src/presentation/components/features/budgets/PeriodStatusBanner.tsx`
  - Se muestra en la parte superior del dashboard cuando:
    - **No hay período activo** (rojo): "No tienes un período de presupuesto activo. Tus gastos no se están controlando."
      - Botón: "Crear período" | "Copiar último período"
    - **Período expira en < 3 días** (amarillo): "Tu período '[nombre]' vence en X días. Prepara el siguiente."
      - Botón: "Crear siguiente período" (pre-llenado con fechas consecutivas)
    - **Período activo** (no se muestra — todo bien)

- [x] **Editar** `src/app/(dashboard)/dashboard/page.tsx`
  - Integrar `PeriodStatusBanner` como primer elemento, antes de todo

### 08.4 — Botón "Copiar período anterior" en página de Presupuestos

- [x] **Editar** `src/app/(dashboard)/budgets/page.tsx`
  - En la sección de períodos, junto a "Nuevo Período", agregar botón:
    - "Copiar último" (solo visible si hay al menos un período anterior)
    - Al hacer click: abre diálogo pre-llenado con:
      - Fechas consecutivas al último período (siguiente mes)
      - Mismo monto total
      - Opción de ajustar monto antes de crear
    - Al confirmar: ejecuta `CloneBudgetPeriodUseCase`

### 08.5 — Sugerencia de montos por categoría basada en historial

- [x] **Crear** `src/domain/use-cases/budget-periods/SuggestCategoryBudgetsUseCase.ts`
  - Input: `{ userId: string; startDate: Date; endDate: Date }`
  - Lógica:
    - Obtener transacciones EXPENSE del período anterior equivalente (mismo número de días)
    - Agrupar gastos por categoría
    - Devolver sugerencia: "El mes pasado gastaste $X en [categoría], ¿quieres presupuestar $Y?"
  - Output: `Array<{ categoryId: string; categoryName: string; suggestedPercentage: number; historicalAmount: number }>`

- [x] **Integrar** en el diálogo de creación de período nuevo y en la tabla de asignación
  - Mostrar como hint al lado de cada input de porcentaje: "Sugerido: X% (gastaste $Y el mes pasado)"

### 08.6 — Cloud Function para notificación de expiración (opcional, infraestructura)

- [-] **Crear** `functions/src/checkPeriodExpiration.ts`
  - Función programada (Cloud Scheduler) que corre diariamente
  - Para cada usuario con período que expira en < 3 días y sin período siguiente creado:
    - Crear una `Alert` en la collection de alertas con prioridad HIGH
    - Mensaje: "Tu período de presupuesto vence el [fecha]. Crea el siguiente para mantener el control."
  - **Nota**: Esta es la única nueva Cloud Function. Todo lo demás es client-side.

### 08.7 — Commit de Fase 08

```bash
git checkout -b feature/upgrade-phase-08-period-automation develop
# ... hacer cambios ...
git add -A
git commit -m "feat(domain,presentation): automatización de períodos con clon, sugerencias y alertas

- Crear CloneBudgetPeriodUseCase para copiar períodos con sus categorías
- Crear CheckPeriodExpirationUseCase con detección de expiración
- Crear PeriodStatusBanner con CTAs contextuales en dashboard
- Agregar botón 'Copiar último' en página de presupuestos
- Crear SuggestCategoryBudgetsUseCase con sugerencias basadas en historial
- Crear Cloud Function para alertas de expiración (opcional)"

git checkout develop
git merge --no-ff feature/upgrade-phase-08-period-automation -m "Merge fase 08: automatización de períodos"
git tag v0.8.2-period-automation
```

---

## FASE 09 — Transacciones Recurrentes UI

> **Branch**: `feature/upgrade-phase-09-recurring-ui`  
> **Tag**: `v0.8.3-recurring-ui`  
> **Objetivo**: Sacar provecho de los use cases de RecurringTransaction que ya existen pero no tienen UI.  
> **Capas afectadas**: Presentation (página nueva + componentes), Application (hook ya existe)

### 09.1 — Crear página de transacciones recurrentes

- [ ] **Crear** `src/app/(dashboard)/recurring/page.tsx`
  - Layout:
    - **Lista de transacciones recurrentes** activas con:
      - Icono según frecuencia (diaria/semanal/mensual/anual)
      - Nombre | Monto | Frecuencia | Cuenta | Categoría | Próxima fecha | Estado (activa/pausada)
      - Acciones: Pausar/Reanudar | Editar | Eliminar
    - **Botón "Nueva recurrente"** → abre formulario
    - **Resumen**: "Total compromisos mensuales: $X"

### 09.2 — Crear formulario de transacción recurrente

- [ ] **Crear** `src/presentation/components/features/recurring/RecurringTransactionForm.tsx`
  - Campos:
    - Tipo: Ingreso / Gasto
    - Descripción
    - Monto
    - Frecuencia: Diaria | Semanal | Quincenal | Mensual | Anual
    - Cuenta
    - Categoría
    - Fecha de inicio
    - Fecha de fin (opcional — "Sin fecha de fin" por defecto)
  - Reusar lógica de cuentas y categorías de `useAccounts` y `useCategories`

### 09.3 — Agregar link en Sidebar

- [ ] **Editar** `src/components/layout/Sidebar.tsx`
  - Agregar item de menú:
    ```typescript
    { href: '/recurring', label: 'Recurrentes', icon: RefreshCw, implemented: true }
    ```
  - Ubicar después de "Transacciones" y antes de "Cuentas"

### 09.4 — Procesamiento automático al abrir Dashboard

- [ ] **Editar** `src/app/(dashboard)/dashboard/page.tsx`
  - Al montar el dashboard, ejecutar una verificación:
    ```typescript
    const { processRecurringTransactions } = useRecurringTransactions(orgId);
    useEffect(() => {
      processRecurringTransactions.mutate({ processingDate: new Date() });
    }, []);
    ```
  - Esto procesa las transacciones recurrentes que estén pendientes (pasaron su fecha de próxima ejecución)
  - El use case `ProcessRecurringTransactionsUseCase` ya existe y maneja la lógica

### 09.5 — Widget de compromisos recurrentes en Dashboard

- [ ] **Crear** `src/presentation/components/features/dashboard/widgets/RecurringCommitmentsWidget.tsx`
  - Muestra:
    - Total de compromisos futuros del mes en curso
    - Lista de las próximas 3-5 transacciones recurrentes por vencer
    - Link "Ver todas" → `/recurring`

### 09.6 — Commit de Fase 09

```bash
git checkout -b feature/upgrade-phase-09-recurring-ui develop
# ... hacer cambios ...
git add -A
git commit -m "feat(presentation): UI completa para transacciones recurrentes

- Crear página /recurring con lista, formulario CRUD y resumen
- Crear RecurringTransactionForm reutilizable
- Agregar link 'Recurrentes' en sidebar
- Integrar procesamiento automático al montar dashboard
- Crear RecurringCommitmentsWidget para próximos compromisos"

git checkout develop
git merge --no-ff feature/upgrade-phase-09-recurring-ui -m "Merge fase 09: transacciones recurrentes UI"
git tag v0.8.3-recurring-ui
```

---

## FASE 10 — Metas de Ahorro UI

> **Branch**: `feature/upgrade-phase-10-savings-goals`  
> **Tag**: `v0.9.0-savings-goals`  
> **Objetivo**: Sacar provecho de la entidad SavingsGoal existente.  
> **Capas afectadas**: Presentation (página nueva + widget)

### 10.1 — Crear página de metas de ahorro

- [ ] **Crear** `src/app/(dashboard)/savings/page.tsx`
  - Lista de metas con:
    - Nombre | Monto objetivo | Monto actual | % progreso | Fecha límite | Estado
    - Progress bar visual por meta
    - Acciones: Contribuir | Editar | Eliminar
  - Botón "Nueva meta" → formulario con: nombre, monto objetivo, fecha objetivo (opcional), cuenta vinculada (opcional)

### 10.2 — Widget de metas en Dashboard

- [ ] **Crear** `src/presentation/components/features/dashboard/widgets/SavingsGoalsWidget.tsx`
  - Muestra las top 2-3 metas activas con progress bars compactas
  - Link "Ver todas" → `/savings`

### 10.3 — Agregar link en Sidebar

- [ ] **Editar** `src/components/layout/Sidebar.tsx`
  - Agregar: `{ href: '/savings', label: 'Metas de Ahorro', icon: Target, implemented: true }`
  - Ubicar después de "Reportes"

### 10.4 — Formulario de contribución

- [ ] **Crear** `src/presentation/components/features/savings/ContributionForm.tsx`
  - Campos: meta (select), monto, cuenta (select), fecha, descripción
  - Al contribuir: usa `ContributeToSavingsGoalUseCase` existente

### 10.5 — Commit de Fase 10

```bash
git checkout -b feature/upgrade-phase-10-savings-goals develop
# ... hacer cambios ...
git add -A
git commit -m "feat(presentation): UI completa para metas de ahorro

- Crear página /savings con lista de metas, progreso y CRUD
- Crear SavingsGoalsWidget para dashboard
- Crear ContributionForm para aportes a metas
- Agregar link en sidebar"

git checkout develop
git merge --no-ff feature/upgrade-phase-10-savings-goals -m "Merge fase 10: metas de ahorro"
git tag v0.9.0-savings-goals
```

---

## FASE 11 — Sistema de Notificaciones y Alertas

> **Branch**: `feature/upgrade-phase-11-notifications`  
> **Tag**: `v0.9.1-notifications`  
> **Objetivo**: Que las alertas se vean y se actúe sobre ellas.  
> **Capas afectadas**: Presentation (página nueva + mejora de header), Application

### 11.1 — Crear página de alertas/notificaciones

- [ ] **Crear** `src/app/(dashboard)/notifications/page.tsx`
  - Lista completa de alertas con:
    - Filtros: Todas | Sin leer | Por prioridad (LOW, MEDIUM, HIGH, URGENT)
    - Cada alerta: Icono de prioridad | Mensaje | Fecha | Botón Marcar como leída | Link a entidad relacionada
    - Acciones masivas: Marcar todas como leídas | Archivar leídas

### 11.2 — Badge de notificaciones en Header

- [ ] **Editar** `src/components/layout/Header.tsx`
  - Agregar icono de campana (Bell) con badge numérico (count de alertas no leídas)
  - Al hacer click: dropdown con las últimas 5 alertas + link "Ver todas" → `/notifications`
  - Usar `useUnreadAlerts` (ya existe) para el conteo

### 11.3 — Configuración de umbrales de alerta

- [ ] **Crear** `src/app/(dashboard)/settings/page.tsx` (página básica de configuración)
  - Sección "Alertas":
    - Umbral de presupuesto por categoría: % para alerta amarilla (default 80%), % para alerta roja (default 100%)
    - Alertas de saldo bajo: monto mínimo por cuenta que dispara alerta
    - Recordatorio de pago de tarjeta: días antes del pago
  - Guardar en una collection `userSettings/{userId}` en Firestore

### 11.4 — Activar los items pendientes del Sidebar

- [ ] **Editar** `src/components/layout/Sidebar.tsx`
  - Agregar: `{ href: '/notifications', label: 'Notificaciones', icon: Bell, implemented: true }`
  - Cambiar `/settings` a `implemented: true`

### 11.5 — Generar alertas automáticamente

- [ ] **Editar** `src/domain/use-cases/alerts/CheckBudgetAlertsUseCase.ts`
  - Verificar que genera alertas para:
    - Categoría supera 80% del presupuesto → alert MEDIUM
    - Categoría supera 100% del presupuesto → alert HIGH
    - Saldo de cuenta por debajo del mínimo configurado → alert HIGH
    - Próximo pago de tarjeta de crédito (< 3 días) → alert HIGH
  - Integrar llamada a este use case en el `CreateTransactionUseCase` como side-effect post-creación

### 11.6 — Commit de Fase 11

```bash
git checkout -b feature/upgrade-phase-11-notifications develop
# ... hacer cambios ...
git add -A
git commit -m "feat(presentation,domain): sistema de notificaciones y alertas configurable

- Crear página /notifications con filtros y acciones masivas
- Agregar badge de notificaciones en header con dropdown
- Crear página /settings con configuración de umbrales de alerta
- Integrar generación automática de alertas en creación de transacciones
- Activar links de notificaciones y settings en sidebar"

git checkout develop
git merge --no-ff feature/upgrade-phase-11-notifications -m "Merge fase 11: notificaciones y alertas"
git tag v0.9.1-notifications
```

---

## FASE 12 — Onboarding y UX General

> **Branch**: `feature/upgrade-phase-12-onboarding`  
> **Tag**: `v0.9.2-onboarding`  
> **Objetivo**: Que un usuario nuevo no se pierda al entrar.  
> **Capas afectadas**: Presentation

### 12.1 — Crear flujo de onboarding

- [ ] **Crear** `src/presentation/components/features/onboarding/OnboardingWizard.tsx`
  - Wizard en 4 pasos:
    1. **Bienvenida**: "¡Bienvenido a Control Financiero! Vamos a configurar tu cuenta en 2 minutos."
    2. **Crear primera cuenta**: Formulario simplificado de cuenta (nombre, tipo, saldo inicial). Solo los campos mínimos.
    3. **Crear período de presupuesto**: Formulario simplificado (monto total, este mes automáticamente)
    4. **Asignar categorías**: Quick-assign con porcentajes sugeridos (Alimentación 30%, Transporte 15%, Servicios 20%, etc.)
  - Botón "Omitir" en cada paso (salvo el paso 1)
  - Progress bar visual del wizard
  - Se marca como completado en `userSettings/{userId}.onboardingCompleted: true`

### 12.2 — Detectar usuario nuevo y mostrar wizard

- [ ] **Editar** `src/app/(dashboard)/dashboard/page.tsx`
  - Al cargar:
    - Verificar si el usuario tiene cuentas creadas
    - Si no tiene ninguna cuenta → mostrar `OnboardingWizard` como overlay/modal
    - Si ya tiene → no mostrar (flujo normal)
  - Alternativa: verificar flag `onboardingCompleted` en Firestore

### 12.3 — Empty states mejorados

- [ ] **Crear** `src/presentation/components/shared/EmptyState.tsx`
  - Componente reutilizable para cuando no hay datos:
    ```typescript
    interface EmptyStateProps {
      icon: React.ReactNode;
      title: string;
      description: string;
      action?: { label: string; onClick: () => void };
    }
    ```
  - Usar en: Dashboard (sin transacciones), Transacciones (sin resultados), Cuentas (sin cuentas), Presupuestos (sin períodos), Recurrentes (sin recurrentes), Metas (sin metas)

### 12.4 — Commit de Fase 12

```bash
git checkout -b feature/upgrade-phase-12-onboarding develop
# ... hacer cambios ...
git add -A
git commit -m "feat(presentation): onboarding wizard y empty states mejorados

- Crear OnboardingWizard con 4 pasos guiados
- Detectar usuario nuevo y mostrar wizard automáticamente
- Crear EmptyState compartido para páginas sin datos
- Aplicar empty states en dashboard, transacciones, cuentas, presupuestos"

git checkout develop
git merge --no-ff feature/upgrade-phase-12-onboarding -m "Merge fase 12: onboarding y UX"
git tag v0.9.2-onboarding
```

---

## FASE 13 — Mejoras en Reportes y Exportación

> **Branch**: `feature/upgrade-phase-13-reports-upgrade`  
> **Tag**: `v0.9.3-reports-upgrade`  
> **Objetivo**: Reportes que sirvan para tomar decisiones.  
> **Capas afectadas**: Presentation, Application

### 13.1 — Mejorar selector de fechas con Date Range Picker

- [ ] **Crear** `src/presentation/components/shared/DateRangePicker.tsx`
  - Usar `react-day-picker` (ya está en package.json) con selección de rango
  - Mostrar los dos meses en pantalla con drag select
  - Presets rápidos: Hoy, Esta semana, Este mes, Mes pasado, Trimestre, Año, Custom
  - Reutilizable en: Reportes, Transacciones, Dashboard

- [ ] **Editar** `src/app/(dashboard)/reports/page.tsx`
  - Reemplazar los `<Input type="date">` por `DateRangePicker`

- [ ] **Editar** `src/app/(dashboard)/transactions/page.tsx` (si no se hizo en Fase 03)
  - Usar `DateRangePicker` para el rango de fechas

### 13.2 — Reporte de fin de período mejorado

- [ ] **Editar** `src/presentation/components/features/reports/PeriodReport.tsx`
  - Agregar sección de "Insights del período":
    - Categoría donde más ahorraste vs presupuesto
    - Categoría donde más te excediste
    - Día de mayor gasto del período
    - Comparación con período anterior (si existe)
  - Agregar tabla de transacciones agrupadas por categoría con subtotales

### 13.3 — Exportación CSV mejorada

- [ ] **Editar** `src/app/(dashboard)/reports/page.tsx` — función `handleExportCSV`
  - Agregar BOM UTF-8 para que Excel abra con acentos correctos:
    ```typescript
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    ```
  - Incluir más campos: Tipo, Fecha, Descripción, Categoría, Cuenta, Monto, Cuotas (si aplica)
  - Agregar fila final con totales

### 13.4 — Habilitar exportación en Transacciones

- [ ] **Editar** `src/app/(dashboard)/transactions/page.tsx`
  - Implementar botón "Exportar" para exportar el set filtrado actual como CSV
  - Misma lógica que en Reportes pero con los filtros activos

### 13.5 — Commit de Fase 13

```bash
git checkout -b feature/upgrade-phase-13-reports-upgrade develop
# ... hacer cambios ...
git add -A
git commit -m "feat(presentation): mejoras en reportes, date picker visual y exportación

- Crear DateRangePicker con react-day-picker y presets rápidos
- Mejorar PeriodReport con insights y comparación con período anterior
- Mejorar exportación CSV con BOM UTF-8 y totales
- Habilitar exportación en página de transacciones"

git checkout develop
git merge --no-ff feature/upgrade-phase-13-reports-upgrade -m "Merge fase 13: reportes y exportación"
git tag v0.9.3-reports-upgrade
```

---

## FASE 14 — Categorías Inteligentes y Sub-categorías

> **Branch**: `feature/upgrade-phase-14-smart-categories`  
> **Tag**: `v0.9.4-smart-categories`  
> **Objetivo**: Mejor organización de gastos y sugerencias automáticas.  
> **Capas afectadas**: Domain (entidad), Infrastructure (mapper/repo), Presentation

### 14.1 — Agregar campo parentId a Category (sub-categorías)

- [ ] **Editar** `src/types/firestore.ts`
  - Agregar a `Category`:
    ```typescript
    parentId?: string; // ID de categoría padre (null = categoría raíz)
    ```

- [ ] **Editar** `src/domain/entities/Category.ts`
  - Agregar campo `parentId?: string` al constructor
  - Método `isSubcategory(): boolean`

- [ ] **Editar** mappers y repositorios para soportar el nuevo campo
  - `CategoryMapper.ts`: mapear `parentId`
  - `FirestoreCategoryRepository.ts`: agregar `getSubcategories(parentId: string)`

### 14.2 — UI para gestionar sub-categorías

- [ ] **Editar** la tabla de categorías en `src/app/(dashboard)/budgets/page.tsx` (tab de asignación)
  - Mostrar categorías como árbol expandible:
    ```
    ▸ Alimentación (30%)
      └ Supermercado
      └ Restaurantes
      └ Delivery
    ▸ Transporte (15%)
      └ Combustible
      └ Transporte público
    ```
  - Botón para crear sub-categoría dentro de una categoría padre
  - Los porcentajes se asignan a nivel padre. El desglose por sub-categoría es informativo.

### 14.3 — Sugerencia de categoría al crear transacción

- [ ] **Crear** `src/domain/use-cases/categories/SuggestCategoryUseCase.ts`
  - Input: `{ description: string; type: TransactionType; userId: string }`
  - Lógica:
    - Buscar transacciones anteriores del usuario con descripción similar (usando includes o palabras clave)
    - Devolver la categoría más frecuente para esa descripción
    - Ejemplo: si el usuario siempre pone "Uber" como gasto en "Transporte", la próxima vez que escriba "Uber" sugerir "Transporte"
  - Output: `{ suggestedCategoryId: string | null; confidence: 'high' | 'medium' | 'low' }`
  - **No es IA** — es pattern matching simple sobre historial. Eficiente y determinístico.

- [ ] **Integrar** en `QuickExpenseForm` y `TransactionForm`
  - Al cambiar el campo de descripción (con debounce de 500ms), ejecutar sugerencia
  - Si hay sugerencia con confianza alta, pre-seleccionar la categoría
  - Si confianza media, mostrar como hint: "¿Es esto [Categoría]?"

### 14.4 — Nuevas categorías de ingreso

- [ ] **Editar** `src/lib/constants/defaultCategories.ts`
  - Agregar categorías de ingreso faltantes:
    - Reembolsos
    - Regalos / Donaciones
    - Bonos
    - Venta de artículos
  - Estas se agregan como categorías del sistema para organizaciones nuevas
  - Para organizaciones existentes, agregar botón "Actualizar categorías del sistema" en settings

### 14.5 — Commit de Fase 14

```bash
git checkout -b feature/upgrade-phase-14-smart-categories develop
# ... hacer cambios ...
git add -A
git commit -m "feat(domain,presentation): sub-categorías y sugerencia inteligente de categoría

- Agregar parentId a Category para sub-categorías
- UI de árbol expandible para categorías con sub-categorías
- Crear SuggestCategoryUseCase con pattern matching en historial
- Integrar sugerencias en formularios de transacción
- Agregar nuevas categorías de ingreso al sistema"

git checkout develop
git merge --no-ff feature/upgrade-phase-14-smart-categories -m "Merge fase 14: categorías inteligentes"
git tag v0.9.4-smart-categories
```

---

## FASE 15 — Pulido Final y Release v1.0

> **Branch**: `feature/upgrade-phase-15-release`  
> **Tag**: `v1.0.0`  
> **Objetivo**: Pulir, testear, documentar y emitir release.  
> **Capas afectadas**: Todas

### 15.1 — Revisión de seguridad de Firestore Rules

- [ ] **Editar** `firestore.rules`
  - Actualmente las collections principales (accounts, transactions, categories, etc.) usan `allow read, write: if isAuthenticated()` — esto es **inseguro** porque cualquier usuario autenticado puede leer/escribir datos de CUALQUIER organización
  - Agregar validación por organización:
    ```
    match /transactions/{transactionId} {
      allow read: if isAuthenticated() && isMemberOfOrg(resource.data.orgId);
      allow create: if isAuthenticated() && isMemberOfOrg(request.resource.data.orgId);
      allow update, delete: if isAuthenticated() && isMemberOfOrg(resource.data.orgId);
    }
    ```
  - Aplicar el mismo patrón a: accounts, categories, budgets, budgetPeriods, categoryBudgets, creditCards, recurringTransactions, savingsGoals, alerts

### 15.2 — Activar links pendientes del Sidebar

- [ ] **Editar** `src/components/layout/Sidebar.tsx`
  - Verificar que TODOS los items implementados tengan `implemented: true`:
    - Dashboard, Transacciones, Cuentas, Presupuestos, Recurrentes, Metas de Ahorro, Reportes, Notificaciones, Configuración
  - Eliminar items que no se implementaron en este upgrade (Por Cobrar, Por Pagar) o marcarlos como v2.0

### 15.3 — Actualizar "Por Cobrar" y "Por Pagar" como roadmap

- [ ] **Editar** `src/components/layout/Sidebar.tsx`
  - Cambiar texto de items no implementados a incluir tooltip "Próximamente en v2.0"
  - O eliminarlos completamente del sidebar si no hay plan inmediato

### 15.4 — Actualizar versión de la app

- [ ] **Editar** `package.json` — cambiar `"version"` a `"1.0.0"`
- [ ] **Editar** `src/lib/constants/config.ts` — cambiar `APP_VERSION` a `'1.0.0'`

### 15.5 — Limpieza de código

- [ ] Correr `npm run lint` y corregir todos los errores/warnings
- [ ] Correr `npm run build` y verificar que compila sin errores
- [ ] Correr `npm test` y verificar que todos los tests pasan
- [ ] Eliminar `console.log` de debug en código de producción (salvo error handlers)
- [ ] Revisar que no queden TODO comments sin resolver en el código

### 15.6 — Revisión de performance

- [ ] Verificar que las queries a Firestore usan índices apropiados
  - Revisar `firestore.indexes.json` y agregar índices necesarios para las nuevas queries
- [ ] Verificar que los hooks de React Query tienen `staleTime` apropiado:
  - Dashboard stats: 5 min
  - Daily/weekly stats: 2 min
  - Transacciones: 3 min
  - Cuentas: 10 min
  - Categorías: 30 min (cambian poco)
- [ ] Verificar que no hay re-renders innecesarios en el dashboard (muchos widgets = muchas queries)
  - Usar React DevTools profiler si es necesario

### 15.7 — Documentación

- [ ] **Editar** `README.md`
  - Actualizar con la lista de features de v1.0
  - Instrucciones de setup
  - Screenshots (si aplica)

- [ ] **Editar** `DEPLOYMENT.md`
  - Verificar que los pasos de deploy siguen vigentes

### 15.8 — Release final

```bash
git checkout -b feature/upgrade-phase-15-release develop
# ... hacer cambios ...
git add -A
git commit -m "chore: pulido final, seguridad, limpieza y documentación para v1.0.0

- Endurecer Firestore security rules con validación por organización
- Activar todos los links del sidebar
- Actualizar versión a 1.0.0
- Limpiar código, lint y builds
- Actualizar documentación"

git checkout develop
git merge --no-ff feature/upgrade-phase-15-release -m "Merge fase 15: release v1.0.0"
git tag v1.0.0

# Merge a main para release
git checkout main
git merge --no-ff develop -m "Release v1.0.0: upgrade completo desde diagnóstico"
git tag v1.0.0-release

# Push todo
git push origin develop main --tags
```

---

## RESUMEN DE ARCHIVOS NUEVOS POR FASE

### Fase 01 — Limpieza
```
Editados:  Sidebar.tsx, Header.tsx, layout.tsx, transactions/page.tsx, config.ts
Creados:   ThemeToggle.tsx
```

### Fase 02 — Daily/Weekly
```
Creados:   GetDailyWeeklyStatsUseCase.ts
           useDailyWeeklyStats.ts
           DailyExpenseWidget.tsx
           WeeklyExpenseWidget.tsx
Editados:  dashboard/page.tsx, GetDashboardStatisticsUseCase.ts, DIContainer.ts
```

### Fase 03 — Filtros
```
Creados:   TransactionFilters.tsx
Editados:  transactions/page.tsx
```

### Fase 04 — Deudas
```
Creados:   GetDebtSummaryUseCase.ts
           DebtSummaryWidget.tsx
Editados:  accounts/page.tsx, dashboard/page.tsx, DIContainer.ts
```

### Fase 05 — Proyección
```
Creados:   CalculateFinancialProjectionUseCase.ts
           FinancialProjectionWidget.tsx
Editados:  dashboard/page.tsx, DIContainer.ts
```

### Fase 06 — Quick Entry
```
Creados:   useSmartDefaults.ts
           QuickExpenseForm.tsx
           QuickIncomeForm.tsx
Editados:  GlobalTransactionFAB.tsx, QuickTransactionModal.tsx, useTransactions.ts
```

### Fase 07 — Charts
```
Creados:   BudgetVsActualChart.tsx
           WeeklyPatternChart.tsx
           BudgetGauge.tsx
           Sparkline.tsx
           skeleton.tsx
           useBudgetVsActual.ts
           useWeeklyPattern.ts
Editados:  KPICard.tsx, dashboard/page.tsx
```

### Fase 08 — Períodos
```
Creados:   CloneBudgetPeriodUseCase.ts
           CheckPeriodExpirationUseCase.ts
           SuggestCategoryBudgetsUseCase.ts
           PeriodStatusBanner.tsx
           functions/src/checkPeriodExpiration.ts (opcional)
Editados:  budgets/page.tsx, dashboard/page.tsx, DIContainer.ts
```

### Fase 09 — Recurrentes UI
```
Creados:   src/app/(dashboard)/recurring/page.tsx
           RecurringTransactionForm.tsx
           RecurringCommitmentsWidget.tsx
Editados:  Sidebar.tsx, dashboard/page.tsx
```

### Fase 10 — Metas de Ahorro
```
Creados:   src/app/(dashboard)/savings/page.tsx
           SavingsGoalsWidget.tsx
           ContributionForm.tsx
Editados:  Sidebar.tsx, dashboard/page.tsx
```

### Fase 11 — Notificaciones
```
Creados:   src/app/(dashboard)/notifications/page.tsx
           src/app/(dashboard)/settings/page.tsx
Editados:  Header.tsx, Sidebar.tsx, CheckBudgetAlertsUseCase.ts
```

### Fase 12 — Onboarding
```
Creados:   OnboardingWizard.tsx
           EmptyState.tsx
Editados:  dashboard/page.tsx
```

### Fase 13 — Reportes
```
Creados:   DateRangePicker.tsx
Editados:  reports/page.tsx, PeriodReport.tsx, transactions/page.tsx
```

### Fase 14 — Categorías
```
Creados:   SuggestCategoryUseCase.ts
Editados:  firestore.ts, Category.ts, CategoryMapper.ts, FirestoreCategoryRepository.ts,
           budgets/page.tsx, defaultCategories.ts, QuickExpenseForm.tsx, TransactionForm.tsx, DIContainer.ts
```

### Fase 15 — Release
```
Editados:  firestore.rules, Sidebar.tsx, package.json, config.ts, README.md, DEPLOYMENT.md
```

---

## RESUMEN TOTAL

| Métrica | Valor |
|---------|-------|
| Fases totales | 15 |
| Archivos nuevos estimados | ~30 |
| Archivos editados estimados | ~35 |
| Use Cases nuevos | 6 |
| Widgets nuevos | 7 |
| Gráficos nuevos | 4-5 |
| Páginas nuevas | 4 (/recurring, /savings, /notifications, /settings) |
| Componentes compartidos nuevos | 5 (ThemeToggle, Sparkline, EmptyState, DateRangePicker, PeriodStatusBanner) |
| Tags totales | 15 (v0.7.0 → v1.0.0) |

---

## NOTAS FINALES

1. **Cada fase es independiente y se puede ejecutar sin completar las anteriores**, salvo que se indique lo contrario. Las fases 01-05 son bloqueantes entre sí. Las fases 06-14 son paralelas.

2. **El flujo existente NO se modifica**. Todo lo que está en este plan es aditivo o mejora de lo existente respetando las interfaces actuales.

3. **La columna booleana para tipo de transacción** ya existe como `type: TransactionType` con valores `'INCOME' | 'EXPENSE'`. Es el enfoque correcto. Los montos se almacenan siempre como positivos en Firestore y el sistema usa `type` para determinar si suma o resta. Esto ya está implementado y funciona. No se cambia.

4. **Los valores absolutos en UI** ya están parcialmente implementados con `MoneyDisplay` y `formatCurrencyAbsolute`. Las mejoras de este plan extienden esa lógica a los nuevos widgets y gráficos.

5. **El flujo continuo con ventanas de período** es la recomendación implementada. Las transacciones siempre se registran. Los períodos son observadores, no puertas.
