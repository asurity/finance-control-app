# TODO_AJUSTES.md — Plan de Ajustes del Sistema Financiero

> **Fecha**: 29 de marzo de 2026  
> **Objetivo**: Alinear el sistema al flujo completo requerido por el usuario, respetando Clean Architecture, DRY, desacoplamiento, escalabilidad y mantenibilidad.  
> **Versionado**: Cada fase genera un commit y un tag semántico.

---

## Principios Rectores

| Principio | Aplicación |
|---|---|
| **Clean Architecture** | Cambios fluyen Domain → Application → Infrastructure → Presentation. Nunca al revés. |
| **DRY** | Toda lógica de formato de moneda centralizada en `lib/utils/format.ts`. Componente `<MoneyDisplay>` reutilizable. No duplicar lógica de color/signo en cada página. |
| **Desacoplamiento** | Use Cases no dependen de UI. Repositorios no dependen de use cases. Hooks son adaptadores entre use cases y componentes. |
| **Escalabilidad** | BudgetPeriod + CategoryBudget como sistema base permite agregar períodos sin límite. Componente MoneyDisplay permite cambiar reglas de color en un solo lugar. |
| **Mantenibilidad** | Cada fase es independiente y testeable. Checklist atómico por archivo/cambio. |

---

## COMMIT INICIAL (Antes de cualquier cambio)

- [x] **Commit base**: Hacer commit de todo el estado actual del proyecto
  - Mensaje: `chore: snapshot pre-ajustes del sistema financiero`
  - Tag: `v0.1.0-pre-ajustes`
  - Comando:
    ```bash
    git add -A
    git commit -m "chore: snapshot pre-ajustes del sistema financiero"
    git tag v0.1.0-pre-ajustes
    ```

---

## FASE 1 — Conectar BudgetPeriod + CategoryBudget a la UI

> **Tag**: `v0.2.0-budget-periods`  
> **Objetivo**: Reemplazar el sistema de presupuestos viejo (`Budget`) por el correcto (`BudgetPeriod` + `CategoryBudget`) en la página de presupuestos.  
> **Capas afectadas**: Presentation (principal), Application (validaciones menores)

### 1.1 — Verificar y completar capa de Dominio (si falta algo)

- [x] **Verificar** `src/domain/entities/BudgetPeriod.ts`
  - Confirmar que tiene: `id`, `totalAmount`, `startDate`, `endDate`, `userId`, `organizationId`, `name`, `description`, `createdAt`, `updatedAt`
  - Confirmar métodos: `isActive()`, `hasExpired()`, `getRemainingDays()`, `getProgressPercentage()`
  - No se espera que haya cambios. Si los hay, documentar.

- [x] **Verificar** `src/domain/entities/CategoryBudget.ts`
  - Confirmar que tiene: `id`, `budgetPeriodId`, `categoryId`, `percentage`, `allocatedAmount`, `spentAmount`, `userId`, `organizationId`
  - Confirmar métodos: `getRemainingAmount()`, `getUsagePercentage()`, `isExceeded()`, `isApproachingLimit()`
  - No se espera que haya cambios. Si los hay, documentar.

### 1.2 — Verificar capa de Infrastructure (repositorios y mappers)

- [x] **Verificar** `src/infrastructure/repositories/FirestoreBudgetPeriodRepository.ts`
  - Confirmar CRUD completo + `getByUserId`, `getActiveByUserId`, `getCurrentByUserId`
  - Confirmar que usa la subcollection `organizations/{orgId}/budgetPeriods`

- [x] **Verificar** `src/infrastructure/repositories/FirestoreCategoryBudgetRepository.ts`
  - Confirmar CRUD completo + `getByBudgetPeriodId`, `getByBudgetPeriodAndCategory`, `updateSpentAmount`
  - Confirmar que usa la subcollection `organizations/{orgId}/categoryBudgets`

- [x] **Verificar** `src/infrastructure/mappers/BudgetPeriodMapper.ts`
  - Confirmar `toDomain()`, `toFirestore()`, `toFirestoreUpdate()`

