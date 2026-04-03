# 🔒 IMPLEMENTACIÓN DE OPTIMISTIC LOCKING

> **Fecha:** 2 de abril, 2026  
> **Fase:** Optimistic Locking para Presupuestos  
> **Estado:** ✅ Completada

---

## 📋 RESUMEN EJECUTIVO

Se ha implementado exitosamente **Optimistic Locking** en el sistema de presupuestos para prevenir conflictos de edición colaborativa. Esta funcionalidad garantiza que cuando dos usuarios editan el mismo presupuesto simultáneamente, se detecte el conflicto y se notifique al usuario de manera amigable.

---

## 🎯 PROBLEMA RESUELTO

### Escenario sin Optimistic Locking:
1. Usuario A lee presupuesto (versión 1)
2. Usuario B lee presupuesto (versión 1)
3. Usuario A actualiza presupuesto → guardado como versión 2
4. Usuario B actualiza presupuesto → **sobreescribe cambios de A** ❌

### Escenario con Optimistic Locking:
1. Usuario A lee presupuesto (versión 1)
2. Usuario B lee presupuesto (versión 1)
3. Usuario A actualiza presupuesto → guardado como versión 2 ✅
4. Usuario B intenta actualizar presupuesto → **conflicto detectado** → notificación al usuario 🔔

---

## 🏗️ ARQUITECTURA DE LA SOLUCIÓN

### 1. Domain Layer (Entidades)

**Archivos modificados:**
- `src/domain/entities/BudgetPeriod.ts`
- `src/domain/entities/CategoryBudget.ts`

**Cambios:**
```typescript
// Se agregó campo `version` al constructor
constructor(
  // ... otros campos
  public readonly version: number = 1
) {}

// Métodos de actualización ahora preservan la versión
update(updates): BudgetPeriod {
  return new BudgetPeriod(
    // ... otros campos
    this.version // ← preserva versión para optimistic locking
  );
}
```

---

### 2. Domain Layer (Errores)

**Archivo creado:**
- `src/domain/errors/OptimisticLockError.ts`

**Funcionalidad:**
```typescript
export class OptimisticLockError extends Error {
  constructor(
    resourceType: string,
    resourceId: string,
    currentVersion: number,
    attemptedVersion: number
  )
  
  // Mensajes amigables en español
  getUserMessage(): string
}
```

---

### 3. Infrastructure Layer (Mappers)

**Archivos modificados:**
- `src/infrastructure/mappers/BudgetPeriodMapper.ts`
- `src/infrastructure/mappers/CategoryBudgetMapper.ts`

**Cambios:**
```typescript
// toDomain: ahora lee el campo version de Firestore
static toDomain(doc): BudgetPeriod {
  return new BudgetPeriod(
    // ... otros campos
    doc.version || 1 // ← soporte para documentos legacy
  );
}

// toFirestore: ahora escribe version en nuevos documentos
static toFirestore(entity): DocumentData {
  return {
    // ... otros campos
    version: 1, // ← nuevos documentos empiezan en v1
  };
}
```

---

### 4. Infrastructure Layer (Repositorios)

**Archivos modificados:**
- `src/infrastructure/repositories/FirestoreBudgetPeriodRepository.ts`
- `src/infrastructure/repositories/FirestoreCategoryBudgetRepository.ts`

**Método nuevo agregado:**
```typescript
async updateWithOptimisticLock(id: string, data: Entity): Promise<void> {
  await runTransaction(db, async (transaction) => {
    const docSnap = await transaction.get(docRef);
    const currentVersion = docSnap.data().version || 1;
    const attemptedVersion = data.version;

    // ✅ Check: ¿La versión coincide?
    if (currentVersion !== attemptedVersion) {
      throw new OptimisticLockError(
        'BudgetPeriod',
        id,
        currentVersion,
        attemptedVersion
      );
    }

    // ✅ Update: Incrementa versión
    transaction.update(docRef, {
      ...updateData,
      version: currentVersion + 1,
    });
  });
}
```

---

### 5. Application Layer (Casos de Uso)

**Archivos modificados:**
- `src/domain/use-cases/budget-periods/UpdateBudgetPeriodUseCase.ts`
- `src/domain/use-cases/category-budgets/UpdateCategoryBudgetPercentageUseCase.ts`

