# Clean Architecture - Aplicación de Control Financiero

## Visión General

Este proyecto implementa **Clean Architecture** (Arquitectura Limpia) para lograr:

- ✅ **Separación de preocupaciones**: Cada capa tiene responsabilidades claras
- ✅ **Independencia de frameworks**: La lógica de negocio no depende de tecnologías específicas
- ✅ **Testabilidad**: Las capas se pueden probar de forma independiente
- ✅ **Mantenibilidad**: Cambios localizados sin efectos colaterales
- ✅ **Escalabilidad**: Fácil de extender con nuevas funcionalidades

---

## Arquitectura de 4 Capas

```
┌─────────────────────────────────────────────────────────┐
│            CAPA DE PRESENTACIÓN (UI)                    │
│  src/presentation/                                      │
│  - Componentes React                                    │
│  - Páginas y Layouts                                    │
│  - Estilos y Assets                                     │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────┐
│           CAPA DE APLICACIÓN                            │
│  src/application/                                       │
│  - Hooks (React Query)                                  │
│  - DTOs (Data Transfer Objects)                         │
│  - Validators                                           │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────┐
│              CAPA DE DOMINIO                            │
│  src/domain/                                            │
│  - Entities (tipos de negocio)                          │
│  - Repository Interfaces                                │
│  - Use Cases (lógica de negocio)                        │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ↓
┌─────────────────────────────────────────────────────────┐
│          CAPA DE INFRAESTRUCTURA                        │
│  src/infrastructure/                                    │
│  - Repository Implementations (Firestore)               │
│  - Mappers (Firestore ↔ Domain)                        │
│  - DI Container (Dependency Injection)                  │
│  - External Services                                    │
└─────────────────────────────────────────────────────────┘
```

---

## Flujo de Datos (Data Flow)

### Ejemplo: Crear una Transacción

```
1. USER ACTION (Click "Guardar Transacción")
   ↓
2. COMPONENT [TransactionForm.tsx]
   - Captura datos del formulario
   - Valida campos básicos
   ↓
3. HOOK [useTransactions.ts]
   - createTransaction.mutate(dto)
   ↓
4. USE CASE [CreateTransactionUseCase]
   - Valida reglas de negocio
   - Verifica saldo suficiente
   - Coordina múltiples operaciones
   ↓
5. REPOSITORIES [TransactionRepo, AccountRepo]
   - Persiste transacción en Firestore
   - Actualiza balance de cuenta
   ↓
6. MAPPER [TransactionMapper]
   - Convierte Domain Entity → Firestore Document
   ↓
7. FIRESTORE
   - Almacena datos
```

### Respuesta de Datos

```
FIRESTORE
   ↓
MAPPER [toDomain]
   ↓
REPOSITORY [getAll]
   ↓
HOOK [React Query Cache]
   ↓
COMPONENT [Re-render with new data]
```

---

## Descripción de Capas

### 1. Capa de Presentación (`src/presentation/`)

**Responsabilidad**: Interfaz de usuario y experiencia del usuario

**Contenido**:
- `components/` - Componentes React reutilizables
  - `shared/` - Botones, Inputs, Modales, etc.
  - `features/` - Componentes específicos de funcionalidades
- `pages/` - Páginas de la aplicación (Next.js)
- `layouts/` - Layouts compartidos

**Reglas**:
- ❌ NO debe contener lógica de negocio
- ❌ NO debe acceder directamente a repositorios
- ✅ Solo usa hooks de la capa de aplicación
- ✅ Presenta datos y captura eventos del usuario

**Ejemplo**:
```typescript
// ✅ CORRECTO
import { useTransactions } from '@/application/hooks';

function TransactionList() {
  const { useAllTransactions, createTransaction } = useTransactions(orgId);
  const { data: transactions } = useAllTransactions();
  
  return (
    <div>
      {transactions?.map(tx => <TransactionCard key={tx.id} data={tx} />)}
    </div>
  );
}

// ❌ INCORRECTO - No acceder directamente al servicio
import { TransactionService } from '@/lib/services';
const service = new TransactionService(orgId); // ❌ NO
```