- [x] **Verificar** `src/infrastructure/mappers/CategoryBudgetMapper.ts`
  - Confirmar `toDomain()`, `toFirestore()`, `toFirestoreUpdate()`

### 1.3 — Verificar capa de Application (hooks y DTOs)

- [x] **Verificar** `src/application/hooks/useBudgetPeriods.ts`
  - Confirmar queries: `useBudgetPeriodsByUser`, `useActiveBudgetPeriods`, `useCurrentBudgetPeriod`
  - Confirmar mutations: `createBudgetPeriod`, `updateBudgetPeriod`, `deleteBudgetPeriod`

- [x] **Verificar** `src/application/hooks/useCategoryBudgets.ts`
  - Confirmar queries: `useCategoryBudgetsByPeriod`, `useBudgetPeriodSummary`
  - Confirmar mutations: `setCategoryBudget`, `updateCategoryBudgetPercentage`, `deleteCategoryBudget`

- [x] **Verificar** DTOs en `src/application/dto/`
  - Confirmar existencia de: `BudgetPeriodDTO.ts`, `CategoryBudgetDTO.ts`
  - Confirmar tipos: `CreateBudgetPeriodDTO`, `UpdateBudgetPeriodDTO`, `SetCategoryBudgetDTO`, etc.

### 1.4 — Refactorizar la página de Presupuestos (capa Presentation)

- [x] **Refactorizar** `src/app/(dashboard)/budgets/page.tsx`
  - Eliminar todas las importaciones y uso de `useBudgets` (sistema viejo)
  - Importar `useBudgetPeriods` y `useCategoryBudgets`
  - Estructura de la página en DOS secciones principales:

  **Sección A — Gestión de Período de Presupuesto**:
  - [x] Formulario para crear nuevo BudgetPeriod: nombre (opcional), monto total, fecha inicio, fecha fin
  - [x] Lista de períodos existentes (activos, futuros, expirados) con badges de estado
  - [x] Poder seleccionar un período para ver/editar sus categorías
  - [x] Poder eliminar períodos que no tengan transacciones asociadas

  **Sección B — Asignación de Categorías por Porcentaje**:
  - [x] Solo visible cuando hay un BudgetPeriod seleccionado
  - [x] Tabla con todas las categorías de tipo EXPENSE
  - [x] Columnas: Categoría | % Asignado | Monto Calculado | Gastado | Restante | Estado
  - [x] Input de porcentaje por categoría → al cambiar, recalcular monto asignado
  - [x] Progress bar de porcentaje total asignado (debe sumar <= 100%)
  - [x] Botón "Guardar asignaciones" → crea/actualiza `CategoryBudget` para cada categoría
  - [x] Botón para agregar nueva categoría de gasto (reusar dialog existente)

  **Sección C — Resumen del Período Activo**:
  - [x] Card resumen: Presupuesto total | Asignado | Gastado | Disponible
  - [x] Progress bar general del período
  - [x] Días restantes del período
  - [x] Alertas si alguna categoría supera el 80% o 100%

- [x] **Crear componente** `src/presentation/components/features/budgets/BudgetPeriodSelector.tsx`
  - Props: `periods: BudgetPeriod[]`, `selectedId: string`, `onSelect: (id) => void`
  - Dropdown o lista de períodos con estados visuales

- [x] **Crear componente** `src/presentation/components/features/budgets/CategoryAllocationTable.tsx`
  - Props: `budgetPeriodId`, `totalAmount`, `categories`, `categoryBudgets`, `onSave`
  - Tabla editable de porcentajes con cálculo automático de montos
  - Validación: suma de porcentajes <= 100%

- [x] **Crear componente** `src/presentation/components/features/budgets/BudgetPeriodSummaryCard.tsx`
  - Props: `budgetPeriod`, `categoryBudgets`, `summary`
  - Card con métricas consolidadas del período

### 1.5 — Vincular transacciones con BudgetPeriod

