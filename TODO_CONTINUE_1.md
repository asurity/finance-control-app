# 🚀 TODO: Plan de Continuación - Sistema de Transacciones v1.0

> **Fecha inicio:** 29 de marzo de 2026  
> **Objetivo:** Implementar sistema completo de registro de gastos e ingresos  
> **Arquitectura:** Clean Architecture estricta + DRY + Pipelines optimizados  
> **Versionamiento:** Git + Tags semánticos  
> **Stack:** Next.js 14 + TypeScript + Firebase/Firestore

---

## 📋 PRINCIPIOS OBLIGATORIOS

### 🏛️ Clean Architecture
```
✅ Regla de dependencias: Capas internas NO conocen las externas
✅ Domain Layer: Sin dependencias de infraestructura
✅ Use Cases: Toda lógica de negocio aquí
✅ Repositories: Solo interfaces en domain, implementaciones en infrastructure
✅ Mappers: Transformación explícita entre capas
```

### 🔄 DRY (Don't Repeat Yourself)
```
✅ UN SOLO lugar para cada responsabilidad
✅ Eliminar Services legacy VS Repositories duplicados
✅ Componentes reutilizables en shared/
✅ Hooks como fachadas únicas de use cases
✅ Constantes centralizadas
```

### 📊 Pipelines Bien Definidos
```
User Action → Component → Hook → Use Case → Repository → Firestore
    ↓           ↓          ↓         ↓           ↓
Validation  Props     Query/   Business    Data
            Check     Mutation  Logic    Transform
```

### 📈 Escalabilidad y Mantenibilidad
```
✅ Código modular y desacoplado
✅ Testing desde el inicio
✅ Documentación inline (JSDoc)
✅ Índices Firestore para queries
✅ Optimistic updates
✅ Error boundaries
```

### 🔄 Control de Versiones (Git Tags)
```bash
# Estrategia de versionado semántico
v0.1.0 - Fase 0: Arquitectura base
v0.2.0 - Fase 1: Entidades y Use Cases
v0.3.0 - Fase 2: Sistema de Categorías
v0.4.0 - Fase 3: UI de Transacciones
v1.0.0 - Fase 4: Release Production-Ready

# Cada subtarea = 1 commit
# Cada fase completa = 1 tag
```

---

## 📊 Índice de Fases

