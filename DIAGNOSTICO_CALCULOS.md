# 🔍 DIAGNÓSTICO DE CÁLCULOS - SISTEMA DE FINANZAS

**Fecha:** 1 de abril de 2026  
**Estado:** ✅ PROBLEMAS CRÍTICOS CORREGIDOS

---

## 📊 RESUMEN EJECUTIVO

Se encontraron y **CORRIGIERON 3 problemas críticos**:

1. ✅ **Balance de Cuentas**: FUNCIONA CORRECTAMENTE
2. ✅ **Category Budget - Crear Transacción**: ~~USA `userId` EN VEZ DE `organizationId`~~ **CORREGIDO**
3. ✅ **Category Budget - Actualizar Transacción**: ~~NO ACTUALIZA `spentAmount`~~ **CORREGIDO**
4. ✅ **Category Budget - Eliminar Transacción**: ~~USA `userId` EN VEZ DE `organizationId`~~ **CORREGIDO**
5. ✅ **Budget Period Summary**: FUNCIONA CORRECTAMENTE
6. ✅ **Dashboard KPIs**: FUNCIONA CORRECTAMENTE
7. ✅ **Proyección Financiera**: YA CORREGIDO (usa organizationId)

---

## 🎯 CORRECCIONES IMPLEMENTADAS

### ✅ **CORRECCIÓN #1: CreateTransactionUseCase**

**Commit:** `e9500f3`  
**Archivo:** `src/domain/use-cases/transactions/CreateTransactionUseCase.ts`

**Cambios realizados:**
- ✅ Cambiar `getByDate(userId, ...)` por `getByDateAndOrganization(organizationId, ...)`
- ✅ Usar `account.orgId` en lugar de `input.userId`
- ✅ Ahora encuentra el periodo correctamente en organizaciones compartidas
- ✅ El `spentAmount` se actualiza correctamente al crear gastos

**Resultado:** Al crear un gasto, el balance de cuenta Y el presupuesto se actualizan correctamente.

---

### ✅ **CORRECCIÓN #2: DeleteTransactionUseCase**

**Commit:** `5280451`  
**Archivo:** `src/domain/use-cases/transactions/DeleteTransactionUseCase.ts`

**Cambios realizados:**
- ✅ Cambiar `getByDate(userId, ...)` por `getByDateAndOrganization(organizationId, ...)`
- ✅ Usar `account.orgId` en lugar de `transaction.userId`
- ✅ Ahora encuentra el periodo correctamente al eliminar
- ✅ El `spentAmount` se decrementa correctamente al eliminar gastos

**Resultado:** Al eliminar un gasto, el balance de cuenta Y el presupuesto se revierten correctamente.

---

### ✅ **CORRECCIÓN #3: UpdateTransactionUseCase**

**Commit:** `d45d27a`  
**Archivos:**
- `src/domain/use-cases/transactions/UpdateTransactionUseCase.ts`
- `src/infrastructure/di/DIContainer.ts`

**Cambios realizados:**
- ✅ Agregar repositorios `IBudgetPeriodRepository` y `ICategoryBudgetRepository`
- ✅ Implementar método `updateCategoryBudgets()` con lógica completa
- ✅ Manejar cambio de categoría (decrementa en vieja, incrementa en nueva)
- ✅ Manejar cambio de fecha (verifica si cambia de periodo)
- ✅ Manejar cambio de monto (ajusta la diferencia)
- ✅ Manejar combinaciones de cambios
- ✅ Usar `organizationId` en todas las operaciones
- ✅ Actualizar DIContainer para inyectar los repositorios

**Casos manejados:**
1. Cambiar monto de $100 a $200 → incrementa `spentAmount` en $100
2. Cambiar monto de $200 a $100 → decrementa `spentAmount` en $100
3. Cambiar categoría → mueve el gasto completo entre categorías
4. Cambiar fecha a otro periodo → mueve el gasto entre periodos de presupuesto
5. Cambiar categoría + monto → maneja correctamente ambos cambios

**Resultado:** Al actualizar un gasto, todos los cambios se reflejan correctamente en presupuestos.

---

## 🔴 PROBLEMAS ORIGINALES (YA CORREGIDOS)