- [x] **Verificar** `src/domain/use-cases/transactions/CreateTransactionUseCase.ts`
  - Confirmar que al crear una transacción EXPENSE, actualiza el `spentAmount` del `CategoryBudget` correspondiente al período activo
  - Si no lo hace: agregar lógica para buscar el `BudgetPeriod` activo del usuario, encontrar el `CategoryBudget` de esa categoría, e incrementar `spentAmount`
  - **Respetar desacoplamiento**: la actualización de budget es un efecto secundario, no debe fallar la transacción si falla el budget update

- [x] **Verificar** `src/domain/use-cases/transactions/DeleteTransactionUseCase.ts`
  - Confirmar que al eliminar una transacción EXPENSE, decrementa el `spentAmount` del `CategoryBudget` correspondiente
  - Si no lo hace: agregar lógica inversa

### 1.6 — Tests

- [x] Verificar que los tests existentes de `BudgetPeriod` y `CategoryBudget` entities pasan
- [x] Verificar que no hay tests rotos por la refactorización de la página de presupuestos

### 1.7 — Commit de Fase 1

- [x] Commit y tag:
  ```bash
  git add -A
  git commit -m "feat: conectar BudgetPeriod y CategoryBudget a la UI de presupuestos

  - Refactorizar budgets/page.tsx para usar BudgetPeriod + CategoryBudget
  - Crear componentes BudgetPeriodSelector, CategoryAllocationTable, BudgetPeriodSummaryCard
  - Verificar vinculación de transacciones con CategoryBudget activo
  - Eliminar dependencia del sistema Budget viejo en la página"
  git tag v0.2.0-budget-periods
  ```

---

## FASE 2 — Valores Absolutos + Colores Consistentes

> **Tag**: `v0.3.0-money-display`  
> **Objetivo**: Centralizar la lógica de display de montos con valores absolutos, colores verde/rojo, y signos solo para balance neto.  
> **Capas afectadas**: Lib (utilidades), Presentation (componentes compartidos y páginas)

### 2.1 — Crear utilidades centralizadas de formato (DRY)

- [x] **Editar** `src/lib/utils/format.ts` — Agregar funciones:
  ```typescript
  /**
   * Formatea un monto SIEMPRE como valor absoluto (positivo).
   * Uso: display de gastos e ingresos individuales.
   */
  export function formatCurrencyAbsolute(amount: number): string

  /**
   * Formatea un monto con signo explícito (+$X o -$X).
   * Uso: balance neto, ahorro, diferencias.
   */
  export function formatCurrencyWithSign(amount: number): string
  ```

- [x] **Editar** `src/lib/utils/index.ts` — Re-exportar las nuevas funciones:
  - Agregar `formatCurrencyAbsolute` y `formatCurrencyWithSign` al export

### 2.2 — Crear componente compartido MoneyDisplay (DRY + Reutilización)

- [x] **Crear** `src/presentation/components/shared/MoneyDisplay.tsx`
  - Props:
    ```typescript
    interface MoneyDisplayProps {
      amount: number;
      type: 'income' | 'expense' | 'balance' | 'neutral';
      showSign?: boolean;      // default: false para income/expense, true para balance
      className?: string;
      size?: 'sm' | 'md' | 'lg' | 'xl';  // controla text-sm, text-base, text-2xl, etc.
    }
    ```
  - Reglas de display:
    - `type='income'` → color verde, valor absoluto, sin signo (salvo `showSign=true`)
    - `type='expense'` → color rojo, valor absoluto, sin signo (salvo `showSign=true`)
    - `type='balance'` → color verde si ≥ 0, rojo si < 0, SIEMPRE con signo (+/-)
    - `type='neutral'` → color por defecto (foreground), valor tal cual
  - Usar `formatCurrencyAbsolute` para income/expense
  - Usar `formatCurrencyWithSign` para balance
  - Usar `formatCurrency` para neutral
  - Clases de color consistentes: `text-green-600 dark:text-green-400` / `text-red-600 dark:text-red-400`

### 2.3 — Actualizar KPICard para soportar color de valor