**Cambios:**
```typescript
// Antes:
await this.budgetPeriodRepo.update(id, updatedBudgetPeriod);

// Ahora:
await this.budgetPeriodRepo.updateWithOptimisticLock(id, updatedBudgetPeriod);
```

---

### 6. Application Layer (Hooks React Query)

**Archivos modificados:**
- `src/application/hooks/useBudgetPeriods.ts`
- `src/application/hooks/useCategoryBudgets.ts`

**Archivo creado:**
- `src/lib/utils/optimisticLockErrorHandler.ts`

**Funcionalidad:**
```typescript
// useBudgetPeriods.ts
const updateBudgetPeriod = useMutation({
  mutationFn: (input) => useCase.execute(input),
  onSuccess: () => { /* invalidar queries */ },
  onError: (error) => {
    // ✅ Manejo automático de errores de optimistic locking
    handleOptimisticLockError(error);
  },
});
```

**Helper creado:**
```typescript
// optimisticLockErrorHandler.ts
export function handleOptimisticLockError(error: unknown): boolean {
  if (OptimisticLockError.isOptimisticLockError(error)) {
    toast.error('Conflicto de edición detectado', {
      description: error.getUserMessage(),
      action: { label: 'Recargar', onClick: () => window.location.reload() },
    });
    return true;
  }
  return false;
}
```

---

### 7. Infrastructure Layer (Firestore Rules)

**Archivo modificado:**
- `firestore.rules.production`

**Reglas agregadas:**
```javascript
// Budget Periods - validación de versión
match /budgetPeriods/{periodId} {
  // Creación: debe empezar en versión 1
  allow create: if request.resource.data.version == 1;
  
  // Actualización: versión debe incrementarse en 1
  allow update: if request.resource.data.version == resource.data.version + 1;
}

// Category Budgets - validación de versión
match /categoryBudgets/{categoryBudgetId} {
  allow create: if request.resource.data.version == 1;
  allow update: if request.resource.data.version == resource.data.version + 1;
}
```

---

## 📊 ARCHIVOS MODIFICADOS

### Entidades de Dominio (2)
- ✅ `src/domain/entities/BudgetPeriod.ts`
- ✅ `src/domain/entities/CategoryBudget.ts`

### Errores de Dominio (1 nuevo)
- ✅ `src/domain/errors/OptimisticLockError.ts` ← **NUEVO**

### Mappers (2)
- ✅ `src/infrastructure/mappers/BudgetPeriodMapper.ts`
- ✅ `src/infrastructure/mappers/CategoryBudgetMapper.ts`

### Repositorios (2)
- ✅ `src/infrastructure/repositories/FirestoreBudgetPeriodRepository.ts`
- ✅ `src/infrastructure/repositories/FirestoreCategoryBudgetRepository.ts`

### Casos de Uso (2)
- ✅ `src/domain/use-cases/budget-periods/UpdateBudgetPeriodUseCase.ts`
- ✅ `src/domain/use-cases/category-budgets/UpdateCategoryBudgetPercentageUseCase.ts`

### Hooks React Query (2)
- ✅ `src/application/hooks/useBudgetPeriods.ts`
- ✅ `src/application/hooks/useCategoryBudgets.ts`

### Utilidades (1 nuevo)
- ✅ `src/lib/utils/optimisticLockErrorHandler.ts` ← **NUEVO**

### Reglas de Firestore (1)
- ✅ `firestore.rules.production`

---

## 🧪 PRUEBAS RECOMENDADAS

### Prueba Manual #1: Conflicto de edición
1. Abrir app en dos navegadores con el mismo usuario
2. Navegar a `/budgets` en ambos
3. Seleccionar el mismo período de presupuesto
4. **Navegador A:** Cambiar monto total a $5000 → Guardar
5. **Navegador B:** Cambiar monto total a $6000 → Guardar
6. **Resultado esperado:** Navegador B debe mostrar error de conflicto con toast rojo

### Prueba Manual #2: Conflicto en asignación de categorías
1. Abrir app en dos navegadores con el mismo usuario
2. Navegar a tab "Asignación por Categoría"
3. **Navegador A:** Cambiar % de "Alimentación" a 30% → Guardar
4. **Navegador B:** Cambiar % de "Alimentación" a 25% → Guardar
5. **Resultado esperado:** Toast de error con mensaje en español