<details>
<summary>Ver detalles de los problemas que existían antes</summary>

### **PROBLEMA #1: CreateTransactionUseCase - Buscaba periodo por userId** ✅ CORREGIDO

**Archivo:** `src/domain/use-cases/transactions/CreateTransactionUseCase.ts`  
**Línea:** ~217

**Código problemático:**
```typescript
const budgetPeriod = await this.budgetPeriodRepo.getByDate(userId, transactionDate);
```

**❌ Problema:**
- Cuando creas una transacción, busca el periodo de presupuesto usando `userId`
- En organizaciones compartidas, el presupuesto pertenece a la `organizationId`
- **Resultado:** NO encuentra el periodo, NO actualiza el `spentAmount` del category budget

**✅ Solución:**
```typescript
// Necesita obtener el organizationId de la transacción
const budgetPeriod = await this.budgetPeriodRepo.getByDateAndOrganization(organizationId, transactionDate);
```

---

### **PROBLEMA #2: UpdateTransactionUseCase - NO actualiza category budgets**

**Archivo:** `src/domain/use-cases/transactions/UpdateTransactionUseCase.ts`

**❌ Problema:**
- Cuando actualizas una transacción (cambias monto, categoría, fecha), el `spentAmount` del category budget NO se recalcula
- Solo actualiza el balance de la cuenta
- **Resultado:** Los montos gastados quedan desactualizados

**✅ Solución requerida:**
1. Si cambió la categoría: decrementar en categoría vieja, incrementar en categoría nueva
2. Si cambió el monto: ajustar la diferencia en la categoría
3. Si cambió la fecha: verificar si cambió de periodo de presupuesto

---

### **PROBLEMA #3: DeleteTransactionUseCase - Busca periodo por userId**

**Archivo:** `src/domain/use-cases/transactions/DeleteTransactionUseCase.ts`  
**Línea:** ~87

**Código problemático:**
```typescript
const budgetPeriod = await this.budgetPeriodRepo.getByDate(userId, transactionDate);
```

**❌ Problema:**
- Igual que en CreateTransaction, busca por `userId` en lugar de `organizationId`
- **Resultado:** NO encuentra el periodo, NO decrementa el `spentAmount` cuando eliminas gastos

**✅ Solución:**
```typescript
const budgetPeriod = await this.budgetPeriodRepo.getByDateAndOrganization(organizationId, transactionDate);
```

---

## ✅ COMPONENTES QUE FUNCIONAN CORRECTAMENTE

### **1. Balance de Cuentas**

**Archivos:**
- `CreateTransactionUseCase.updateAccountBalance()`
- `UpdateTransactionUseCase.handleAccountChange()`
- `UpdateTransactionUseCase.handleAmountChange()`
- `DeleteTransactionUseCase.execute()`

**✅ Funciona bien porque:**
- Todas las operaciones actualizan correctamente el balance
- Suma ingresos, resta gastos
- Revierte cambios al eliminar/actualizar

---

### **2. Budget Period Summary**

**Archivo:** `src/domain/use-cases/category-budgets/GetBudgetPeriodSummaryUseCase.ts`

**✅ Funciona bien porque:**
- Obtiene category budgets del periodo
- Suma correctamente `allocatedAmount` y `spentAmount`
- Calcula porcentajes correctamente

