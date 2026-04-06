# TODO_MOVILES.md — Plan de Optimización para Vista Móvil

> **Fecha**: 1 de abril de 2026
> **Objetivo**: Optimizar todas las vistas de la aplicación financiera para dispositivos móviles sin alterar flujos de negocio, cálculos ni lógica existente. Solo cambios en la **capa de presentación**.
> **Alcance**: Exclusivamente visual/responsivo. Cero impacto en Domain, Application e Infrastructure (excepto hooks de UI).

---

## Principios Rectores

| Principio | Aplicación en este plan |
|---|---|
| **Clean Architecture** | Todos los cambios viven en `src/presentation/` y `src/components/`. No se toca Domain, Application ni Infrastructure. Los componentes responsivos nuevos son **puramente presentacionales**. |
| **DRY** | Se crean componentes compartidos reutilizables (`ResponsiveTable`, `useResponsive`) que se consumen desde cualquier página. No se duplica lógica de detección de breakpoint ni de renderizado condicional. |
| **Pipelines** | Los datos siguen el mismo flujo: Hook → Componente. Solo cambia **cómo se renderizan**, no cómo se obtienen ni transforman. |
| **Escalabilidad** | Los componentes responsivos aceptan configuración por props (columnas visibles, layout, breakpoints). Agregar nuevas tablas o vistas móviles requiere solo configuración, no código nuevo. |
| **Mantenibilidad** | Cada fase es independiente y atómica. Un commit por fase permite rollback granular. Componentes nuevos tienen responsabilidad única. |
| **Desacoplamiento** | Los componentes de presentación no conocen la fuente de datos. `ResponsiveTable` recibe datos genéricos tipados, no entidades de dominio directamente. |

---

## Infraestructura Existente (No modificar)

| Recurso | Ubicación | Rol |
|---|---|---|
| `useMediaQuery` | `src/hooks/useMediaQuery.ts` | Detecta media queries CSS, ya usado en `QuickTransactionModal` |
| `useMediaQuery` export | `src/hooks/index.ts` | Re-exportado y disponible globalmente |
| Sidebar móvil | `src/components/layout/Sidebar.tsx` | Sheet drawer con `lg:hidden` — funciona correctamente |
| FAB | `src/components/layout/GlobalTransactionFAB.tsx` | Bottom sheet `lg:hidden` — funciona correctamente |
| MoneyDisplay | `src/presentation/components/shared/MoneyDisplay.tsx` | Escalado responsivo por tamaño — funciona correctamente |
| KPICard | `src/presentation/components/shared/Cards/KPICard.tsx` | Padding/fuentes responsivos — funciona correctamente |

---

## COMMIT INICIAL (Antes de cualquier cambio)

- [ ] **Commit base**: Snapshot del estado actual antes de optimización móvil
  - Mensaje: `chore: snapshot pre-optimización móvil`
  - Tag: `v-mobile-0.0`
  - Comando:
    ```bash
    git add -A
    git commit -m "chore: snapshot pre-optimización móvil"
    git tag v-mobile-0.0
    ```

---

## FASE 1 — Componentes Responsivos Compartidos

> **Tag**: `v-mobile-1.0`
> **Objetivo**: Crear los building blocks reutilizables que consumirán todas las fases posteriores.
> **Capa afectada**: Presentation (`src/presentation/components/shared/`)
> **Principios clave**: DRY, Escalabilidad, Desacoplamiento

### 1.1 — Hook `useResponsive`

- [ ] **Crear** `src/hooks/useResponsive.ts`
  - Wrapper sobre `useMediaQuery` que expone breakpoints nombrados
  - API:
    ```ts
    const { isMobile, isTablet, isDesktop } = useResponsive();
    // isMobile:  max-width: 639px  (< sm)
    // isTablet:  640px - 1023px    (sm - lg)
    // isDesktop: >= 1024px         (lg+)
    ```
  - Reutiliza `useMediaQuery` internamente (DRY)
  - **No lógica de negocio**, solo detección de viewport
  - Exportar desde `src/hooks/index.ts`

### 1.2 — Componente `ResponsiveTable`