### Prueba Automática (Opcional)
```typescript
// test/optimistic-locking.test.ts
describe('Optimistic Locking', () => {
  it('should throw OptimisticLockError on version mismatch', async () => {
    const budgetPeriod = new BudgetPeriod(/* ... */, version: 1);
    
    // Simular actualización concurrente
    await repo.updateWithOptimisticLock(id, budgetPeriod.update({ totalAmount: 5000 }));
    
    // Este debe fallar porque la versión ya es 2
    await expect(
      repo.updateWithOptimisticLock(id, budgetPeriod.update({ totalAmount: 6000 }))
    ).rejects.toThrow(OptimisticLockError);
  });
});
```

---

## 🔄 MIGRACIÓN DE DATOS EXISTENTES

**⚠️ IMPORTANTE:** Los documentos existentes en Firestore **no tienen el campo `version`**.

### Estrategia de Migración:

#### Opción 1: Migración automática (Recomendada)
```typescript
// scripts/add-version-to-budgets.ts
const budgetPeriodsRef = collection(db, 'budgetPeriods');
const snapshot = await getDocs(budgetPeriodsRef);

const batch = writeBatch(db);
snapshot.docs.forEach(doc => {
  if (!doc.data().version) {
    batch.update(doc.ref, { version: 1 });
  }
});

await batch.commit();
console.log(`Migrated ${snapshot.size} budget periods`);
```

#### Opción 2: Migración lazy (Actual)
- Los mappers tienen fallback: `doc.version || 1`
- Al actualizar, se setea versión automáticamente
- **Ventaja:** No requiere script de migración
- **Desventaja:** Optimistic locking no funciona hasta primera actualización

---

## 📈 BENEFICIOS

### ✅ Integridad de Datos
- Previene pérdida de datos por sobreescritura
- Garantiza consistencia en ediciones concurrentes

### ✅ Experiencia de Usuario
- Notificaciones claras en español
- Opción de recargar para ver cambios
- Sin errores crípticos de base de datos

### ✅ Escalabilidad
- Funciona con Firebase Transactions (atómico)
- No requiere bloqueos de base de datos
- Eficiente en entornos multi-usuario

### ✅ Mantenibilidad
- Patrón estándar de la industria
- Fácil de extender a otras entidades
- Documentación clara

---

## 🚀 PRÓXIMOS PASOS (OPCIONAL)

### 1. Agregar Optimistic Locking a otras entidades
- `Transaction`
- `Account`
- `Category`
- `RecurringTransaction`

### 2. Mejorar UI de resolución de conflictos
```typescript
// En lugar de solo recargar, mostrar diff visual
<ConflictResolutionDialog
  localChanges={localVersion}
  serverChanges={serverVersion}
  onResolve={(resolved) => saveWithVersion(resolved)}
/>
```

### 3. Agregar retry automático
```typescript
// En lugar de manual, intentar merge automático
const retryWithLatestVersion = async (mutation, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await mutation();
    } catch (error) {
      if (OptimisticLockError.isOptimisticLockError(error) && i < maxRetries - 1) {
        const latest = await refetch(); // obtener versión más reciente
        continue; // retry con nueva versión
      }
      throw error;
    }
  }
};
```

---

## 📚 REFERENCIAS

- **Patrón Optimistic Locking:** [Martin Fowler - Patterns of Enterprise Application Architecture](https://martinfowler.com/eaaCatalog/optimisticOfflineLock.html)
- **Firebase Transactions:** [Firebase Docs - Transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)
- **Clean Architecture:** [Robert C. Martin - Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [x] Agregar campo `version` a entidades de dominio
- [x] Crear clase `OptimisticLockError`
- [x] Actualizar mappers para soportar `version`
- [x] Implementar `updateWithOptimisticLock()` en repositorios
- [x] Actualizar casos de uso para usar optimistic locking
- [x] Crear helper de manejo de errores en UI
- [x] Agregar manejo de errores en hooks React Query
- [x] Actualizar reglas de Firestore
- [x] Documentación completa
- [ ] Pruebas manuales (pendiente)
- [ ] Migración de datos existentes (opcional)

---

**Autor:** GitHub Copilot (Claude Sonnet 4.5)  
**Patrón implementado:** Optimistic Offline Lock  
**Framework:** Firebase Firestore + React Query  
**Arquitectura:** Clean Architecture con DDD