---

### 2. Capa de Aplicación (`src/application/`)

**Responsabilidad**: Orquestar el flujo de la aplicación

**Contenido**:
- `hooks/` - Custom hooks con React Query
- `dto/` - Data Transfer Objects (estructuras de datos para API)
- `validators/` - Validaciones de entrada

**Reglas**:
- ✅ Usa use cases del dominio
- ✅ Gestiona estado con React Query
- ✅ Maneja caché e invalidación de queries
- ❌ NO contiene lógica de negocio compleja

**Ejemplo**:
```typescript
// src/application/hooks/useTransactions.ts
export function useTransactions(orgId: string) {
  const container = DIContainer.getInstance();
  container.setOrgId(orgId);
  
  const createTransactionUseCase = container.getCreateTransactionUseCase();
  
  const createTransaction = useMutation({
    mutationFn: (input: CreateTransactionDTO) => 
      createTransactionUseCase.execute(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
  
  return { createTransaction };
}
```

---

### 3. Capa de Dominio (`src/domain/`)

**Responsabilidad**: Lógica de negocio pura e interfaces

**Contenido**:
- `entities/` - Tipos de dominio (Transaction, Account, etc.)
- `repositories/` - **Interfaces** de repositorios (contratos)
- `use-cases/` - Casos de uso (lógica de negocio)

**Reglas**:
- ✅ Contiene TODA la lógica de negocio
- ✅ Define contratos (interfaces) pero NO implementaciones
- ❌ NO depende de frameworks externos (React, Firestore, etc.)
- ❌ NO conoce detalles de infraestructura

**Ejemplo**:
```typescript
// src/domain/use-cases/transactions/CreateTransactionUseCase.ts
export class CreateTransactionUseCase extends BaseUseCase<Input, Output> {
  constructor(
    private transactionRepo: ITransactionRepository,
    private accountRepo: IAccountRepository
  ) {
    super();
  }

  async execute(input: CreateTransactionInput): Promise<Output> {
    // Validar cuenta existe
    const account = await this.accountRepo.getById(input.accountId);
    if (!account) throw new Error('Account not found');
    
    // Validar saldo suficiente (LÓGICA DE NEGOCIO)
    if (input.type === 'EXPENSE' && account.balance < input.amount) {
      throw new Error('Insufficient balance');
    }
    
    // Crear transacción
    const txId = await this.transactionRepo.create(input);
    
    // Actualizar balance
    await this.accountRepo.updateBalance(
      account.id,
      account.balance - input.amount
    );
    
    return { transactionId: txId };
  }
}
```

---

### 4. Capa de Infraestructura (`src/infrastructure/`)

**Responsabilidad**: Implementaciones concretas y detalles técnicos

**Contenido**:
- `repositories/` - Implementaciones de repositorios (Firestore)
- `mappers/` - Conversión Firestore ↔ Domain
- `di/` - Dependency Injection Container
- `external/` - APIs externas, servicios

**Reglas**:
- ✅ Implementa interfaces definidas en el dominio
- ✅ Maneja detalles de Firestore, HTTP, etc.
- ✅ Convierte datos externos a entidades de dominio
- ❌ NO contiene lógica de negocio

**Ejemplo**:
```typescript
// src/infrastructure/repositories/FirestoreTransactionRepository.ts
export class FirestoreTransactionRepository implements ITransactionRepository {
  private collectionPath: string;

  constructor(orgId: string) {
    this.collectionPath = `organizations/${orgId}/transactions`;
  }

  async create(data: Omit<Transaction, 'id'>): Promise<string> {
    const ref = collection(db, this.collectionPath);
    const firestoreData = TransactionMapper.toFirestore(data);
    const docRef = await addDoc(ref, firestoreData);
    return docRef.id;
  }
  
  async getById(id: string): Promise<Transaction | null> {
    const docRef = doc(db, this.collectionPath, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    return TransactionMapper.toDomain({ id: docSnap.id, ...docSnap.data() });
  }
  
  // ... más métodos
}
```