- [ ] **Crear** `src/presentation/components/shared/DataTable/ResponsiveTable.tsx`
  - Componente genérico tipado que renderiza:
    - **Móvil** (`< sm`): Vista tipo card/list con datos apilados verticalmente
    - **Tablet+ / Desktop** (`≥ sm`): Tabla estándar con `<Table>` de shadcn
  - Props tipados:
    ```ts
    interface ResponsiveTableProps<T> {
      data: T[];
      columns: ColumnDef<T>[];          // Columnas para vista tabla
      mobileCard: (item: T) => ReactNode; // Render function para card móvil
      keyExtractor: (item: T) => string;
      emptyMessage?: string;
    }
    ```
  - Usa `useResponsive()` para decidir el layout
  - Wrap de `overflow-x-auto` en tabla con indicador visual de scroll
  - **Desacoplado**: No conoce entidades de dominio, recibe datos genéricos `<T>`

### 1.3 — Componente `MobileCard`

- [ ] **Crear** `src/presentation/components/shared/DataTable/MobileCard.tsx`
  - Card base reutilizable para la vista móvil de tablas
  - Layout: Header (título + badge) → Body (pares clave-valor) → Footer (acciones)
  - Props:
    ```ts
    interface MobileCardProps {
      title: string;
      subtitle?: string;
      badge?: { label: string; variant: string };
      fields: { label: string; value: ReactNode }[];
      actions?: ReactNode;
    }
    ```
  - Usa componentes `Card` de shadcn existentes
  - Touch targets mínimos de 44px en acciones

### 1.4 — Componente `ResponsiveChart`

- [ ] **Crear** `src/presentation/components/shared/Charts/ResponsiveChart.tsx`
  - Wrapper que ajusta dimensiones de recharts según viewport
  - Props:
    ```ts
    interface ResponsiveChartProps {
      children: ReactNode;
      mobileHeight?: number;   // default: 220
      desktopHeight?: number;  // default: 300
      className?: string;
    }
    ```
  - Usa `useResponsive()` para seleccionar altura
  - Encapsula `ResponsiveContainer` de recharts

### 1.5 — Exportar nuevos componentes

- [ ] **Crear** `src/presentation/components/shared/DataTable/index.ts`
  - Exportar `ResponsiveTable` y `MobileCard`
- [ ] **Crear** `src/presentation/components/shared/Charts/index.ts`
  - Exportar `ResponsiveChart`
- [ ] **Actualizar** `src/hooks/index.ts` — agregar export de `useResponsive`

### Commit Fase 1

- [ ] Commit:
  ```bash
  git add -A
  git commit -m "feat(mobile): crear componentes responsivos compartidos - ResponsiveTable, MobileCard, ResponsiveChart, useResponsive"
  git tag v-mobile-1.0
  ```

---

## FASE 2 — Fix de Desbordamientos Críticos

> **Tag**: `v-mobile-2.0`
> **Objetivo**: Corregir los 3 problemas que hacen la app inutilizable en móvil.
> **Capa afectada**: Presentation
> **Principios clave**: Mantenibilidad (cambios quirúrgicos), Pipelines (no tocar datos)

### 2.1 — DateRangePicker: calendario responsivo

- [ ] **Modificar** `src/presentation/components/shared/DateRangePicker.tsx`
  - Importar `useResponsive` del hook creado en Fase 1
  - Cambiar `numberOfMonths={2}` → `numberOfMonths={isMobile ? 1 : 2}`
  - Layout del popover: cambiar `flex` horizontal → `flex flex-col sm:flex-row`
    - Presets arriba en móvil, a la izquierda en desktop
  - Popover width: agregar `max-w-[calc(100vw-2rem)]` para evitar desbordamiento

### 2.2 — Header: dropdown de notificaciones

- [ ] **Modificar** `src/components/layout/Header.tsx`
  - Dropdown notificaciones: `w-80` → `w-[calc(100vw-2rem)] sm:w-80`
  - Dropdown org selector: `w-56` → `w-[calc(100vw-2rem)] sm:w-56`
  - Ambos: agregar `max-h-[70vh] overflow-y-auto` para listas largas en móvil

### 2.3 — Header: acceso a QuickTransaction en móvil

- [ ] **Verificar** que `GlobalTransactionFAB` cubre la misma funcionalidad
  - Si cubre: dejar `hidden lg:block` como está (el FAB es el punto de acceso móvil)
  - Si NO cubre: agregar la opción faltante como item en el FAB
  - Documentar decisión en comentario del componente

### Commit Fase 2

- [ ] Commit:
  ```bash
  git add -A
  git commit -m "fix(mobile): corregir desbordamientos en DateRangePicker, dropdowns del Header"
  git tag v-mobile-2.0
  ```

---

## FASE 3 — Tablas Responsivas por Página