- [x] **Editar** `src/presentation/components/shared/Cards/KPICard.tsx`
  - Agregar prop opcional `valueClassName?: string` a `KPICardProps`
  - Aplicar la clase al `<div className="text-2xl font-bold">` que muestra el value
  - Esto permite que cada KPI tenga color independiente en su valor sin romper la interfaz existente

### 2.4 — Aplicar MoneyDisplay en TransactionList

- [x] **Editar** `src/presentation/components/features/transactions/TransactionList.tsx`
  - Reemplazar el bloque de display de monto (líneas ~141-151) por:
    ```tsx
    <MoneyDisplay
      amount={transaction.amount}
      type={transaction.type === 'INCOME' ? 'income' : 'expense'}
      showSign
      size="sm"
    />
    ```
  - Eliminar el `cn()` manual y el `formatCurrency` directo para el monto

### 2.5 — Aplicar MoneyDisplay en RecentTransactionsWidget

- [x] **Editar** `src/presentation/components/features/dashboard/widgets/RecentTransactionsWidget.tsx`
  - Reemplazar el bloque de display de monto (línea ~78) por `<MoneyDisplay>`
  - Eliminar la lógica manual de `+/-` y clases de color

### 2.6 — Aplicar MoneyDisplay en AccountsSummaryWidget

- [x] **Editar** `src/presentation/components/features/dashboard/widgets/AccountsSummaryWidget.tsx`
  - **Balance total** en CardDescription: usar `<MoneyDisplay type="balance">` para colorear
  - **Balance por cuenta** (línea ~96): usar `<MoneyDisplay type="balance">` para que cuentas positivas sean verdes y negativas sean rojas

### 2.7 — Aplicar en BalanceChart tooltip

- [x] **Editar** `src/presentation/components/features/dashboard/charts/BalanceChart.tsx`
  - En el `CustomTooltip`, reemplazar `formatCurrency(data.income)` por `formatCurrencyAbsolute(data.income)`
  - Reemplazar `formatCurrency(data.expenses)` por `formatCurrencyAbsolute(data.expenses)`
  - El balance se mantiene con `formatCurrency` (puede ser negativo legítimamente en el gráfico)

### 2.8 — Aplicar en Dashboard page (KPIs)

- [x] **Editar** `src/app/(dashboard)/dashboard/page.tsx`
  - KPI "Balance Total": agregar `valueClassName` con color condicional según `stats.currentBalance >= 0`
  - KPI "Ingresos del Período": agregar `valueClassName="text-green-600 dark:text-green-400"`
  - KPI "Gastos del Período": agregar `valueClassName="text-red-600 dark:text-red-400"` y usar `formatCurrencyAbsolute`
  - KPI "Categoría Top": agregar `valueClassName="text-red-600 dark:text-red-400"` (siempre es un gasto)

### 2.9 — Aplicar en Reports page

- [x] **Editar** `src/app/(dashboard)/reports/page.tsx`
  - **Summary Cards**:
    - Ingresos: ya tiene verde — verificar que usa `formatCurrencyAbsolute`
    - Gastos: ya tiene rojo — verificar que usa `formatCurrencyAbsolute`
    - Balance Neto: usar `<MoneyDisplay type="balance" size="xl">` con signo explícito
    - Tasa de Ahorro: sin cambio (es porcentaje)
  - **Tabla de transacciones del período** (líneas ~529-537):
    - Reemplazar lógica manual de color/signo por `<MoneyDisplay>`
  - **Gastos por categoría**: verificar que montos se muestran como absolutos (ya deberían ser positivos)
  - **Budget vs Actual**: verificar que "Gastado" y "Presupuesto" se muestran como absolutos
  - **"Excedido por"**: ya usa `Math.abs()` — confirmar que sigue funcionando

### 2.10 — Aplicar en Accounts page

- [x] **Editar** `src/app/(dashboard)/accounts/page.tsx`
  - **Balance total** en CardDescription (línea ~367): usar `<MoneyDisplay type="balance">`
  - **Saldo por cuenta** en la tabla (línea ~413): usar `<MoneyDisplay type="balance">` para que se vea verde/rojo según saldo