---

## Dependency Injection (DI) Container

### ¿Qué es?

Un **contenedor de inyección de dependencias** que crea y gestiona instancias de repositorios y use cases.

### ¿Por qué?

- ✅ Desacoplamiento: Los use cases no crean sus propias dependencias
- ✅ Testing: Fácil reemplazar implementaciones con mocks
- ✅ Configuración centralizada
- ✅ Lifecycle management (singleton para repositorios)

### Uso

```typescript
// Configurar organización (una vez al inicio)
const container = DIContainer.getInstance();
container.setOrgId(currentOrgId);

// Obtener repositorio
const transactionRepo = container.getTransactionRepository();

// Obtener use case (con dependencias inyectadas automáticamente)
const createTransactionUseCase = container.getCreateTransactionUseCase();

// Ejecutar
const result = await createTransactionUseCase.execute({
  type: 'EXPENSE',
  amount: 5000,
  description: 'Compra supermercado',
  accountId: 'abc123',
  categoryId: 'cat456',
  userId: 'user789',
  date: new Date(),
});
```

---

## Patrones Implementados

### 1. Repository Pattern

**Definición**: Abstrae el acceso a datos detrás de interfaces

**Ventajas**:
- Cambia de Firestore a PostgreSQL sin tocar lógica de negocio
- Testing fácil con mocks
- Centraliza queries

```typescript
// Interface (Domain Layer)
export interface ITransactionRepository extends IRepository<Transaction> {
  getByDateRange(start: Date, end: Date): Promise<Transaction[]>;
}

// Implementation (Infrastructure Layer)
export class FirestoreTransactionRepository implements ITransactionRepository {
  async getByDateRange(start: Date, end: Date): Promise<Transaction[]> {
    // Firestore-specific implementation
  }
}
```

---

### 2. Use Case Pattern

**Definición**: Cada use case representa UNA operación de negocio

**Ventajas**:
- Lógica de negocio aislada
- Fácil de entender y mantener
- Reutilizable

**Estructura**:
```typescript
export class [NombreOperacion]UseCase extends BaseUseCase<Input, Output> {
  constructor(private repo1: IRepo1, private repo2: IRepo2) {
    super();
  }

  async execute(input: Input): Promise<Output> {
    // 1. Validaciones
    // 2. Lógica de negocio
    // 3. Coordinación de repositorios
    // 4. Retornar resultado
  }
}
```

---

### 3. Mapper Pattern

**Definición**: Convierte entre representaciones de datos

**Ventajas**:
- Aísla detalles de Firestore
- Maneja conversiones de Timestamp ↔ Date
- Centraliza transformaciones

```typescript
export class TransactionMapper {
  static toDomain(data: DocumentData & { id: string }): Transaction {
    return {
      id: data.id,
      amount: data.amount,
      date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
      // ...
    };
  }

  static toFirestore(data: Omit<Transaction, 'id'>): DocumentData {
    return {
      amount: data.amount,
      date: Timestamp.fromDate(data.date),
      // ...
    };
  }
}
```

---

## Guía de Desarrollo

### ¿Dónde coloco mi código?

#### Nuevo componente visual
→ `src/presentation/components/`

#### Nueva página
→ `src/presentation/pages/`

#### Nueva operación de negocio
→ `src/domain/use-cases/[módulo]/[Operacion]UseCase.ts`

#### Nuevo método de acceso a datos
→ Agregar a interfaz en `src/domain/repositories/I[Nombre]Repository.ts`
→ Implementar en `src/infrastructure/repositories/Firestore[Nombre]Repository.ts`

#### Nuevo hook para UI
→ `src/application/hooks/use[Nombre].ts`

#### Nuevo DTO
→ `src/application/dto/[Nombre]DTO.ts`

---

### Ejemplo Completo: Agregar Transferencia entre Cuentas

#### 1. Crear Input/Output DTOs

```typescript
// src/application/dto/AccountDTO.ts
export interface TransferBetweenAccountsDTO {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string;
  userId: string;
}
```