> **Tag**: `v-mobile-3.0`
> **Objetivo**: Reemplazar todas las tablas con `ResponsiveTable` + `MobileCard` para vista móvil.
> **Capa afectada**: Presentation (páginas del dashboard)
> **Principios clave**: DRY (reutilizar `ResponsiveTable`), Escalabilidad (configuración por props)

**Patrón común para todas las páginas:**
1. Importar `ResponsiveTable` y `MobileCard`
2. Definir la función `mobileCard` que renderiza los datos clave de cada fila
3. Reemplazar el bloque `<Table>...</Table>` por `<ResponsiveTable>`
4. **No alterar**: queries, hooks, filtros, cálculos, mutaciones

### 3.1 — Transacciones

- [ ] **Modificar** `src/presentation/components/features/transactions/TransactionList.tsx`
  - Vista card móvil: Fecha + Descripción (header) → Categoría + Cuenta (body) → Monto con color (destacado) → Acciones
  - Mantener el mismo handler de acciones (editar, eliminar)
  - Swipe-to-action es opcional (mejora futura)

### 3.2 — Cuentas (Assets)

- [ ] **Modificar** `src/app/(dashboard)/accounts/page.tsx`
  - Vista card: Nombre + Tipo (header) → Banco + Estado (body) → Saldo destacado (footer) → Menú acciones
  - 6 columnas → card compacta

### 3.3 — Cuentas (Deudas)

- [ ] **Modificar** `src/app/(dashboard)/accounts/page.tsx` (sección deudas)
  - Vista card: Nombre + Tipo (header) → Banco + Tarjeta + Estado (body) → Saldo/Deuda + Límite + Disponible (footer) → Acciones
  - 9 columnas → card con 3 valores monetarios en fila

### 3.4 — Metas de Ahorro

- [ ] **Modificar** `src/app/(dashboard)/savings/page.tsx`
  - Vista card: Nombre meta (header) → Barra progreso visual → Ahorrado / Objetivo (body) → Fecha límite + Estado badge → Acciones
  - Progress bar como elemento visual prominente en card

### 3.5 — Transacciones Recurrentes

- [ ] **Modificar** `src/app/(dashboard)/recurring/page.tsx`
  - Vista card: Descripción + Monto (header) → Frecuencia + Cuenta + Categoría (body) → Próxima fecha + Estado (footer) → Acciones
  - 8 columnas → card organizada en 3 secciones

### 3.6 — Presupuestos (CategoryAllocationTable)

- [ ] **Modificar** `src/presentation/components/features/budgets/CategoryAllocationTable.tsx`
  - Vista card: Categoría + Badge % (header) → Asignado + Gastado + Restante (body con MoneyDisplay) → Input de monto (si editable) → Acciones
  - Input `w-20` → `w-full` en card móvil para mejor touch target

### 3.7 — Reportes

- [ ] **Modificar** `src/app/(dashboard)/reports/page.tsx` (componente `PeriodReport` si contiene tabla)
  - Verificar `src/presentation/components/features/reports/PeriodReport.tsx`
  - Vista card: Fecha + Descripción (header) → Categoría + Cuenta (body) → Monto (footer)

### Commit Fase 3

- [ ] Commit:
  ```bash
  git add -A
  git commit -m "feat(mobile): implementar vista card responsiva en todas las tablas del dashboard"
  git tag v-mobile-3.0
  ```

---

## FASE 4 — Gráficas Responsivas

> **Tag**: `v-mobile-4.0`
> **Objetivo**: Adaptar todas las gráficas para renderizado óptimo en pantallas pequeñas.
> **Capa afectada**: Presentation (`src/presentation/components/features/dashboard/charts/` y `widgets/`)
> **Principios clave**: DRY (`ResponsiveChart` wrapper), Desacoplamiento (los charts no saben su contexto)

### 4.1 — Migrar charts al wrapper `ResponsiveChart`

Para cada chart, envolver el `<ResponsiveContainer>` actual con `<ResponsiveChart>`:

- [ ] **BalanceChart.tsx**
  - `height={300}` → `<ResponsiveChart mobileHeight={200} desktopHeight={300}>`
  - Reducir `margin.left` y `margin.right` en móvil (30→10, 20→5)

- [ ] **ExpensesByCategoryChart.tsx**
  - `height={300}` → `<ResponsiveChart mobileHeight={220} desktopHeight={300}>`
  - `outerRadius={100}` → `outerRadius={isMobile ? 65 : 100}`
  - Labels de pie: ocultar `label` en móvil (solo tooltip), mostrar en desktop