- [Fase 0: Consolidación Arquitectónica](#fase-0-consolidación-arquitectónica) ⏱️ 2 horas
- [Fase 1: Dominio Completo](#fase-1-dominio-completo) ⏱️ 3 horas
- [Fase 2: Sistema de Categorías](#fase-2-sistema-de-categorías) ⏱️ 2 horas
- [Fase 3: Use Cases Completos](#fase-3-use-cases-completos) ⏱️ 3 horas
- [Fase 4: Validadores y DTOs](#fase-4-validadores-y-dtos) ⏱️ 2 horas
- [Fase 5: UI de Transacciones](#fase-5-ui-de-transacciones) ⏱️ 4 horas
- [Fase 6: Integración y Testing](#fase-6-integración-y-testing) ⏱️ 3 horas
- [Fase 7: Optimización y Deployment](#fase-7-optimización-y-deployment) ⏱️ 2 horas

**Tiempo total estimado:** ~21 horas

---

## 🏗️ Fase 0: Consolidación Arquitectónica

**Objetivo:** Eliminar duplicidades y establecer arquitectura única  
**Tiempo estimado:** 2 horas  
**Tag:** `v0.1.0-architecture-consolidation`  
**Dependencias:** Ninguna

### 📋 Checklist

#### Task 0.1: Auditoría de Código Duplicado
**Tiempo:** 30 minutos

- [ ] **Identificar todas las duplicidades**
  ```bash
  # Documentar en un archivo temporal:
  # - src/hooks/* vs src/application/hooks/*
  # - src/lib/services/* vs src/infrastructure/repositories/*
  # - Types en src/types/firestore.ts vs domain entities
  ```

- [ ] **Decisión arquitectónica final**
  - [ ] ✅ USAR: `src/infrastructure/repositories/*` (Clean Architecture)
  - [ ] ✅ USAR: `src/application/hooks/*` (Capa de aplicación limpia)
  - [ ] ✅ USAR: `src/domain/entities/*` (Entidades puras)
  - [ ] ❌ ELIMINAR: `src/lib/services/*` (Legacy)
  - [ ] ❌ ELIMINAR: `src/hooks/*` (Duplicado)

- [ ] **Git Checkpoint**
  ```bash
  git add .
  git commit -m "docs(architecture): audit existing code duplications"
  ```

---

#### Task 0.2: Migrar Hooks a Application Layer
**Tiempo:** 45 minutos  
**Priority:** 🔴 CRÍTICA

- [ ] **Migrar useTransactions**
  - [ ] Mover lógica de `src/hooks/useTransactions.ts` → `src/application/hooks/useTransactions.ts`
  - [ ] Actualizar imports en dashboard y otros componentes
  - [ ] Eliminar `src/hooks/useTransactions.ts`

- [ ] **Migrar useAccounts**
  - [ ] Verificar que `src/application/hooks/useAccounts.ts` esté completo
  - [ ] Comparar con `src/hooks/useAccounts.ts`
  - [ ] Eliminar versión legacy

- [ ] **Migrar useBudgets**
  - [ ] Verificar implementación actual
  - [ ] Consolidar en application layer
  - [ ] Eliminar duplicado

- [ ] **Migrar hooks restantes**
  - [ ] useCategories
  - [ ] useCreditCards
  - [ ] useOrganization (mantener en src/hooks si es infraestructura)
  - [ ] useAlerts
  - [ ] useSavingsGoals
  - [ ] useRecurringTransactions

- [ ] **Actualizar exports en index.ts**
  ```typescript
  // src/application/hooks/index.ts - Centralizar todos los exports
  export * from './useTransactions';
  export * from './useAccounts';
  export * from './useBudgets';
  // ... etc
  ```

- [ ] **Git Checkpoint**
  ```bash
  git add .
  git commit -m "refactor(hooks): migrate all hooks to application layer"
  ```

---

#### Task 0.3: Eliminar Services Legacy
**Tiempo:** 30 minutos  
**Priority:** 🔴 CRÍTICA

- [ ] **Verificar que repositorios cubran toda funcionalidad**
  - [ ] TransactionService ✓ → FirestoreTransactionRepository
  - [ ] AccountService ✓ → FirestoreAccountRepository
  - [ ] BudgetService ✓ → FirestoreBudgetRepository
  - [ ] CategoryService ✓ → FirestoreCategoryRepository
  - [ ] CreditCardService ✓ → FirestoreCreditCardRepository
  - [ ] RecurringService ✓ → FirestoreRecurringTransactionRepository
  - [ ] AlertService ✓ → FirestoreAlertRepository
  - [ ] SavingsGoalService ✓ → FirestoreSavingsGoalRepository

- [ ] **Eliminar archivos de services legacy**
  ```bash
  # Desde PowerShell
  Remove-Item -Path "src/lib/services/*.service.ts" -Force
  ```

- [ ] **Actualizar imports en código existente**
  - [ ] Buscar referencias a services old
  - [ ] Reemplazar por hooks de application layer

- [ ] **Git Checkpoint**
  ```bash
  git add .
  git commit -m "refactor(architecture): remove legacy services layer"
  ```

---

#### Task 0.4: Reorganizar Carpeta src/hooks Legacy
**Tiempo:** 15 minutos

- [ ] **Mover hooks de infraestructura**
  - [ ] `useOrganization.ts` → Mantener (es Context, no duplicado)
  - [ ] Verificar que no haya otros hooks necesarios

- [ ] **Eliminar carpeta si está vacía**
  ```bash
  # O mantenerla solo para hooks de infraestructura/context
  ```

- [ ] **Git Checkpoint & Tag de Fase**
  ```bash
  git add .
  git commit -m "refactor(architecture): consolidate folder structure"
  git tag -a v0.1.0 -m "Architecture consolidation complete"
  git push origin develop
  git push origin v0.1.0
  ```

---

## 🎯 Fase 1: Dominio Completo

**Objetivo:** Crear entidades de dominio puras y use cases faltantes  
**Tiempo estimado:** 3 horas  
**Tag:** `v0.2.0-domain-layer`  
**Dependencias:** Fase 0

### 📋 Checklist

#### Task 1.1: Crear Entidades del Dominio
**Tiempo:** 1 hora  
**Priority:** 🔴 CRÍTICA

- [ ] **Crear Transaction.ts (Entidad)**
  ```typescript
  // src/domain/entities/Transaction.ts
  /**
   * Transaction Domain Entity
   * Pure business object with validation rules
   */
  export class Transaction {
    constructor(
      public readonly id: string,
      public readonly type: TransactionType,
      public readonly amount: number,
      public readonly description: string,
      public readonly date: Date,
      public readonly accountId: string,
      public readonly categoryId: string,
      public readonly userId: string,
      public readonly tags?: string[],
      public readonly receiptUrl?: string,
      public readonly isInstallment?: boolean,
      public readonly installmentNumber?: number,
      public readonly totalInstallments?: number,
      public readonly installmentGroupId?: string,
      public readonly isRecurring?: boolean,
      public readonly recurringTransactionId?: string,
      public readonly creditCardId?: string,
      public readonly createdAt?: Date,
      public readonly updatedAt?: Date
    ) {
      this.validate();
    }

    private validate(): void {
      if (this.amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      if (!this.description || this.description.trim().length === 0) {
        throw new Error('Description is required');
      }
      if (this.isInstallment && (!this.totalInstallments || this.totalInstallments < 2)) {
        throw new Error('Installment transactions must have at least 2 installments');
      }
      // Más validaciones...
    }

    isExpense(): boolean {
      return this.type === 'EXPENSE';
    }

    isIncome(): boolean {
      return this.type === 'INCOME';
    }

    hasInstallments(): boolean {
      return this.isInstallment === true;
    }

    canBeEdited(): boolean {
      // Lógica: No se puede editar si es parte de cuotas ya pagadas
      return !this.isInstallment || this.installmentNumber === 1;
    }
  }
  ```

- [ ] **Crear Account.ts (Entidad)**
  ```typescript
  // src/domain/entities/Account.ts
  export class Account {
    constructor(
      public readonly id: string,
      public readonly name: string,
      public readonly type: AccountType,
      public balance: number, // Mutable
      public readonly currency: string,
      public isActive: boolean, // Mutable
      public readonly creditCardId?: string,
      public readonly creditLimit?: number,
      public readonly availableCredit?: number,
      public readonly cutoffDay?: number,
      public readonly paymentDueDay?: number,
      public readonly createdAt?: Date,
      public readonly updatedAt?: Date
    ) {
      this.validate();
    }

    private validate(): void {
      if (!this.name || this.name.trim().length === 0) {
        throw new Error('Account name is required');
      }
      if (this.type === 'CREDIT_CARD' && !this.creditLimit) {
        throw new Error('Credit card accounts must have a credit limit');
      }
    }

    updateBalance(amount: number, isIncome: boolean): void {
      if (isIncome) {
        this.balance += amount;
      } else {
        if (this.type !== 'CREDIT_CARD' && this.balance < amount) {
          throw new Error('Insufficient balance');
        }
        this.balance -= amount;
      }
    }

    hasAvailableBalance(amount: number): boolean {
      return this.type === 'CREDIT_CARD' || this.balance >= amount;
    }

    isCreditCard(): boolean {
      return this.type === 'CREDIT_CARD';
    }
  }
  ```

- [ ] **Crear Category.ts (Entidad)**
  ```typescript
  // src/domain/entities/Category.ts
  export class Category {
    constructor(
      public readonly id: string,
      public readonly name: string,
      public readonly type: CategoryType,
      public readonly icon: string,
      public readonly color: string,
      public readonly isSystem?: boolean // No se puede eliminar
    ) {
      this.validate();
    }

    private validate(): void {
      if (!this.name || this.name.trim().length === 0) {
        throw new Error('Category name is required');
      }
    }

    canBeDeleted(): boolean {
      return this.isSystem !== true;
    }
  }
  ```

- [ ] **Crear Budget.ts (Entidad)**
- [ ] **Crear CreditCard.ts (Entidad)**
- [ ] **Crear RecurringTransaction.ts (Entidad)**
- [ ] **Crear Alert.ts (Entidad)**
- [ ] **Crear SavingsGoal.ts (Entidad)**

- [ ] **Crear index.ts para exports**
  ```typescript
  // src/domain/entities/index.ts
  export * from './Transaction';
  export * from './Account';
  export * from './Category';
  export * from './Budget';
  export * from './CreditCard';
  export * from './RecurringTransaction';
  export * from './Alert';
  export * from './SavingsGoal';
  ```

- [ ] **Git Checkpoint**
  ```bash
  git add src/domain/entities/
  git commit -m "feat(domain): create pure domain entities with validation"
  ```

---

#### Task 1.2: Completar Use Cases de Transacciones
**Tiempo:** 1.5 horas  
**Priority:** 🔴 CRÍTICA

- [ ] **UpdateTransactionUseCase.ts**
  ```typescript
  // src/domain/use-cases/transactions/UpdateTransactionUseCase.ts
  export class UpdateTransactionUseCase extends BaseUseCase<
    UpdateTransactionInput,
    UpdateTransactionOutput
  > {
    constructor(
      private transactionRepo: ITransactionRepository,
      private accountRepo: IAccountRepository
    ) {
      super();
    }

    async execute(input: UpdateTransactionInput): Promise<UpdateTransactionOutput> {
      // 1. Obtener transacción original
      const original = await this.transactionRepo.getById(input.id);
      if (!original) {
        throw new Error('Transaction not found');
      }

      // 2. Verificar si es editable (no parte de cuotas pagadas)
      if (original.isInstallment && original.installmentNumber !== 1) {
        throw new Error('Cannot edit installment transactions directly');
      }

      // 3. Si cambió el monto, actualizar balance de cuenta
      if (input.amount && input.amount !== original.amount) {
        // Revertir balance original
        await this.revertAccountBalance(original);
        // Aplicar nuevo balance
        await this.applyAccountBalance(input, original.accountId);
      }

      // 4. Actualizar transacción
      await this.transactionRepo.update(input.id, input);

      return { transactionId: input.id };
    }

    private async revertAccountBalance(transaction: Transaction): Promise<void> {
      // Implementación...
    }

    private async applyAccountBalance(
      input: UpdateTransactionInput,
      accountId: string
    ): Promise<void> {
      // Implementación...
    }
  }
  ```

- [ ] **GetTransactionByIdUseCase.ts**
- [ ] **GetTransactionsByDateRangeUseCase.ts**
- [ ] **GetTransactionsByCategoryUseCase.ts**
- [ ] **GetTransactionsByAccountUseCase.ts**
- [ ] **GetTransactionStatisticsUseCase.ts**

- [ ] **Actualizar DIContainer con nuevos use cases**
  ```typescript
  // src/infrastructure/di/DIContainer.ts
  getUpdateTransactionUseCase(): UpdateTransactionUseCase {
    if (!this.updateTransactionUseCase) {
      this.updateTransactionUseCase = new UpdateTransactionUseCase(
        this.getTransactionRepository(),
        this.getAccountRepository()
      );
    }
    return this.updateTransactionUseCase;
  }
  ```

- [ ] **Git Checkpoint**
  ```bash
  git add src/domain/use-cases/transactions/
  git commit -m "feat(domain): complete all transaction use cases"
  ```

---

#### Task 1.3: Actualizar Mappers
**Tiempo:** 30 minutes

- [ ] **Actualizar TransactionMapper para usar entidades**
  ```typescript
  // src/infrastructure/mappers/TransactionMapper.ts
  import { Transaction } from '@/domain/entities/Transaction';

  export class TransactionMapper {
    static toDomain(data: any): Transaction {
      return new Transaction(
        data.id,
        data.type,
        data.amount,
        data.description,
        data.date?.toDate() || new Date(),
        data.accountId,
        data.categoryId,
        data.userId,
        data.tags,
        data.receiptUrl,
        data.isInstallment,
        data.installmentNumber,
        data.totalInstallments,
        data.installmentGroupId,
        data.isRecurring,
        data.recurringTransactionId,
        data.creditCardId,
        data.createdAt?.toDate(),
        data.updatedAt?.toDate()
      );
    }

    static toFirestore(entity: Transaction): any {
      // Convertir entidad a formato Firestore
      return {
        type: entity.type,
        amount: entity.amount,
        description: entity.description,
        date: Timestamp.fromDate(entity.date),
        accountId: entity.accountId,
        categoryId: entity.categoryId,
        userId: entity.userId,
        tags: entity.tags || [],
        // ...
      };
    }
  }
  ```

- [ ] **Git Checkpoint & Tag**
  ```bash
  git add .
  git commit -m "feat(infrastructure): update mappers to use domain entities"
  git tag -a v0.2.0 -m "Domain layer complete with entities and use cases"
  git push origin develop
  git push origin v0.2.0
  ```

---

## 🎨 Fase 2: Sistema de Categorías

**Objetivo:** Implementar categorías predeterminadas y CRUD completo  
**Tiempo estimado:** 2 horas  
**Tag:** `v0.3.0-categories-system`  
**Dependencias:** Fase 1

### 📋 Checklist

#### Task 2.1: Definir Categorías Predeterminadas
**Tiempo:** 30 minutos

- [ ] **Crear archivo de constantes**
  ```typescript
  // src/lib/constants/defaultCategories.ts
  import { Category } from '@/types/firestore';

  export const DEFAULT_EXPENSE_CATEGORIES: Omit<Category, 'id'>[] = [
    {
      name: 'Alimentación',
      type: 'EXPENSE',
      icon: '🍔',
      color: '#FF6B6B',
      isSystem: true,
    },
    {
      name: 'Transporte',
      type: 'EXPENSE',
      icon: '🚗',
      color: '#4ECDC4',
      isSystem: true,
    },
    {
      name: 'Servicios',
      type: 'EXPENSE',
      icon: '💡',
      color: '#FFE66D',
      isSystem: true,
    },
    {
      name: 'Entretenimiento',
      type: 'EXPENSE',
      icon: '🎮',
      color: '#A8E6CF',
      isSystem: true,
    },
    {
      name: 'Salud',
      type: 'EXPENSE',
      icon: '🏥',
      color: '#FF8B94',
      isSystem: true,
    },
    {
      name: 'Educación',
      type: 'EXPENSE',
      icon: '📚',
      color: '#95E1D3',
      isSystem: true,
    },
    {
      name: 'Vivienda',
      type: 'EXPENSE',
      icon: '🏠',
      color: '#F38181',
      isSystem: true,
    },
    {
      name: 'Ropa',
      type: 'EXPENSE',
      icon: '👕',
      color: '#AA96DA',
      isSystem: true,
    },
    {
      name: 'Otros Gastos',
      type: 'EXPENSE',
      icon: '📦',
      color: '#FCBAD3',
      isSystem: true,
    },
  ];

  export const DEFAULT_INCOME_CATEGORIES: Omit<Category, 'id'>[] = [
    {
      name: 'Salario',
      type: 'INCOME',
      icon: '💰',
      color: '#2ECC71',
      isSystem: true,
    },
    {
      name: 'Freelance',
      type: 'INCOME',
      icon: '💻',
      color: '#3498DB',
      isSystem: true,
    },
    {
      name: 'Inversiones',
      type: 'INCOME',
      icon: '📈',
      color: '#9B59B6',
      isSystem: true,
    },
    {
      name: 'Ventas',
      type: 'INCOME',
      icon: '🛒',
      color: '#1ABC9C',
      isSystem: true,
    },
    {
      name: 'Otros Ingresos',
      type: 'INCOME',
      icon: '💵',
      color: '#27AE60',
      isSystem: true,
    },
  ];
  ```

- [ ] **Git Checkpoint**
  ```bash
  git add src/lib/constants/defaultCategories.ts
  git commit -m "feat(categories): define default system categories"
  ```

---

#### Task 2.2: Implementar SeedDefaultCategoriesUseCase
**Tiempo:** 45 minutos

- [ ] **Completar implementación del use case**
  ```typescript
  // src/domain/use-cases/categories/SeedDefaultCategoriesUseCase.ts
  import { BaseUseCase } from '../base/BaseUseCase';
  import { ICategoryRepository } from '@/domain/repositories/ICategoryRepository';
  import {
    DEFAULT_EXPENSE_CATEGORIES,
    DEFAULT_INCOME_CATEGORIES,
  } from '@/lib/constants/defaultCategories';

  export class SeedDefaultCategoriesUseCase extends BaseUseCase<void, void> {
    constructor(private categoryRepo: ICategoryRepository) {
      super();
    }

    async execute(): Promise<void> {
      // 1. Verificar si ya existen categorías del sistema
      const existingCategories = await this.categoryRepo.getAll();
      const systemCategories = existingCategories.filter((c) => c.isSystem);

      if (systemCategories.length > 0) {
        console.log('System categories already exist, skipping seed');
        return;
      }

      // 2. Crear todas las categorías de gastos
      console.log('Seeding expense categories...');
      for (const category of DEFAULT_EXPENSE_CATEGORIES) {
        await this.categoryRepo.create(category);
      }

      // 3. Crear todas las categorías de ingresos
      console.log('Seeding income categories...');
      for (const category of DEFAULT_INCOME_CATEGORIES) {
        await this.categoryRepo.create(category);
      }

      console.log('✅ Default categories seeded successfully');
    }
  }
  ```

- [ ] **Crear hook para usar el seed**
  ```typescript
  // src/application/hooks/useCategories.ts
  export function useCategories() {
    const { currentOrgId } = useOrganization();
    const container = DIContainer.getInstance();
    container.setOrgId(currentOrgId || '');

    const seedCategoriesMutation = useMutation({
      mutationFn: async () => {
        const useCase = container.getSeedDefaultCategoriesUseCase();
        await useCase.execute();
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['categories', currentOrgId] });
        toast.success('Categorías inicializadas correctamente');
      },
    });

    return {
      // ... otros métodos
      seedCategories: seedCategoriesMutation.mutate,
      isSeeding: seedCategoriesMutation.isPending,
    };
  }
  ```

- [ ] **Git Checkpoint**
  ```bash
  git add .
  git commit -m "feat(categories): implement seed default categories use case"
  ```

---

#### Task 2.3: Auto-seed en Primera Carga
**Tiempo:** 45 minutes

- [ ] **Crear componente de inicialización**
  ```typescript
  // src/components/InitializeCategories.tsx
  'use client';

  import { useEffect, useState } from 'react';
  import { useCategories } from '@/application/hooks/useCategories';
  import { useOrganization } from '@/hooks/useOrganization';

  export function InitializeCategories() {
    const { currentOrgId } = useOrganization();
    const { categories, seedCategories, isSeeding } = useCategories();
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
      if (!currentOrgId || initialized || isSeeding) return;

      // Solo seed si no hay categorías
      if (categories && categories.length === 0) {
        console.log('No categories found, initializing...');
        seedCategories();
        setInitialized(true);
      }
    }, [currentOrgId, categories, initialized, isSeeding, seedCategories]);

    return null; // Componente invisible
  }
  ```

- [ ] **Agregar al layout del dashboard**
  ```typescript
  // src/app/(dashboard)/layout.tsx
  import { InitializeCategories } from '@/components/InitializeCategories';

  export default function DashboardLayout({ children }) {
    return (
      <>
        <InitializeCategories />
        {/* resto del layout */}
      </>
    );
  }
  ```

- [ ] **Git Checkpoint & Tag**
  ```bash
  git add .
  git commit -m "feat(categories): auto-seed on first organization load"
  git tag -a v0.3.0 -m "Categories system complete with auto-seed"
  git push origin develop
  git push origin v0.3.0
  ```

---

## ✅ Fase 3: Use Cases Completos

**Objetivo:** Implementar TODOS los use cases faltantes  
**Tiempo estimado:** 3 horas  
**Tag:** `v0.4.0-use-cases-complete`  
**Dependencias:** Fase 2

### 📋 Checklist

#### Task 3.1: Use Cases de Cuentas
**Tiempo:** 45 minutos

- [ ] **CreateAccountUseCase.ts**
- [ ] **UpdateAccountUseCase.ts**
- [ ] **DeleteAccountUseCase.ts**
- [ ] **GetAccountBalanceUseCase.ts**
- [ ] **TransferBetweenAccountsUseCase.ts** (verificar si existe)

- [ ] **Git Checkpoint**
  ```bash
  git add src/domain/use-cases/accounts/
  git commit -m "feat(domain): implement complete account use cases"
  ```

---

#### Task 3.2: Use Cases de Presupuestos
**Tiempo:** 45 minutos

- [ ] **CreateBudgetUseCase.ts**
- [ ] **UpdateBudgetUseCase.ts**
- [ ] **DeleteBudgetUseCase.ts**
- [ ] **CalculateBudgetUsageUseCase.ts** (verificar implementación)
- [ ] **CheckBudgetExceededUseCase.ts**

- [ ] **Git Checkpoint**
  ```bash
  git add src/domain/use-cases/budgets/
  git commit -m "feat(domain): implement complete budget use cases"
  ```

---

#### Task 3.3: Use Cases de Categorías
**Tiempo:** 30 minutos

- [ ] **CreateCategoryUseCase.ts**
- [ ] **UpdateCategoryUseCase.ts**
- [ ] **DeleteCategoryUseCase.ts** (con validación de transacciones existentes)
- [ ] **GetCategoriesByTypeUseCase.ts**

- [ ] **Git Checkpoint**
  ```bash
  git add src/domain/use-cases/categories/
  git commit -m "feat(domain): implement complete category use cases"
  ```

---

#### Task 3.4: Use Cases de Tarjetas de Crédito
**Tiempo:** 1 hora

- [ ] **CreateCreditCardUseCase.ts**
- [ ] **UpdateCreditCardUseCase.ts**
- [ ] **DeleteCreditCardUseCase.ts**
- [ ] **ProcessCreditCardPaymentUseCase.ts** (verificar)
- [ ] **CalculateCreditCardBalanceUseCase.ts**
- [ ] **GetUpcomingPaymentsUseCase.ts**

- [ ] **Git Checkpoint & Tag**
  ```bash
  git add .
  git commit -m "feat(domain): implement all remaining use cases"
  git tag -a v0.4.0 -m "All domain use cases implemented"
  git push origin develop
  git push origin v0.4.0
  ```

---

## 🛡️ Fase 4: Validadores y DTOs

**Objetivo:** Implementar validaciones robustas con Zod  
**Tiempo estimado:** 2 horas  
**Tag:** `v0.5.0-validation-layer`  
**Dependencias:** Fase 3

### 📋 Checklist

#### Task 4.1: Validadores de Transacciones
**Tiempo:** 45 minutos

- [ ] **Crear transactionValidator.ts**
  ```typescript
  // src/application/validators/transactionValidator.ts
  import { z } from 'zod';

  export const CreateTransactionSchema = z.object({
    type: z.enum(['INCOME', 'EXPENSE']),
    amount: z.number().positive('El monto debe ser mayor a 0'),
    description: z
      .string()
      .min(3, 'La descripción debe tener al menos 3 caracteres')
      .max(200, 'La descripción no puede exceder 200 caracteres'),
    date: z.date(),
    accountId: z.string().min(1, 'Debe seleccionar una cuenta'),
    categoryId: z.string().min(1, 'Debe seleccionar una categoría'),
    userId: z.string().min(1),
    tags: z.array(z.string()).optional(),
    creditCardId: z.string().optional(),
    installments: z.number().int().min(2).max(60).optional(),
  });

  export const UpdateTransactionSchema = z.object({
    id: z.string().min(1),
    amount: z.number().positive().optional(),
    description: z.string().min(3).max(200).optional(),
    date: z.date().optional(),
    accountId: z.string().optional(),
    categoryId: z.string().optional(),
    tags: z.array(z.string()).optional(),
  });

  export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
  export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;
  ```

- [ ] **Integrar validación en use cases**
  ```typescript
  // En CreateTransactionUseCase.ts
  async execute(input: CreateTransactionInput): Promise<CreateTransactionOutput> {
    // Validar input
    const validatedInput = CreateTransactionSchema.parse(input);
    
    // Resto de la lógica...
  }
  ```

- [ ] **Git Checkpoint**
  ```bash
  git add src/application/validators/transactionValidator.ts
  git commit -m "feat(validation): implement transaction validators with Zod"
  ```

---

#### Task 4.2: Validadores Restantes
**Tiempo:** 45 minutos

- [ ] **accountValidator.ts**
  ```typescript
  export const CreateAccountSchema = z.object({
    name: z.string().min(2).max(50),
    type: z.enum(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'CASH', 'INVESTMENT']),
    balance: z.number(),
    currency: z.string().default('CLP'),
    creditLimit: z.number().positive().optional(),
    // ...
  });
  ```

- [ ] **budgetValidator.ts**
- [ ] **categoryValidator.ts**
- [ ] **creditCardValidator.ts**

- [ ] **Git Checkpoint**
  ```bash
  git add src/application/validators/
  git commit -m "feat(validation): implement all entity validators"
  ```

---

#### Task 4.3: Completar DTOs Faltantes
**Tiempo:** 30 minutos

- [ ] **Verificar DTOs existentes**
  - [x] TransactionDTO.ts
  - [x] AccountDTO.ts
  - [x] BudgetDTO.ts
  - [ ] CategoryDTO.ts
  - [ ] CreditCardDTO.ts
  - [ ] AlertDTO.ts
  - [ ] SavingsGoalDTO.ts

- [ ] **Crear DTOs faltantes**

- [ ] **Git Checkpoint & Tag**
  ```bash
  git add .
  git commit -m "feat(dto): complete all DTO definitions"
  git tag -a v0.5.0 -m "Validation and DTO layer complete"
  git push origin develop
  git push origin v0.5.0
  ```

---

## 🎨 Fase 5: UI de Transacciones

**Objetivo:** Crear interfaz completa para registro de transacciones  
**Tiempo estimado:** 4 horas  
**Tag:** `v0.6.0-transactions-ui`  
**Dependencias:** Fase 4

### 📋 Checklist

#### Task 5.1: Componente de Formulario de Transacción
**Tiempo:** 2 horas  
**Priority:** 🔴 CRÍTICA

- [ ] **Crear TransactionForm.tsx**
  ```typescript
  // src/presentation/components/features/transactions/TransactionForm.tsx
  'use client';

  import { useForm } from 'react-hook-form';
  import { zodResolver } from '@hookform/resolvers/zod';
  import { CreateTransactionSchema, CreateTransactionInput } from '@/application/validators/transactionValidator';
  import { useTransactions } from '@/application/hooks/useTransactions';
  import { useAccounts } from '@/application/hooks/useAccounts';
  import { useCategories } from '@/application/hooks/useCategories';
  import { Button } from '@/components/ui/button';
  import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
  import { Input } from '@/components/ui/input';
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
  import { Calendar } from '@/components/ui/calendar';
  import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
  import { CalendarIcon } from 'lucide-react';
  import { format } from 'date-fns';
  import { es } from 'date-fns/locale';

  interface TransactionFormProps {
    onSuccess?: () => void;
    defaultValues?: Partial<CreateTransactionInput>;
  }

  export function TransactionForm({ onSuccess, defaultValues }: TransactionFormProps) {
    const { createTransaction, isCreating } = useTransactions();
    const { accounts } = useAccounts();
    const { categories } = useCategories();

    const form = useForm<CreateTransactionInput>({
      resolver: zodResolver(CreateTransactionSchema),
      defaultValues: {
        type: 'EXPENSE',
        date: new Date(),
        ...defaultValues,
      },
    });

    const selectedType = form.watch('type');
    const filteredCategories = categories?.filter((c) => c.type === selectedType) || [];

    const onSubmit = async (data: CreateTransactionInput) => {
      try {
        await createTransaction(data);
        form.reset();
        onSuccess?.();
      } catch (error) {
        console.error('Error creating transaction:', error);
      }
    };

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Campo: Tipo */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="INCOME">
                      <span className="flex items-center gap-2">
                        💰 Ingreso
                      </span>
                    </SelectItem>
                    <SelectItem value="EXPENSE">
                      <span className="flex items-center gap-2">
                        💸 Gasto
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Campo: Monto */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monto</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="10000"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Campo: Descripción */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Compra en supermercado" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Campo: Fecha */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, 'PPP', { locale: es }) : 'Seleccionar fecha'}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent>
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Campo: Cuenta */}
          <FormField
            control={form.control}
            name="accountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cuenta</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cuenta" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts?.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} - {account.type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Campo: Categoría */}
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {filteredCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <span className="flex items-center gap-2">
                          {category.icon} {category.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Botón Submit */}
          <Button type="submit" className="w-full" disabled={isCreating}>
            {isCreating ? 'Guardando...' : 'Guardar Transacción'}
          </Button>
        </form>
      </Form>
    );
  }
  ```

- [ ] **Git Checkpoint**
  ```bash
  git add src/presentation/components/features/transactions/TransactionForm.tsx
  git commit -m "feat(ui): create transaction form with validation"
  ```

---

#### Task 5.2: Modal de Creación Rápida
**Tiempo:** 45 minutos

- [ ] **Crear QuickTransactionModal.tsx**
  ```typescript
  // src/presentation/components/features/transactions/QuickTransactionModal.tsx
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
  import { Button } from '@/components/ui/button';
  import { Plus } from 'lucide-react';
  import { TransactionForm } from './TransactionForm';
  import { useState } from 'react';

  export function QuickTransactionModal() {
    const [open, setOpen] = useState(false);

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Transacción
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Nueva Transacción</DialogTitle>
          </DialogHeader>
          <TransactionForm onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    );
  }
  ```

- [ ] **Agregar al Header del dashboard**
  ```typescript
  // src/components/layout/Header.tsx
  import { QuickTransactionModal } from '@/presentation/components/features/transactions/QuickTransactionModal';

  export function Header() {
    return (
      <header>
        {/* ... */}
        <QuickTransactionModal />
      </header>
    );
  }
  ```

- [ ] **Git Checkpoint**
  ```bash
  git add .
  git commit -m "feat(ui): add quick transaction modal to header"
  ```

---

#### Task 5.3: Lista de Transacciones
**Tiempo:** 1 hora 15 minutos

- [ ] **Crear TransactionList.tsx**
  ```typescript
  // src/presentation/components/features/transactions/TransactionList.tsx
  import { Transaction } from '@/types/firestore';
  import { formatCurrency, formatDate } from '@/lib/utils/format';
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
  import { Badge } from '@/components/ui/badge';
  import { Button } from '@/components/ui/button';
  import { Edit, Trash2, Receipt } from 'lucide-react';

  interface TransactionListProps {
    transactions: Transaction[];
    onEdit?: (transaction: Transaction) => void;
    onDelete?: (transactionId: string) => void;
  }

  export function TransactionList({ transactions, onEdit, onDelete }: TransactionListProps) {
    if (transactions.length === 0) {
      return (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No hay transacciones para mostrar
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-2">
        {transactions.map((transaction) => (
          <Card key={transaction.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className={`
                  p-3 rounded-full
                  ${transaction.type === 'INCOME' ? 'bg-green-100' : 'bg-red-100'}
                `}>
                  {transaction.type === 'INCOME' ? '💰' : '💸'}
                </div>
                <div>
                  <p className="font-medium">{transaction.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(transaction.date)} · {transaction.categoryName || 'Sin categoría'}
                  </p>
                  {transaction.isInstallment && (
                    <Badge variant="outline" className="mt-1">
                      Cuota {transaction.installmentNumber}/{transaction.totalInstallments}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <p className={`
                  text-lg font-bold
                  ${transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}
                `}>
                  {transaction.type === 'INCOME' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </p>

                <div className="flex gap-2">
                  {transaction.receiptUrl && (
                    <Button variant="ghost" size="icon">
                      <Receipt className="h-4 w-4" />
                    </Button>
                  )}
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(transaction)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(transaction.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  ```

- [ ] **Crear página de transacciones**
  ```typescript
  // src/app/(dashboard)/transactions/page.tsx
  'use client';

  import { useState } from 'react';
  import { useTransactions } from '@/application/hooks/useTransactions';
  import { TransactionList } from '@/presentation/components/features/transactions/TransactionList';
  import { QuickTransactionModal } from '@/presentation/components/features/transactions/QuickTransactionModal';
  import { Button } from '@/components/ui/button';
  import { Download, Filter } from 'lucide-react';

  export default function TransactionsPage() {
    const [dateRange, setDateRange] = useState({
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      end: new Date(),
    });

    const { transactions, isLoading, deleteTransaction } = useTransactions(dateRange);

    const handleDelete = async (id: string) => {
      if (confirm('¿Estás seguro de eliminar esta transacción?')) {
        await deleteTransaction(id);
      }
    };

    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transacciones</h1>
            <p className="text-muted-foreground">
              Historial completo de ingresos y gastos
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <QuickTransactionModal />
          </div>
        </div>

        {isLoading ? (
          <div>Cargando transacciones...</div>
        ) : (
          <TransactionList
            transactions={transactions}
            onDelete={handleDelete}
          />
        )}
      </div>
    );
  }
  ```

- [ ] **Git Checkpoint & Tag**
  ```bash
  git add .
  git commit -m "feat(ui): create transactions list and page"
  git tag -a v0.6.0 -m "Transactions UI complete"
  git push origin develop
  git push origin v0.6.0
  ```

---

## 🔧 Fase 6: Integración y Testing

**Objetivo:** Integrar todo el sistema y agregar tests básicos  
**Tiempo estimado:** 3 horas  
**Tag:** `v0.7.0-integration-testing`  
**Dependencias:** Fase 5

### 📋 Checklist

#### Task 6.1: Actualización Automática de Balances
**Tiempo:** 1 hora

- [ ] **Verificar que CreateTransactionUseCase actualiza balances**
  ```typescript
  // En CreateTransactionUseCase.ts
  private async updateAccountBalance(
    accountId: string,
    amount: number,
    type: TransactionType
  ): Promise<void> {
    const account = await this.accountRepo.getById(accountId);
    if (!account) throw new Error('Account not found');

    if (type === 'INCOME') {
      account.balance += amount;
    } else {
      if (account.type !== 'CREDIT_CARD' && account.balance < amount) {
        throw new Error('Insufficient balance');
      }
      account.balance -= amount;
    }

    await this.accountRepo.update(accountId, { balance: account.balance });
  }
  ```

- [ ] **Verificar UpdateTransactionUseCase**
- [ ] **Verificar DeleteTransactionUseCase**

- [ ] **Git Checkpoint**
  ```bash
  git add .
  git commit -m "feat(integration): ensure account balance updates on transactions"
  ```

---

#### Task 6.2: Invalidación de Queries
**Tiempo:** 30 minutos

- [ ] **Verificar invalidaciones en hooks**
  ```typescript
  // En useTransactions.ts
  const createTransaction = useMutation({
    mutationFn: (input: CreateTransactionDTO) => createTransactionUseCase.execute(input),
    onSuccess: () => {
      // Invalidar transacciones
      queryClient.invalidateQueries({ queryKey: transactionKeys.all(orgId) });
      // Invalidar cuentas (balance cambió)
      queryClient.invalidateQueries({ queryKey: ['accounts', orgId] });
      // Invalidar dashboard stats
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', orgId] });
      // Invalidar presupuestos (uso cambió)
      queryClient.invalidateQueries({ queryKey: ['budgets', orgId] });
    },
  });
  ```

- [ ] **Git Checkpoint**
  ```bash
  git add .
  git commit -m "feat(integration): optimize query invalidations"
  ```

---

#### Task 6.3: Tests Básicos
**Tiempo:** 1.5 horas

- [ ] **Configurar Jest si no está**
  ```bash
  npm install --save-dev jest @testing-library/react @testing-library/jest-dom
  ```

- [ ] **Test para CreateTransactionUseCase**
  ```typescript
  // src/domain/use-cases/transactions/__tests__/CreateTransactionUseCase.test.ts
  import { CreateTransactionUseCase } from '../CreateTransactionUseCase';

  describe('CreateTransactionUseCase', () => {
    it('should create a transaction and update account balance', async () => {
      // Arrange
      const mockTransactionRepo = {
        create: jest.fn().mockResolvedValue('transaction-id'),
      };
      const mockAccountRepo = {
        getById: jest.fn().mockResolvedValue({
          id: 'account-1',
          balance: 10000,
          type: 'CHECKING',
        }),
        update: jest.fn(),
      };

      const useCase = new CreateTransactionUseCase(
        mockTransactionRepo as any,
        mockAccountRepo as any
      );

      // Act
      await useCase.execute({
        type: 'EXPENSE',
        amount: 5000,
        description: 'Test expense',
        date: new Date(),
        accountId: 'account-1',
        categoryId: 'category-1',
        userId: 'user-1',
      });

      // Assert
      expect(mockAccountRepo.update).toHaveBeenCalledWith('account-1', {
        balance: 5000,
      });
    });
  });
  ```

- [ ] **Test para TransactionForm.tsx**
- [ ] **Test para validadores**

- [ ] **Git Checkpoint & Tag**
  ```bash
  git add .
  git commit -m "test: add unit tests for core use cases"
  git tag -a v0.7.0 -m "Integration and basic testing complete"
  git push origin develop
  git push origin v0.7.0
  ```

---

## 🚀 Fase 7: Optimización y Deployment

**Objetivo:** Preparar para producción  
**Tiempo estimado:** 2 horas  
**Tag:** `v1.0.0-production-ready`  
**Dependencias:** Fase 6

### 📋 Checklist

#### Task 7.1: Índices Firestore
**Tiempo:** 30 minutos

- [ ] **Crear índices necesarios**
  ```javascript
  // firestore.indexes.json
  {
    "indexes": [
      {
        "collectionGroup": "transactions",
        "queryScope": "COLLECTION",
        "fields": [
          { "fieldPath": "date", "order": "DESCENDING" },
          { "fieldPath": "type", "order": "ASCENDING" }
        ]
      },
      {
        "collectionGroup": "transactions",
        "queryScope": "COLLECTION",
        "fields": [
          { "fieldPath": "accountId", "order": "ASCENDING" },
          { "fieldPath": "date", "order": "DESCENDING" }
        ]
      },
      {
        "collectionGroup": "transactions",
        "queryScope": "COLLECTION",
        "fields": [
          { "fieldPath": "categoryId", "order": "ASCENDING" },
          { "fieldPath": "date", "order": "DESCENDING" }
        ]
      }
    ]
  }
  ```

- [ ] **Deployar índices**
  ```bash
  firebase deploy --only firestore:indexes
  ```

- [ ] **Git Checkpoint**
  ```bash
  git add firestore.indexes.json
  git commit -m "perf(firestore): add query indexes for performance"
  ```

---

#### Task 7.2: Optimistic Updates
**Tiempo:** 45 minutos

- [ ] **Implementar en createTransaction**
  ```typescript
  const createTransaction = useMutation({
    mutationFn: (input: CreateTransactionDTO) => createTransactionUseCase.execute(input),
    onMutate: async (newTransaction) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: transactionKeys.all(orgId) });

      // Snapshot previous value
      const previousTransactions = queryClient.getQueryData(transactionKeys.all(orgId));

      // Optimistically update
      queryClient.setQueryData(transactionKeys.all(orgId), (old: any) => [
        { ...newTransaction, id: 'temp-id' },
        ...(old || []),
      ]);

      return { previousTransactions };
    },
    onError: (err, newTransaction, context) => {
      // Rollback on error
      queryClient.setQueryData(
        transactionKeys.all(orgId),
        context?.previousTransactions
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all(orgId) });
    },
  });
  ```

- [ ] **Git Checkpoint**
  ```bash
  git add .
  git commit -m "perf(ui): implement optimistic updates for transactions"
  ```

---

#### Task 7.3: Error Boundaries
**Tiempo:** 30 minutos

- [ ] **Crear ErrorBoundary component**
  ```typescript
  // src/components/ErrorBoundary.tsx
  'use client';

  import React from 'react';
  import { AlertCircle } from 'lucide-react';
  import { Button } from '@/components/ui/button';

  export class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error?: Error }
  > {
    constructor(props: any) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
      if (this.state.hasError) {
        return (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center max-w-md">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Algo salió mal</h2>
              <p className="text-muted-foreground mb-4">
                {this.state.error?.message || 'Error desconocido'}
              </p>
              <Button onClick={() => window.location.reload()}>
                Recargar página
              </Button>
            </div>
          </div>
        );
      }

      return this.props.children;
    }
  }
  ```

- [ ] **Envolver app en ErrorBoundary**
- [ ] **Git Checkpoint**
  ```bash
  git add .
  git commit -m "feat(error-handling): add error boundary"
  ```

---

#### Task 7.4: Documentation Final
**Tiempo:** 15 minutos

- [ ] **Actualizar README.md principal**
- [ ] **Documentar arquitectura final**
- [ ] **Crear CHANGELOG.md**
  ```markdown
  # Changelog

  ## [1.0.0] - 2026-03-29

  ### Added
  - Sistema completo de transacciones (CRUD)
  - Formulario de registro de ingresos y gastos
  - Categorías predeterminadas con auto-seed
  - Actualización automática de balances de cuentas
  - Validación robusta con Zod
  - Clean Architecture con separación de capas
  - Tests unitarios para use cases críticos
  - Optimistic updates
  - Error boundaries

  ### Changed
  - Migración de services legacy a repositories
  - Consolidación de hooks en application layer
  - Uso de entidades de dominio puras

  ### Removed
  - Services legacy en src/lib/services/
  - Hooks duplicados en src/hooks/
  ```

- [ ] **Git Checkpoint & Tag Final**
  ```bash
  git add .
  git commit -m "docs: update documentation for v1.0.0 release"
  git tag -a v1.0.0 -m "Production ready - Transactions system complete"
  git push origin develop
  git push origin main  # Merge develop a main
  git push origin --tags
  ```

---

## ✅ Verificación Final

### Checklist de Calidad

- [ ] **Arquitectura**
  - [ ] ✅ Clean Architecture implementada
  - [ ] ✅ Separación de capas correcta
  - [ ] ✅ Dependencias apuntan hacia adentro
  - [ ] ✅ No hay duplicación de código

- [ ] **Funcionalidad**
  - [ ] ✅ Se pueden crear transacciones
  - [ ] ✅ Se pueden editar transacciones
  - [ ] ✅ Se pueden eliminar transacciones
  - [ ] ✅ Balance se actualiza automáticamente
  - [ ] ✅ Categorías se cargan automáticamente
  - [ ] ✅ Validaciones funcionan correctamente

- [ ] **UI/UX**
  - [ ] ✅ Formulario intuitivo
  - [ ] ✅ Feedback visual (loading, success, error)
  - [ ] ✅ Responsive en móvil
  - [ ] ✅ Accesible (WCAG AA)

- [ ] **Performance**
  - [ ] ✅ Queries optimizadas
  - [ ] ✅ Índices Firestore creados
  - [ ] ✅ Optimistic updates
  - [ ] ✅ Cache con React Query

- [ ] **Testing**
  - [ ] ✅ Use cases principales testeados
  - [ ] ✅ Validadores testeados
  - [ ] ✅ Componentes críticos testeados

- [ ] **Deployment**
  - [ ] ✅ Variables de entorno configuradas
  - [ ] ✅ Build sin errores
  - [ ] ✅ Firestore rules actualizadas
  - [ ] ✅ Índices deployados

---

## 📊 Métricas de Éxito

### KPIs Técnicos
- ✅ **Test Coverage:** > 70%
- ✅ **Build Time:** < 2 minutos
- ✅ **Bundle Size:** < 300KB (initial load)
- ✅ **Lighthouse Score:** > 90

### KPIs de Negocio
- ✅ Usuario puede registrar una transacción en < 30 segundos
- ✅ Balance se actualiza en tiempo real (< 1 segundo)
- ✅ Categorías se cargan automáticamente en primera carga
- ✅ 0 duplicación de código entre capas

---

## 🎯 Próximos Pasos (Post v1.0.0)

### v1.1.0 - Transacciones Avanzadas
- [ ] Adjuntar recibos/facturas
- [ ] Transacciones recurrentes automáticas
- [ ] Transacciones por cuotas/installments
- [ ] Búsqueda y filtros avanzados

### v1.2.0 - Reportes
- [ ] Exportar a Excel
- [ ] Exportar a PDF
- [ ] Gráficos personalizados
- [ ] Comparativas mensuales

### v1.3.0 - Multi-usuario
- [ ] Compartir transacciones
- [ ] Aprobación de gastos
- [ ] Notificaciones push

---

## 📝 Notas Importantes

### Comandos Git Útiles

```bash
# Ver todas las tags
git tag -l

# Ver commits de una fase
git log v0.1.0..v0.2.0 --oneline

# Revertir a una versión
git checkout v0.5.0

# Crear branch desde una tag
git checkout -b hotfix/v1.0.1 v1.0.0

# Comparar branches
git diff develop main
```

### Estrategia de Branches

```
main (production)
└── develop (desarrollo activo)
    ├── feature/transaction-form
    ├── feature/categories-system
    ├── refactor/architecture-consolidation
    └── fix/balance-update-bug
```

### Convenciones de Commits

```bash
feat(scope): add new feature
fix(scope): fix bug
refactor(scope): refactor code
docs(scope): update documentation
test(scope): add tests
perf(scope): improve performance
style(scope): format code
chore(scope): update build process
```

---

**¿Listo para comenzar? 🚀**

Ejecuta la Fase 0, Task 0.1 primero y sigue el checklist paso a paso.
