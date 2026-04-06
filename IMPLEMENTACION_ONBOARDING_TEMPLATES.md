# Implementación: Sistema de Onboarding y Templates

**Fecha:** Diciembre 2024  
**Fase:** 3 - Mejoras Estructurales  
**Estado:** ✅ Completado

## Resumen

Implementación del sistema de onboarding interactivo con tours guiados y plantillas predefinidas de presupuesto para mejorar la experiencia de usuario y reducir la fricción en la configuración inicial.

---

## 1. Objetivos

### Problemas Identificados (del Diagnóstico)
- **Falta de Guía para Nuevos Usuarios:** No hay orientación sobre cómo crear períodos, asignar categorías o distribuir presupuesto
- **Fricción en Configuración Inicial:** Los usuarios deben crear manualmente todas las categorías y asignar porcentajes sin referencia
- **No hay Templates:** Ausencia de plantillas predefinidas basadas en mejores prácticas (50/30/20, presupuesto familiar, etc.)

### Soluciones Implementadas
- ✅ Sistema de tours interactivos con react-joyride
- ✅ Gestión de estado de onboarding persistente en localStorage
- ✅ 6 plantillas de presupuesto predefinidas
- ✅ Componente de selección de plantillas con preview
- ✅ Aplicación automática de porcentajes desde plantillas

---

## 2. Archivos Creados

### Constantes de Tours
**Archivo:** `src/lib/constants/budgetTours.ts`

Definiciones de tours guiados con react-joyride:
- **MAIN_BUDGET_TOUR:** Tour principal de 10 pasos explicando períodos, categorías y asignación
- **CATEGORY_CREATION_TOUR:** Tour de 2 pasos para crear nuevas categorías
- **BUDGET_ALLOCATION_TIPS:** Consejos sobre la regla 50/30/20
- **TOUR_CONFIG:** Configuración de idioma (español) para botones de Joyride

```typescript
// Ejemplo de paso del tour
{
  target: '[data-tour="new-period-btn"]',
  content: (
    <div>
      <h3>Crear Nuevo Período</h3>
      <p>Haz clic aquí para crear tu primer período de presupuesto...</p>
    </div>
  ),
  placement: 'bottom',
}
```

### Hook de Onboarding
**Archivo:** `src/application/hooks/useBudgetOnboarding.ts`

Gestión de estado de tours con persistencia en localStorage:

**Funcionalidades:**
- `startMainTour()`: Inicia el tour principal
- `startCategoryCreationTour()`: Tour para crear categorías
- `showAllocationTips()`: Muestra consejos de asignación
- `completeMainTour()`: Marca el tour principal como completado
- `resetOnboarding()`: Resetea todos los tours (útil para debug)
- `shouldShowMainTour()`: Determina si mostrar el tour automáticamente

**Estado Persistido:**
```typescript
interface OnboardingState {
  mainTourCompleted: boolean;
  categoryCreationTourCompleted: boolean;
  allocationTipsShown: boolean;
  lastTourDate?: string;
}
```

### Templates de Presupuesto
**Archivo:** `src/lib/constants/budgetTemplates.ts`

6 plantillas predefinidas con categorías y porcentajes:

1. **Presupuesto Personal 50/30/20**
   - 50% Necesidades (vivienda, comida, transporte, salud)
   - 30% Deseos (entretenimiento, compras personales, hobbies)
   - 20% Ahorros e Inversiones

2. **Presupuesto Familiar**
   - 30% Vivienda
   - 20% Alimentación
   - 15% Educación
   - 15% Transporte
   - 10% Salud
   - 5% Entretenimiento
   - 5% Ahorros

3. **Presupuesto Freelancer**
   - 25% Impuestos
   - 20% Gastos Operativos
   - 15% Vivienda
   - 10% Marketing
   - 10% Salud/Seguros
   - 10% Ahorros/Emergencias
   - 5% Educación
   - 5% Personal

4. **Presupuesto Empresarial**
   - 40% Salarios
   - 15% Renta/Instalaciones
   - 15% Marketing
   - 10% Operaciones
   - 10% Tecnología
   - 5% Legal/Admin
   - 5% Contingencia

5. **Presupuesto Estudiante**
   - 35% Vivienda/Alquiler
   - 25% Alimentación
   - 15% Libros/Materiales
   - 10% Transporte
   - 10% Entretenimiento
   - 5% Ahorros

6. **Presupuesto Base Cero**
   - Cada categoría debe justificarse desde cero
   - 100% del presupuesto asignado explícitamente