- [ ] **BudgetVsActualChart.tsx**
  - `margin.left={80}` → `margin.left={isMobile ? 30 : 80}`
  - Abreviar labels del eje Y en móvil (truncar a 10 chars)
  - `height={Math.max(300, ...)}` → `mobileHeight={Math.max(220, ...)}` 

- [ ] **WeeklyPatternChart.tsx**
  - `height={250}` → `<ResponsiveChart mobileHeight={180} desktopHeight={250}>`
  - Tick labels del eje X: abreviar días en móvil ("Lun" → "L")

- [ ] **PeriodBalanceChart.tsx**
  - Verificar dimensiones actuales y aplicar `ResponsiveChart`

- [ ] **BudgetGauge.tsx**
  - Verificar dimensiones y aplicar si necesario

### 4.2 — Widgets con charts internos

- [ ] **TodayExpensesPieChart.tsx**
  - `height={140}` → `<ResponsiveChart mobileHeight={120} desktopHeight={140}>`
  - `outerRadius={55}` — mantener (ya es compacto)

- [ ] **DailyExpenseWidget.tsx**
  - Verificar que el pie chart interno escala correctamente

### 4.3 — Leyendas responsivas

- [ ] **Todas las gráficas**: en móvil, si hay más de 5 items en la leyenda:
  - Mostrar solo top 5 + "y X más"
  - O cambiar `layout="horizontal"` → `layout="vertical"` con scroll
  - Implementar como prop en `ResponsiveChart` si el patrón se repite

### Commit Fase 4

- [ ] Commit:
  ```bash
  git add -A
  git commit -m "feat(mobile): optimizar gráficas con ResponsiveChart y dimensiones adaptativas"
  git tag v-mobile-4.0
  ```

---

## FASE 5 — Ajustes Finos de Touch y Spacing

> **Tag**: `v-mobile-5.0`
> **Objetivo**: Mejorar la ergonomía táctil y el aprovechamiento del espacio en móvil.
> **Capa afectada**: Presentation + componentes UI base (mínimo)
> **Principios clave**: Mantenibilidad (cambios quirúrgicos en componentes base)

### 5.1 — Touch targets

- [ ] **Revisar** `src/components/ui/input.tsx`
  - Altura mínima: si `h-10` (40px), agregar clase `min-h-[44px]` solo en contexto móvil
  - Opción: crear variante `size="mobile"` o usar CSS `@media` en `globals.css`
  - **Decisión preferida**: media query en globals para no alterar API del componente:
    ```css
    @media (max-width: 639px) {
      input, select, textarea { min-height: 44px; }
    }
    ```

- [ ] **Revisar** `src/components/ui/table.tsx`
  - `TableCell` con `p-2`: agregar `p-3 sm:p-2` donde haya elementos interactivos
  - O aplicar via globals para celdas con botones

- [ ] **Revisar** `src/components/ui/button.tsx`
  - Verificar que variantes `sm` tienen al menos 36px de alto
  - Los icon buttons (`size="icon"`) deben ser mínimo `w-9 h-9` en móvil

### 5.2 — Anchos hardcodeados

- [ ] **Dashboard page.tsx** — Select `w-[160px] sm:w-[180px]` → `w-full sm:w-[180px]`
- [ ] **CategoryAllocationTable** — Input `w-20` → `w-full sm:w-20` en editable mode
- [ ] **CategoryAllocationTable** — `TableHead className="w-24"` para acciones → `w-auto sm:w-24`
- [ ] **AccountsSummaryWidget** — Progress `w-32` → `w-full sm:w-32` (si aplica)

### 5.3 — Diálogos y modales

- [ ] **Revisar** `src/components/ui/dialog.tsx`
  - Si usa `max-w-2xl` sin fallback, agregar `max-w-[calc(100vw-2rem)] sm:max-w-2xl`
  - Asegurar `overflow-y-auto max-h-[85vh]` en `DialogContent` para móvil
  - Verificar que el padding interno no sea excesivo en pantallas pequeñas

### 5.4 — Filtros colapsables en Transacciones

- [ ] **Modificar** `src/presentation/components/features/transactions/TransactionFilters.tsx`
  - En móvil: colapsar filtros avanzados bajo un botón "Filtros" con Collapsible/Accordion
  - Mostrar solo búsqueda rápida por defecto
  - Al expandir: stack vertical con inputs `w-full`
  - En desktop: mantener layout actual (sin cambios)

### Commit Fase 5