#### 2. Agregar método a las interfaces de repositorio

```typescript
// src/domain/repositories/IAccountRepository.ts
export interface IAccountRepository extends IRepository<Account> {
  transfer(
    fromId: string,
    toId: string,
    amount: number,
    description: string
  ): Promise<[string, string]>; // Returns transaction IDs
}
```

#### 3. Implementar en repositorio Firestore

```typescript
// src/infrastructure/repositories/FirestoreAccountRepository.ts
async transfer(
  fromId: string,
  toId: string,
  amount: number,
  description: string
): Promise<[string, string]> {
  // Implementation with Firestore
  // ...
}
```

#### 4. Crear Use Case

```typescript
// src/domain/use-cases/accounts/TransferBetweenAccountsUseCase.ts
export class TransferBetweenAccountsUseCase 
  extends BaseUseCase<TransferBetweenAccountsDTO, Output> {
  
  constructor(private accountRepo: IAccountRepository) {
    super();
  }

  async execute(input: TransferBetweenAccountsDTO): Promise<Output> {
    // Validations
    const from = await this.accountRepo.getById(input.fromAccountId);
    if (!from) throw new Error('Source account not found');
    if (from.balance < input.amount) throw new Error('Insufficient funds');
    
    // Execute transfer
    const txIds = await this.accountRepo.transfer(
      input.fromAccountId,
      input.toAccountId,
      input.amount,
      input.description
    );
    
    return { success: true, transactionIds: txIds };
  }
}
```

#### 5. Agregar al DI Container

```typescript
// src/infrastructure/di/DIContainer.ts
getTransferBetweenAccountsUseCase(): TransferBetweenAccountsUseCase {
  return new TransferBetweenAccountsUseCase(this.getAccountRepository());
}
```

#### 6. Usar en Hook

```typescript
// src/application/hooks/useAccounts.ts
export function useAccounts(orgId: string) {
  const container = DIContainer.getInstance();
  const transferUseCase = container.getTransferBetweenAccountsUseCase();
  
  const transfer = useMutation({
    mutationFn: (input: TransferBetweenAccountsDTO) => 
      transferUseCase.execute(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
  
  return { transfer };
}
```

#### 7. Usar en Componente

```typescript
// src/presentation/components/features/accounts/TransferForm.tsx
import { useAccounts } from '@/application/hooks';

function TransferForm() {
  const { transfer } = useAccounts(orgId);
  
  const handleSubmit = (data: FormData) => {
    transfer.mutate({
      fromAccountId: data.from,
      toAccountId: data.to,
      amount: data.amount,
      description: data.description,
      userId: currentUserId,
    });
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

## Reglas de Oro

### ✅ DO (Hacer)

1. **Mantener la dirección de dependencia**: Presentation → Application → Domain ← Infrastructure
2. **Usar interfaces en use cases**, no implementaciones concretas
3. **Toda la lógica de negocio en use cases**, no en hooks o componentes
4. **Usar mappers** para convertir entre Firestore y Domain
5. **Un use case = una operación de negocio**

### ❌ DON'T (No hacer)

1. **No acceder a servicios/repositorios desde componentes** - Usa hooks
2. **No poner lógica de negocio en hooks** - Crea use cases
3. **No mezclar capas** - Respeta las fronteras
4. **No crear dependencias circulares**
5. **No saltarte el DI Container** - No instancies repositorios directamente

---

## Testing

### Unit Tests (Jest)

#### Use Cases
```typescript
describe('CreateTransactionUseCase', () => {
  it('should create transaction and update account balance', async () => {
    // Mock repositories
    const mockTransactionRepo = {
      create: jest.fn().mockResolvedValue('tx123'),
    };
    const mockAccountRepo = {
      getById: jest.fn().mockResolvedValue({ id: 'acc1', balance: 10000 }),
      updateBalance: jest.fn(),
    };
    
    // Create use case with mocks
    const useCase = new CreateTransactionUseCase(
      mockTransactionRepo as any,
      mockAccountRepo as any
    );
    
    // Execute
    const result = await useCase.execute({
      type: 'EXPENSE',
      amount: 5000,
      accountId: 'acc1',
      // ...
    });
    
    // Assert
    expect(result.transactionId).toBe('tx123');
    expect(mockAccountRepo.updateBalance).toHaveBeenCalledWith('acc1', 5000);
  });
});
```

#### Repositories
```typescript
describe('FirestoreTransactionRepository', () => {
  it('should create transaction in Firestore', async () => {
    // Use Firebase emulator or mock Firestore
  });
});
```

### Integration Tests (Playwright)

```typescript
test('should create transaction from UI', async ({ page }) => {
  await page.goto('/transactions');
  await page.click('[data-testid="new-transaction"]');
  await page.fill('[name="amount"]', '5000');
  await page.click('[data-testid="save"]');
  
  await expect(page.locator('[data-testid="transaction-list"]'))
    .toContainText('5000');
});
```

---

## Migración Progresiva

### Estrategia

1. ✅ **Fase 0**: Crear estructura Clean Architecture (COMPLETADO)
2. ⏳ **Fase 1**: Migrar Dashboard (próximo)
3. ⏳ **Fase 2**: Migrar Transacciones
4. ⏳ **Fase 3**: Migrar resto de módulos

### Coexistencia

Durante la migración, **ambos sistemas coexisten**:

```
OLD: src/hooks/useTransactions.ts (usa TransactionService)
NEW: src/application/hooks/useTransactions.ts (usa Use Cases + DI)
```

Migra componentes gradualmente:

```typescript
// Componente antiguo
import { useTransactions } from '@/hooks/useTransactions';