### 2.11 — Aplicar en ExpensesByCategoryChart

- [x] **Editar** `src/presentation/components/features/dashboard/charts/ExpensesByCategoryChart.tsx`
  - Tooltip: reemplazar `formatCurrency(data.value)` por `formatCurrencyAbsolute(data.value)` (gastos siempre positivos)
  - CardDescription: reemplazar `formatCurrency(totalExpenses)` por `formatCurrencyAbsolute(totalExpenses)`
  - Top Categories list: reemplazar `formatCurrency(cat.amount)` por `formatCurrencyAbsolute(cat.amount)`

### 2.12 — Commit de Fase 2

- [x] Commit y tag:
  ```bash
  git add -A
  git commit -m "feat: sistema de display de montos con valores absolutos y colores

  - Crear formatCurrencyAbsolute y formatCurrencyWithSign en lib/utils/format.ts
  - Crear componente compartido MoneyDisplay con reglas de color centralizadas
  - Agregar valueClassName a KPICard
  - Aplicar MoneyDisplay en: TransactionList, RecentTransactionsWidget,
    AccountsSummaryWidget, BalanceChart, Dashboard KPIs, Reports, Accounts,
    ExpensesByCategoryChart
  - Gastos siempre en rojo y positivos, ingresos en verde y positivos
  - Balance neto con signo explícito y color condicional"
  git tag v0.3.0-money-display
  ```

---

## FASE 3 — KPI de Balance Neto del Período en Dashboard

> **Tag**: `v0.4.0-balance-kpi`  
> **Objetivo**: Agregar la "línea de balance" que muestra el estado real del período (Ingresos - Gastos) con signo y color.  
> **Capas afectadas**: Presentation (dashboard page)

### 3.1 — Verificar datos disponibles

- [x] **Verificar** que `GetDashboardStatisticsUseCase` ya retorna `totalIncome` y `totalExpenses`
  - El balance neto se calcula como: `totalIncome - totalExpenses`
  - No se necesitan cambios en el use case — el cálculo es de presentación

### 3.2 — Agregar KPI de Balance Neto en Dashboard

- [x] **Editar** `src/app/(dashboard)/dashboard/page.tsx`
  - Agregar una fila destacada **antes** de los KPIs actuales, con un solo card ancho (`md:col-span-2 lg:col-span-4`):
    ```
    ┌─────────────────────────────────────────────────────────────┐
    │  Balance del Período                                        │
    │  +$300.000  (o -$50.000)                                   │
    │  Verde si positivo / Rojo si negativo                      │
    │  "Diferencia entre ingresos y gastos del período actual"   │
    └─────────────────────────────────────────────────────────────┘
    ```
  - Usar `<MoneyDisplay type="balance" size="xl">` para el valor
  - Calcular: `const periodBalance = (stats?.totalIncome || 0) - (stats?.totalExpenses || 0)`
  - Mostrar descripción contextual: "Estás ahorrando" si positivo, "Estás gastando más de lo que ganas" si negativo
  - Incluir el desglose debajo: `Ingresos: $X · Gastos: $X` en texto pequeño

### 3.3 — Commit de Fase 3

- [x] Commit y tag:
  ```bash
  git add -A
  git commit -m "feat: agregar KPI de Balance Neto del Período en dashboard

  - Nuevo card destacado con balance ingresos - gastos
  - Usa MoneyDisplay con signo explícito y color condicional
  - Descripción contextual según estado positivo/negativo"
  git tag v0.4.0-balance-kpi
  ```

---

## FASE 4 — Mejoras en Gestión de Cuentas

> **Tag**: `v0.5.0-account-improvements`  
> **Objetivo**: Completar la gestión de cuentas con validación de crédito disponible y display mejorado.  
> **Capas afectadas**: Domain (validación), Infrastructure (actualización), Presentation (display)

### 4.1 — Actualizar crédito disponible al crear transacciones (Domain + Infrastructure)