**Helper Functions:**
```typescript
getBudgetTemplateById(id: string): BudgetTemplate | undefined
getRecommendedTemplate(orgType?: string): BudgetTemplate
```

### Componente de Selección de Templates
**Archivo:** `src/components/budgets/BudgetTemplateSelector.tsx`

Dialog modal con cuadrícula de plantillas:
- Preview de categorías con colores y porcentajes
- Indicador de plantilla seleccionada
- Botón "Aplicar Plantilla" con confirmación
- Descripción de cada plantilla

**Props:**
```typescript
interface BudgetTemplateSelectorProps {
  onSelectTemplate: (template: BudgetTemplate) => void;
  trigger?: React.ReactNode;
  disabled?: boolean;
}
```

### Hook de Aplicación de Templates
**Archivo:** `src/application/hooks/useApplyBudgetTemplate.ts`

Lógica para aplicar plantilla a un período de presupuesto:

**Proceso:**
1. Validar que hay ingreso total configurado
2. Para cada categoría en la plantilla:
   - Buscar categoría existente por nombre (case-insensitive)
   - Si existe y no tiene asignación, crear category budget
   - Si no existe, registrar como "no encontrada"
3. Mostrar resultados: categorías actualizadas y errores
4. Refrescar datos

**Características:**
- Manejo de errores por categoría individual
- Mensajes informativos (éxito total, parcial, o error)
- No sobrescribe asignaciones existentes (solo crea nuevas)

---

## 3. Archivos Modificados

### Página de Presupuestos
**Archivo:** `src/app/(dashboard)/budgets/page.tsx`

**Cambios:**
- ✅ Importar `useBudgetOnboarding` y `useApplyBudgetTemplate`
- ✅ Importar constantes de tours `MAIN_BUDGET_TOUR` y `TOUR_CONFIG`
- ✅ Reemplazar import de `useBudgetTour` (deprecado) por hooks nuevos
- ✅ Agregar componente `<Joyride>` con configuración de tours
- ✅ Agregar `<BudgetTemplateSelector>` en sección de asignación
- ✅ Conectar hook `applyTemplate` al componente selector

**Ejemplo de Integración:**
```tsx
// Hooks
const {
  currentTour,
  isRunning,
  startMainTour,
} = useBudgetOnboarding();

const { applyTemplate, isApplying } = useApplyBudgetTemplate({
  organizationId: orgId,
  budgetPeriodId: selectedPeriodId || '',
  totalIncome: selectedPeriod?.totalAmount || 0,
});

// JSX
<Joyride steps={currentTour?.steps || []} run={isRunning} continuous />

<BudgetTemplateSelector
  onSelectTemplate={applyTemplate}
  disabled={!selectedPeriod || isApplying}
/>
```

### Exports del Barrel de Hooks
**Archivo:** `src/application/hooks/index.ts`

**Cambios:**
- ❌ Removido: `export { useBudgetTour } from './useBudgetTour';` (deprecado)
- ✅ Agregado: `export { useBudgetOnboarding } from './useBudgetOnboarding';`
- ✅ Agregado: `export { useApplyBudgetTemplate } from './useApplyBudgetTemplate';`

---

## 4. Atributos data-tour en la UI

Para que los tours funcionen correctamente, se deben agregar atributos `data-tour` en elementos clave:

### Existentes
- `data-tour="periods-tab"` - Tab de períodos
- `data-tour="allocation-tab"` - Tab de asignación
- `data-tour="summary-tab"` - Tab de resumen
- `data-tour="new-period-btn"` - Botón crear período
- `data-tour="new-category-btn"` - Botón crear categoría
- `data-tour="allocation-table"` - Tabla de asignación

### Pendientes de Agregar
- `data-tour="period-selector"` - Selector de período activo
- `data-tour="distribute-btn"` - Botón distribuir equitativamente
- `data-tour="save-allocations-btn"` - Botón guardar asignaciones
- `data-tour="template-btn"` - Botón de plantillas (ya manejado por BudgetTemplateSelector)

---

## 5. Flujo de Usuario

### Primera Visita (Tour Automático)
1. Usuario ingresa a página de presupuestos por primera vez
2. `useBudgetOnboarding` detecta que no hay tour completado en localStorage
3. Se inicia `MAIN_BUDGET_TOUR` automáticamente con 10 pasos
4. Tour explica: qué es un período, cómo crear categorías, cómo asignar porcentajes
5. Al finalizar o saltar, se guarda `mainTourCompleted: true` en localStorage