// Componente nuevo
import { useTransactions } from '@/application/hooks/useTransactions';
```

---

## Recursos Adicionales

### Documentos relacionados
- `docs/arquitectura.md` - Arquitectura general del proyecto
- `docs/funcionalidades.md` - Lista de funcionalidades por módulo
- `docs/ejemplos-codigo.md` - Ejemplos de implementación

### Referencias externas
- [Clean Architecture (Robert C. Martin)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Dependency Injection](https://en.wikipedia.org/wiki/Dependency_injection)

---

## Mantenimiento

### Actualizar esta documentación

- Al agregar nuevos patrones o prácticas
- Al cambiar la estructura de carpetas
- Al identificar anti-patrones comunes

### Code Review Checklist

- [ ] ¿El código está en la capa correcta?
- [ ] ¿La lógica de negocio está en use cases?
- [ ] ¿Se usan interfaces en lugar de implementaciones concretas?
- [ ] ¿Se usa el DI Container para obtener dependencias?
- [ ] ¿Los mappers están actualizados?
- [ ] ¿Los hooks invalidan las queries correctas?

---

## Preguntas Frecuentes (FAQ)

### ¿Por qué Clean Architecture en vez de MVC?

Clean Architecture nos da:
- Independencia de frameworks (podemos cambiar React por Vue)
- Testabilidad superior (mocks fáciles)
- Separación clara de responsabilidades
- Escalabilidad a largo plazo

### ¿No es demasiado boilerplate?

Para proyectos pequeños, sí puede parecer excesivo. Pero este proyecto tiene:
- 11 módulos principales
- Múltiples integraciones (Firestore, Auth, APIs externas)
- Equipo de desarrollo
- Mantenimiento a largo plazo

→ La inversión en arquitectura se paga en mantenibilidad.

### ¿Puedo saltarme capas?

❌ NO. La dirección de dependencia es crítica:
- Presentation → Application → Domain ← Infrastructure

Si necesitas algo del dominio en la presentación, pasa por la capa de aplicación (hooks).

### ¿Cuándo crear un nuevo use case?

Cuando tienes una **operación de negocio que**:
1. Coordina múltiples repositorios
2. Tiene validaciones de negocio
3. Es reutilizable en varios lugares
4. Tiene complejidad que no cabe en un hook

---

**Última actualización**: Diciembre 2024  
**Versión**: 1.0
