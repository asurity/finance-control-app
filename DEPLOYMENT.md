# 🚀 Guía de Deployment - Control Financiero

## 📋 Información del Proyecto Firebase

- **Project ID**: `cuentas-financieras-0625`
- **Región**: `us-central1`
- **Base de datos**: Firestore (database: "finanzas")

## 🌐 Dominios

Una vez desplegado, la aplicación estará disponible en:

- **Dominio principal**: https://cuentas-financieras-0625.web.app
- **Dominio alternativo**: https://cuentas-financieras-0625.firebaseapp.com

### Configurar Dominio Personalizado (Opcional)

Si deseas usar un dominio propio (ej: `app.asurity.cl`):

```bash
firebase hosting:channel:deploy production --expires 30d
firebase hosting:sites:create asurity-finance
firebase hosting:sites:update asurity-finance --add-domain app.asurity.cl
```

## 📦 Prerequisitos

1. **Firebase CLI instalado**
   ```bash
   npm install -g firebase-tools
   ```

2. **Autenticación en Firebase**
   ```bash
   firebase login
   ```

3. **Verificar proyecto**
   ```bash
   firebase projects:list
   firebase use cuentas-financieras-0625
   ```

## 🔧 Configuración del Proyecto

### 1. Variables de Entorno

Crear archivo `.env.local` (para desarrollo):
```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=cuentas-financieras-0625.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=cuentas-financieras-0625
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=cuentas-financieras-0625.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=tu-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=tu-measurement-id
```

Crear archivo `.env.production` (para producción):
```env
# Mismo contenido que .env.local
# Next.js automáticamente usará este archivo en build de producción
```

### 2. Configuración Next.js

El archivo `next.config.ts` ya está configurado con:
- `output: 'export'` - Genera sitio estático
- `images.unoptimized: true` - Para Firebase Hosting
- `distDir: 'out'` - Directorio de build

### 3. Configuración Firebase

El archivo `firebase.json` ya está configurado con:
- **Hosting**: Apunta a la carpeta `out` (build de Next.js)
- **Firestore**: Database "finanzas" en us-central1
- **Functions**: Linting y build automatizado
- **Storage**: Reglas de seguridad
- **Auth**: Providers configurados

El archivo `.firebaserc` define el proyecto `cuentas-financieras-0625`.

## 🚀 Deployment

### Opción 1: Deploy Solo Hosting (Recomendado para cambios de UI)

```bash
npm run deploy
```

Este comando:
1. Ejecuta `next build` - Genera el sitio estático en `/out`
2. Ejecuta `firebase deploy --only hosting` - Sube solo el hosting

### Opción 2: Deploy Completo (Hosting + Functions + Firestore + Storage)

```bash
npm run deploy:full
```

Este comando despliega:
- Hosting (aplicación Next.js)
- Cloud Functions
- Reglas de Firestore
- Reglas de Storage

### Opción 3: Deploy Manual Paso a Paso

```bash
# 1. Build de Next.js
npm run build

# 2. Preview local del build
npx serve out

# 3. Deploy a Firebase Hosting
firebase deploy --only hosting

# 4. Deploy de Firestore rules
firebase deploy --only firestore:rules

# 5. Deploy de Storage rules
firebase deploy --only storage

# 6. Deploy de Functions
firebase deploy --only functions
```

## 🧪 Preview Deployments (Testing)

Firebase permite crear deployments temporales para testing:

```bash
# Crear preview channel
firebase hosting:channel:deploy preview-feature-x

# Ver lista de channels
firebase hosting:channel:list

# Eliminar channel
firebase hosting:channel:delete preview-feature-x
```

URL de preview: `https://cuentas-financieras-0625--preview-feature-x.web.app`

## 📊 Verificación Post-Deploy

Después del deployment, verificar:

1. **Aplicación cargando correctamente**
   - Abrir: https://cuentas-financieras-0625.web.app
   - Verificar login/signup funciona
   - Verificar dashboard carga

2. **Firebase Console**
   - Firestore: https://console.firebase.google.com/project/cuentas-financieras-0625/firestore
   - Authentication: https://console.firebase.google.com/project/cuentas-financieras-0625/authentication
   - Hosting: https://console.firebase.google.com/project/cuentas-financieras-0625/hosting

3. **Logs de errores**
   ```bash
   firebase hosting:logs
   ```

## 🔄 Rollback (Volver a Versión Anterior)

Firebase guarda historial de deployments:

```bash
# Ver historial
firebase hosting:versions:list

# Rollback a versión específica
firebase hosting:rollback
```

O desde la consola:
https://console.firebase.google.com/project/cuentas-financieras-0625/hosting/sites

## 🛡️ Security Checklist Pre-Deploy

- [ ] Variables de entorno configuradas correctamente
- [ ] `.env.local` NO está en git (añadir a `.gitignore`)
- [ ] Firestore rules actualizadas y testeadas
- [ ] Storage rules actualizadas
- [ ] Authentication providers habilitados
- [ ] CORS configurado correctamente
- [ ] SSL/TLS habilitado (automático en Firebase)
- [ ] Rate limiting configurado en Functions

## 📈 Monitoreo y Analytics

### Firebase Performance Monitoring

```bash
# Habilitar Performance Monitoring
firebase init performance
```

### Analytics

La aplicación ya incluye Firebase Analytics. Para ver métricas:
https://console.firebase.google.com/project/cuentas-financieras-0625/analytics

## 💰 Costos Estimados

**Firebase Spark Plan (Gratis)**:
- ✅ Hosting: 10 GB storage, 360 MB/day bandwidth
- ✅ Firestore: 1 GB storage, 50K reads, 20K writes/day
- ✅ Authentication: Ilimitado
- ✅ Cloud Functions: 125K invocations/month

**Firebase Blaze Plan (Pay-as-you-go)**:
- Hosting: $0.026/GB storage, $0.15/GB bandwidth
- Firestore: $0.18/GB storage, $0.06/100K reads
- Functions: $0.40/million invocations

## 🔧 Troubleshooting

### Error: "Permission denied" al desplegar

```bash
firebase login --reauth
firebase use cuentas-financieras-0625
```

### Error: Build falla

```bash
# Limpiar cache
rm -rf .next out node_modules
npm install
npm run build
```

### Error: Firestore rules no aplican

```bash
# Verificar reglas localmente
firebase emulators:start --only firestore

# Re-deploy rules
firebase deploy --only firestore:rules
```

### Error: 404 en rutas de Next.js

Verificar que `firebase.json` tenga la configuración correcta:
```json
"rewrites": [
  {
    "source": "**",
    "destination": "/index.html"
  }
]
```

## 📞 Soporte

- **Firebase Console**: https://console.firebase.google.com/project/cuentas-financieras-0625
- **Documentación Firebase**: https://firebase.google.com/docs
- **Next.js Static Export**: https://nextjs.org/docs/app/building-your-application/deploying/static-exports
- **Equipo Asurity**: info@asurity.cl

---

**Última actualización**: 29 de Marzo, 2026
**Versión**: v0.6.0-period-reports