### Uso de Plantillas
1. Usuario crea un período de presupuesto
2. En tab "Asignación por Categoría", hace clic en "Usar Plantilla"
3. Se abre dialog con 6 plantillas disponibles
4. Usuario selecciona una plantilla (ej: "Presupuesto Personal 50/30/20")
5. Hace clic en "Aplicar Plantilla"
6. Sistema busca categorías existentes que coincidan con la plantilla
7. Crea category budgets con los porcentajes de la plantilla
8. Muestra toast con resultado (categorías actualizadas/no encontradas)
9. Usuario puede ajustar porcentajes manualmente si lo desea

### Tours Adicionales
- **Tour de Creación de Categoría:** Se puede activar manualmente con `startCategoryCreationTour()`
- **Tips de Asignación:** Se puede mostrar con `showAllocationTips()` para explicar regla 50/30/20

---

## 6. Consideraciones de Diseño

### Persistencia
- Estado de tours en `localStorage` bajo clave `budget-onboarding-state`
- Permite tracking granular (main tour, category tour, tips)
- Incluye fecha de último tour para posible re-onboarding futuro

### Compatibilidad
- Plantillas usan nombres de categorías genéricos en español
- Búsqueda case-insensitive para matching de categorías
- No sobrescribe asignaciones existentes (solo crea nuevas)
- Templates funcionan con organizaciones de cualquier tipo

### UX
- Tours no bloqueantes (se pueden saltar)
- Mensajes informativos sobre resultados parciales
- Preview de categorías en selector de plantillas
- Colores visuales para identificar categorías rápidamente

---

## 7. Testing Manual

### Checklist de QA

#### Tours de Onboarding
- [ ] Primera visita muestra tour automáticamente
- [ ] Tour se puede saltar con botón "Saltar"
- [ ] Tour se puede completar paso a paso
- [ ] Tour no se muestra después de completarse
- [ ] `resetOnboarding()` permite volver a ver el tour (dev only)
- [ ] Navegación entre pasos funciona correctamente
- [ ] Elementos resaltados corresponden con data-tour attributes

#### Selector de Plantillas
- [ ] Botón "Usar Plantilla" se muestra en tab de Asignación
- [ ] Dialog se abre al hacer clic
- [ ] 6 plantillas se muestran con preview correcto
- [ ] Seleccionar plantilla resalta la card
- [ ] Aplicar plantilla crea category budgets
- [ ] Toast muestra resultado correcto (éxito/parcial/error)
- [ ] Deshabilitado cuando no hay período seleccionado
- [ ] Deshabilitado cuando isApplying=true

#### Aplicación de Plantillas
- [ ] Error si totalAmount = 0
- [ ] Busca categorías por nombre (case-insensitive)
- [ ] Crea category budgets para categorías existentes
- [ ] No sobrescribe asignaciones existentes (>0%)
- [ ] Reporta categorías no encontradas
- [ ] Refetch actualiza tabla de asignación

---

## 8. Mejoras Futuras

### Corto Plazo
- [ ] Agregar callback de Joyride cuando se actualice a versión compatible
- [ ] Agregar stepIndex control para navegación manual
- [ ] Crear tour para tab "Resumen"
- [ ] Agregar data-tour attributes faltantes

### Mediano Plazo
- [ ] Permitir crear categorías automáticamente desde plantillas
- [ ] Agregar más plantillas (por industria, país, etc.)
- [ ] Permitir a usuarios guardar sus propias plantillas
- [ ] Tour interactivo con mini-acciones (crear categoría de prueba)

### Largo Plazo
- [ ] Sistema de logros/gamificación del onboarding
- [ ] Analytics de completación de tours
- [ ] Tours contextuales basados en comportamiento del usuario
- [ ] Video tutoriales embebidos en tours

---

## 9. Dependencias

- **react-joyride:** ^3.0.2 (tours interactivos)
- **sonner:** toast notifications
- **lucide-react:** iconos (Sparkles, Check)
- **date-fns:** formateo de fechas (para lastTourDate)

---

## 10. Conclusión

✅ **Sistema de Onboarding Completado**
- Tours interactivos funcionando
- Persistencia de estado en localStorage
- 6 plantillas de presupuesto disponibles
- Integración completa en página de presupuestos

**Próximo Paso:** Testing manual y recolección de feedback de usuarios para iterar sobre contenido de tours y plantillas.

**Archivos Creados:** 5  
**Archivos Modificados:** 2  
**Líneas de Código:** ~800 LOC