- [x] **Editar** `src/domain/use-cases/transactions/CreateTransactionUseCase.ts`
  - Al procesar una transacción EXPENSE en cuenta tipo CREDIT_CARD o LINE_OF_CREDIT:
    - Validar que `amount <= availableCredit` (o `amount <= creditLimit - balance` si `availableCredit` no está sincronizado)
    - Actualizar `availableCredit = creditLimit - newBalance` en la cuenta
  - Al procesar una transacción INCOME (pago de tarjeta):
    - Recalcular `availableCredit` después del pago

- [x] **Editar** `src/domain/entities/Account.ts`
  - Agregar método `getAvailableCredit(): number` que calcula `creditLimit - balance` para cuentas de crédito
  - Agregar método `hasAvailableCredit(amount: number): boolean`

### 4.2 — Mejorar display de cuentas (Presentation)

- [x] **Editar** `src/app/(dashboard)/accounts/page.tsx`
  - Agregar columna "Crédito Disponible" en la tabla, visible solo para CREDIT_CARD y LINE_OF_CREDIT
  - Mostrar con `<MoneyDisplay>`:
    - Crédito disponible: verde si > 30% del límite, amarillo si 10-30%, rojo si < 10%
  - Agregar columna "Límite" para cuentas de crédito

- [x] **Editar** `src/presentation/components/features/dashboard/widgets/AccountsSummaryWidget.tsx`
  - Para cuentas de crédito, mostrar "Usado: $X / Límite: $X" en lugar de solo el balance
  - Agregar progress bar de uso de crédito

### 4.3 — Commit de Fase 4

- [x] Commit y tag:
  ```bash
  git add -A
  git commit -m "feat: mejoras en gestión de cuentas y validación de crédito

  - Validar crédito disponible al crear transacciones con tarjeta
  - Actualizar availableCredit automáticamente
  - Mostrar crédito disponible y límite en tabla de cuentas
  - Mejorar AccountsSummaryWidget para cuentas de crédito"
  git tag v0.5.0-account-improvements
  ```

---

## FASE 5 — Reporte de Fin de Período

> **Tag**: `v0.6.0-period-reports`  
> **Objetivo**: Vincular los reportes con el sistema de BudgetPeriod para comparar presupuestado vs ejecutado.  
> **Capas afectadas**: Application (nuevo hook/query), Presentation (nueva sección en reportes)

### 5.1 — Crear query de reporte por período (Application)

- [x] **Crear** `src/presentation/components/features/reports/PeriodReport.tsx`
  - Props: `orgId`, `userId`, `budgetPeriodId`
  - Usa `useCategoryBudgets.useBudgetPeriodSummary(budgetPeriodId)` para obtener resumen
  - Usa transacciones filtradas por el rango de fechas del período

### 5.2 — Agregar sección en Reports page (Presentation)

- [x] **Editar** `src/app/(dashboard)/reports/page.tsx`
  - Agregar modo "Reporte por Período de Presupuesto":
    - Selector de BudgetPeriod (dropdown con períodos del usuario)
    - Al seleccionar un período, mostrar:

  **Card resumen del período**:
  - [x] Presupuesto total del período
  - [x] Total ejecutado (gastado)
  - [x] Balance: `Presupuesto - Gastado` con `<MoneyDisplay type="balance">`
  - [x] Ingresos del período
  - [x] Balance real: `Ingresos - Gastos` con `<MoneyDisplay type="balance">`

  **Tabla presupuesto vs real por categoría**:
  - [x] Columnas: Categoría | % Asignado | Presupuestado | Gastado | Diferencia | Estado
  - [x] Gastado usa `<MoneyDisplay type="expense">`
  - [x] Diferencia usa `<MoneyDisplay type="balance">`
  - [x] Estado: badge verde/amarillo/rojo según % de uso
  - [x] Progress bar por categoría

  **Exportar**:
  - [x] Botón para exportar CSV del reporte del período (reusar lógica existente de `handleExportCSV`)

### 5.3 — Commit de Fase 5