- [ ] Commit:
  ```bash
  git add -A
  git commit -m "feat(mobile): ajustes de touch targets, anchos responsivos y filtros colapsables"
  git tag v-mobile-5.0
  ```

---

## Resumen de Archivos por Fase

### Fase 1 — Nuevos (4 archivos)
| Archivo | Tipo |
|---|---|
| `src/hooks/useResponsive.ts` | Nuevo |
| `src/presentation/components/shared/DataTable/ResponsiveTable.tsx` | Nuevo |
| `src/presentation/components/shared/DataTable/MobileCard.tsx` | Nuevo |
| `src/presentation/components/shared/Charts/ResponsiveChart.tsx` | Nuevo |
| `src/presentation/components/shared/DataTable/index.ts` | Nuevo |
| `src/presentation/components/shared/Charts/index.ts` | Nuevo |
| `src/hooks/index.ts` | Modificado (1 línea) |

### Fase 2 — Modificados (2 archivos)
| Archivo | Cambio |
|---|---|
| `src/presentation/components/shared/DateRangePicker.tsx` | numberOfMonths responsivo + layout popover |
| `src/components/layout/Header.tsx` | Anchos de dropdowns responsivos |

### Fase 3 — Modificados (7 archivos)
| Archivo | Cambio |
|---|---|
| `src/presentation/components/features/transactions/TransactionList.tsx` | ResponsiveTable + MobileCard |
| `src/app/(dashboard)/accounts/page.tsx` | ResponsiveTable assets + deudas |
| `src/app/(dashboard)/savings/page.tsx` | ResponsiveTable metas |
| `src/app/(dashboard)/recurring/page.tsx` | ResponsiveTable recurrentes |
| `src/presentation/components/features/budgets/CategoryAllocationTable.tsx` | ResponsiveTable presupuestos |
| `src/presentation/components/features/reports/PeriodReport.tsx` | ResponsiveTable reportes |
| `src/app/(dashboard)/budgets/page.tsx` | Ajustes menores si aplica |

### Fase 4 — Modificados (6-8 archivos)
| Archivo | Cambio |
|---|---|
| `src/presentation/components/features/dashboard/charts/BalanceChart.tsx` | ResponsiveChart wrapper |
| `src/presentation/components/features/dashboard/charts/ExpensesByCategoryChart.tsx` | ResponsiveChart + outerRadius |
| `src/presentation/components/features/dashboard/charts/BudgetVsActualChart.tsx` | ResponsiveChart + margins |
| `src/presentation/components/features/dashboard/charts/WeeklyPatternChart.tsx` | ResponsiveChart wrapper |
| `src/presentation/components/features/dashboard/charts/PeriodBalanceChart.tsx` | ResponsiveChart wrapper |
| `src/presentation/components/features/dashboard/charts/BudgetGauge.tsx` | ResponsiveChart si aplica |
| `src/presentation/components/features/dashboard/widgets/TodayExpensesPieChart.tsx` | ResponsiveChart wrapper |
| `src/presentation/components/features/dashboard/widgets/DailyExpenseWidget.tsx` | Verificar charts internos |

### Fase 5 — Modificados (5-7 archivos)
| Archivo | Cambio |
|---|---|
| `src/app/globals.css` | Media query para touch targets |
| `src/app/(dashboard)/dashboard/page.tsx` | Select width responsivo |
| `src/presentation/components/features/budgets/CategoryAllocationTable.tsx` | Input widths |
| `src/presentation/components/features/transactions/TransactionFilters.tsx` | Filtros colapsables |
| `src/components/ui/dialog.tsx` | Max-width responsivo |
| `src/components/ui/table.tsx` | Padding responsivo (si no se resuelve via CSS global) |

---

## Reglas de Implementación

1. **NO modificar** ningún archivo en `src/domain/`, `src/application/`, `src/infrastructure/`
2. **NO alterar** queries de React Query, mutaciones, validaciones ni use cases
3. **NO cambiar** tipos, DTOs, entities ni mappers
4. **NO romper** tests existentes — si un test depende de estructura de tabla, adaptarlo
5. **Cada fase** debe poder compilar y funcionar independientemente (`npm run build` sin errores)
6. **Probar** cada fase en viewport 375px (iPhone SE) y 390px (iPhone 14) mínimo
7. **Respetar** el sistema de diseño existente (shadcn + Tailwind tokens)
8. **Preferir** CSS responsivo (Tailwind classes) sobre JavaScript condicional cuando sea posible
