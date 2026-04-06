# Sistema de Permisos y Roles

## Roles Disponibles

La aplicación define los siguientes roles para miembros de una organización:

| Rol | Permisos | Descripción |
|-----|----------|-------------|
| `OWNER` | Todos los permisos | Propietario de la organización. Control total. |
| `ADMIN` | read, write, delete, manage_users | Administrador con permisos completos excepto transferir ownership. |
| `ACCOUNTANT` | read, write | Contador. Puede leer y modificar datos financieros. |
| `USER` | read, write | Usuario estándar. Puede leer y crear/editar registros. |
| `VIEWER` | read | Solo lectura. No puede modificar nada. |

## Permisos por Entidad

### Categorías

Las categorías tienen las siguientes restricciones según el rol:

- **Leer**: Todos los roles pueden leer categorías
- **Crear**: `OWNER`, `ADMIN`, `ACCOUNTANT`, `USER`
- **Editar**: `OWNER`, `ADMIN`, `ACCOUNTANT`, `USER`
- **Eliminar**: Solo `OWNER` y `ADMIN`

### Otras Entidades

Por defecto, las siguientes entidades siguen el mismo patrón:
- Cuentas (Accounts)
- Transacciones (Transactions)
- Presupuestos (Budgets)
- Tarjetas de Crédito (Credit Cards)
- Transacciones Recurrentes (Recurring Transactions)
- Metas de Ahorro (Savings Goals)
- Alertas (Alerts)

## Implementación

### 1. Reglas de Firestore

Las reglas de seguridad en `firestore.rules.production` verifican los permisos en el backend:

```javascript
// Helper para verificar si un usuario puede escribir
function canWrite(orgId) {
  let role = getUserRole(orgId);
  return role in ['OWNER', 'ADMIN', 'ACCOUNTANT', 'USER'];
}

// Helper para verificar si un usuario puede eliminar
function canDelete(orgId) {
  let role = getUserRole(orgId);
  return role in ['OWNER', 'ADMIN'];
}

// Ejemplo de aplicación en categorías
match /categories/{categoryId} {
  allow read: if isAuthenticated() && isMemberOfOrg(resource.data.orgId);
  allow create: if isAuthenticated() && isMemberOfOrg(request.resource.data.orgId) && canWrite(request.resource.data.orgId);
  allow update: if isAuthenticated() && isMemberOfOrg(resource.data.orgId) && canWrite(resource.data.orgId);
  allow delete: if isAuthenticated() && isMemberOfOrg(resource.data.orgId) && canDelete(resource.data.orgId);
}
```

### 2. Frontend - Hook useOrganization

El hook `useOrganization` proporciona un helper `hasPermission()` para verificar permisos en el frontend:

```typescript
const { hasPermission } = useOrganization();

// Verificar permiso específico
const canEdit = hasPermission('write');
const canDelete = hasPermission('delete');
```

### 3. Componentes UI

Los componentes deben deshabilitar botones y funcionalidades según los permisos:

```tsx
<Button
  onClick={handleCreate}
  disabled={!canWrite}
  title={!canWrite ? 'No tienes permisos para crear categorías' : ''}
>
  Nueva Categoría
</Button>
```

## Notas Importantes

1. **El rol `MEMBER` NO EXISTE**: Si ves referencias a este rol en scripts antiguos, debe ser reemplazado por uno de los roles válidos (generalmente `USER`).

2. **Validación en Dos Capas**: 
   - Backend (Firestore Rules): Seguridad real, no puede ser bypasseada
   - Frontend (React): UX mejorada, evita intentos fallidos

3. **Categorías del Sistema**: Las categorías marcadas como `isSystem: true` no pueden ser editadas ni eliminadas por ningún usuario, independientemente de su rol.

## Cambios Realizados

### Archivos Modificados

1. **`scripts/add-user-to-org.ts`**: Corregido rol `MEMBER` por `USER`
2. **`firestore.rules.production`**: Agregadas funciones `canWrite()` y `canDelete()` y aplicadas a categorías
3. **`src/hooks/useOrganization.ts`**: Agregado helper `hasPermission()`
4. **`src/app/(dashboard)/budgets/page.tsx`**: Agregada validación de permisos en botones
5. **`src/presentation/components/features/budgets/CategoryAllocationTable.tsx`**: Agregadas props `canWrite` y `canDelete` y aplicadas a botones de edición/eliminación

## Testing de Permisos

Para probar los permisos:

1. Crear usuarios con diferentes roles en la organización
2. Iniciar sesión con cada usuario
3. Verificar que:
   - Los `VIEWER` no vean botones de crear/editar/eliminar
   - Los `USER` vean botones de crear/editar pero no de eliminar
   - Los `OWNER` y `ADMIN` vean todos los botones

## Próximos Pasos Recomendados

1. Aplicar el mismo patrón de permisos a otras entidades (cuentas, presupuestos, etc.)
2. Agregar tests unitarios para el helper `hasPermission()`
3. Agregar tests de integración para las reglas de Firestore
4. Considerar agregar un sistema de auditoría para acciones sensibles