- [x] Commit y tag:
  ```bash
  git add -A
  git commit -m "feat: reporte de fin de período vinculado a BudgetPeriod

  - Crear componente PeriodReport para reporte por período de presupuesto
  - Agregar selector de BudgetPeriod en Reports page
  - Tabla comparativa presupuestado vs ejecutado por categoría
  - Exportar CSV del reporte del período"
  git tag v0.6.0-period-reports
  ```

---

## RESUMEN DE TAGS Y VERSIONES

| Tag | Descripción |
|---|---|
| `v0.1.0-pre-ajustes` | Snapshot antes de cualquier cambio |
| `v0.2.0-budget-periods` | BudgetPeriod + CategoryBudget conectados a UI |
| `v0.3.0-money-display` | Sistema de display con valores absolutos y colores |
| `v0.4.0-balance-kpi` | KPI de Balance Neto del Período en dashboard |
| `v0.5.0-account-improvements` | Mejoras en gestión de cuentas y crédito |
| `v0.6.0-period-reports` | Reportes vinculados a períodos de presupuesto |

---

## MAPA DE DEPENDENCIAS ENTRE FASES

```
FASE 1 (BudgetPeriod UI)
  │
  ├──► FASE 2 (MoneyDisplay) ──► FASE 3 (Balance KPI)
  │
  └──► FASE 5 (Period Reports) ← depende de Fase 1 + 2
  
FASE 4 (Cuentas) ← independiente, puede hacerse en paralelo con Fase 3 o 5
```

- **Fase 1** es bloqueante para Fase 5 (reportes necesitan BudgetPeriod)
- **Fase 2** es bloqueante para Fase 3 (Balance KPI usa MoneyDisplay)
- **Fase 4** es independiente y puede ejecutarse en cualquier momento después de Fase 2

---

## ARCHIVOS NUEVOS A CREAR (Total: 4)

| Archivo | Fase |
|---|---|
| `src/presentation/components/features/budgets/BudgetPeriodSelector.tsx` | 1 |
| `src/presentation/components/features/budgets/CategoryAllocationTable.tsx` | 1 |
| `src/presentation/components/features/budgets/BudgetPeriodSummaryCard.tsx` | 1 |
| `src/presentation/components/shared/MoneyDisplay.tsx` | 2 |
| `src/presentation/components/features/reports/PeriodReport.tsx` | 5 |

## ARCHIVOS EXISTENTES A MODIFICAR (Total: ~14)

| Archivo | Fase | Tipo de cambio |
|---|---|---|
| `src/lib/utils/format.ts` | 2 | Agregar 2 funciones |
| `src/lib/utils/index.ts` | 2 | Agregar 2 re-exports |
| `src/app/(dashboard)/budgets/page.tsx` | 1 | Refactorización completa |
| `src/app/(dashboard)/dashboard/page.tsx` | 2, 3 | Colores KPIs + nuevo KPI balance |
| `src/app/(dashboard)/reports/page.tsx` | 2, 5 | Colores + sección período |
| `src/app/(dashboard)/accounts/page.tsx` | 2, 4 | Colores + columnas crédito |
| `src/presentation/components/shared/Cards/KPICard.tsx` | 2 | Agregar prop `valueClassName` |
| `src/presentation/components/features/transactions/TransactionList.tsx` | 2 | Usar MoneyDisplay |
| `src/presentation/components/features/dashboard/widgets/RecentTransactionsWidget.tsx` | 2 | Usar MoneyDisplay |
| `src/presentation/components/features/dashboard/widgets/AccountsSummaryWidget.tsx` | 2, 4 | MoneyDisplay + crédito |
| `src/presentation/components/features/dashboard/charts/BalanceChart.tsx` | 2 | formatCurrencyAbsolute en tooltip |
| `src/presentation/components/features/dashboard/charts/ExpensesByCategoryChart.tsx` | 2 | formatCurrencyAbsolute |
| `src/domain/use-cases/transactions/CreateTransactionUseCase.ts` | 1, 4 | Vincular budget + validar crédito |
| `src/domain/entities/Account.ts` | 4 | Métodos de crédito disponible |