**⚠️ PERO:** Los datos que suma son incorrectos porque `spentAmount` no se actualiza correctamente (problemas #1, #2, #3)

---

### **3. Dashboard KPIs**

**Archivo:** `src/domain/use-cases/dashboard/GetDashboardStatisticsUseCase.ts`

**✅ Funciona bien porque:**
- El repositorio `FirestoreTransactionRepository` ya filtra por `orgId` en todos los queries
- `getByDateRange()` incluye `where('orgId', '==', this.orgId)`
- Los cálculos de income/expenses/balance son correctos

---

### **4. Repositorio de Transacciones**

**Archivo:** `src/infrastructure/repositories/FirestoreTransactionRepository.ts`

**✅ Funciona bien porque:**
- Constructor recibe `orgId` del DIContainer
- TODOS los métodos filtran por `where('orgId', '==', this.orgId)`
- Las transacciones se guardan con `orgId` correctamente

---

## 📋 ETAPAS DE CÁLCULO - ESTADO ACTUAL

| # | Etapa | Archivo | Estado | Notas |
|---|-------|---------|--------|-------|
| 1 | **Crear Transacción** | CreateTransactionUseCase | ✅ CORREGIDO | Usa organizationId correctamente |
| 2 | **Actualizar Transacción** | UpdateTransactionUseCase | ✅ CORREGIDO | Actualiza category budgets completamente |
| 3 | **Eliminar Transacción** | DeleteTransactionUseCase | ✅ CORREGIDO | Usa organizationId correctamente |
| 4 | **Balance de Cuenta** | *TransactionUseCase | ✅ OK | Actualiza correctamente |
| 5 | **Obtener Transacciones** | FirestoreTransactionRepository | ✅ OK | Filtra por orgId |
| 6 | **Category Budget - Inicial** | SetCategoryBudgetUseCase | ✅ OK | Calcula spentAmount inicial |
| 7 | **Category Budget - Summary** | GetBudgetPeriodSummaryUseCase | ✅ OK | Suma correctamente |
| 8 | **Dashboard Statistics** | GetDashboardStatisticsUseCase | ✅ OK | Usa orgId correctamente |
| 9 | **Proyección Financiera** | CalculateFinancialProjectionUseCase | ✅ OK | Usa organizationId |

---

## ✅ SIGUIENTE PASO REQUERIDO

**IMPORTANTE:** Necesitas ejecutar el script de recalculación para corregir los datos existentes:

```bash
npx ts-node scripts/recalculate-spent-amounts.ts
```

Este script:
- Recalculará TODOS los `spentAmount` de category budgets existentes
- Basándose en las transacciones reales en cada periodo
- Corregirá cualquier inconsistencia en los datos históricos

**Después de ejecutar el script:**
- Los nuevos gastos/ingresos se calcularán correctamente automáticamente
- Los gastos existentes mostrarán los montos correctos
- El dashboard y reportes mostrarán información precisa

---

## 📝 COMMITS REALIZADOS

1. **e9500f3** - fix(transactions): usar organizationId en CreateTransactionUseCase
2. **5280451** - fix(transactions): usar organizationId en DeleteTransactionUseCase  
3. **d45d27a** - fix(transactions): implementar actualización de category budgets en UpdateTransactionUseCase

---

<details>
<summary><strong>📋 DIAGNÓSTICO ORIGINAL (INFORMACIÓN HISTÓRICA)</strong></summary>

### **🎯 IMPACTO EN TUS DATOS (POR QUÉ NO CUADRABAN LOS NÚMEROS):**

1. **Transacciones creadas:**
   - El balance de la cuenta SÍ se actualiza ✅
   - El `spentAmount` del category budget NO se actualiza ❌
   - **Resultado:** Ves el gasto en tu cuenta, pero el presupuesto no lo refleja

2. **Transacciones actualizadas:**
   - El balance de la cuenta SÍ se actualiza ✅
   - El `spentAmount` del category budget NO cambia ❌
   - **Resultado:** Si cambiaste un gasto de $100 a $200, el presupuesto sigue mostrando $100

3. **Transacciones eliminadas:**
   - El balance de la cuenta SÍ se revierte ✅
   - El `spentAmount` del category budget NO se decrementa ❌
   - **Resultado:** Eliminas un gasto pero el presupuesto sigue contándolo

4. **Vista de Dashboard/Reportes:**
   - Las transacciones SÍ aparecen correctamente ✅
   - Los totales de income/expenses SON correctos ✅
   - Pero los "Gastos vs Presupuesto" NO cuadran ❌

### **🔧 SOLUCIONES APLICADAS:**

1. **CreateTransactionUseCase:** ✅ Corregido - ahora usa `getByDateAndOrganization(orgId, ...)`
2. **DeleteTransactionUseCase:** ✅ Corregido - ahora usa `getByDateAndOrganization(orgId, ...)`
3. **UpdateTransactionUseCase:** ✅ Corregido - ahora actualiza category budgets en todos los escenarios
4. **Script de corrección:** ✅ Disponible como `recalculate-spent-amounts.ts`

</details>
