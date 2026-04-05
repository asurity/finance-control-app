# Migración del Sistema de Voz a Firebase Functions

## ✅ Completado

Se migró exitosamente `/api/voice/session` de Next.js API Route a Firebase Cloud Function.

### Archivos creados/modificados:

**Firebase Functions:**
- ✅ `functions/src/shared/admin.ts` - Firebase Admin SDK
- ✅ `functions/src/shared/voice-config.ts` - Configuración del voice agent
- ✅ `functions/src/shared/AdminVoiceUsageRepository.ts` - Repositorio de rate limiting
- ✅ `functions/src/voice-session.ts` - Función HTTP principal
- ✅ `functions/src/index.ts` - Export de función

**Cliente:**
- ✅ `src/components/voice/VoiceProvider.tsx` - Actualizado para usar variable de entorno
- ✅ `.env.local` - Agregada `NEXT_PUBLIC_VOICE_SESSION_URL` (emulador local)
- ✅ `.env.production` - Agregada `NEXT_PUBLIC_VOICE_SESSION_URL` (producción)

**Build:**
- ✅ Functions compiladas sin errores TypeScript

---

## 🚀 Pasos para Deployment

### 1. Configurar OPENAI_API_KEY como Secret (OBLIGATORIO)

La función ya está configurada para usar Firebase Secrets. Debes configurar tu API key:

**Opción A: Usando Firebase CLI (recomendado)**

```bash
# Configurar el secret
firebase functions:secrets:set OPENAI_API_KEY

# Te pedirá que pegues la key (presiona Enter después de pegarla):
# YOUR_OPENAI_API_KEY_HERE...
```

**Opción B: Desde Firebase Console**

1. Ve a [Firebase Console > Functions > Secrets](https://console.firebase.google.com/project/cuentas-financieras-0625/functions/secrets)
2. Click "Create Secret"
3. Nombre: `OPENAI_API_KEY`
4. Valor: Tu API key de OpenAI
5. Grant access to functions

**⚠️ Sin este paso, la función fallará en producción con error 503.**

### 2. Testing Local (con emulador)

**Configurar secret para emulador local:**

Crea el archivo `functions/.secret.local`:

```bash
OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE
```

⚠️ Este archivo está gitignored, no lo subas a Git.

**Arrancar emuladores:**

```bash
# Terminal 1: Emuladores de Firebase (incluye functions)
firebase emulators:start

# Terminal 2: Build frontend estático
npm run build

# Terminal 3: Servir frontend en puerto 3001
npx serve out -p 3001
```

Abre http://localhost:3001 y prueba el sistema de voz.

**URL del emulador:** `http://127.0.0.1:5001/cuentas-financieras-0625/us-central1/voiceSession`

**Verificar logs en tiempo real:**
Los logs aparecerán en la terminal donde corriste `firebase emulators:start`

### 3. Deploy a Producción

**⚠️ IMPORTANTE: Antes de deployar, asegúrate de haber configurado el secret `OPENAI_API_KEY` en Firebase (Paso 1).**

```bash
# 1. Compilar frontend estático
npm run build

# 2. Deploy completo (hosting + functions)
npm run deploy:full

# O deploy solo functions (si ya deployaste hosting antes)
firebase deploy --only functions

# O deploy específico de una función
firebase deploy --only functions:voiceSession
```

**Primera vez deployando functions con secrets:**

Si es tu primer deploy con secrets, Firebase te pedirá confirmar:

```
? Would you like to grant service account access to secret OPENAI_API_KEY? Yes
```

Responde **Yes** para que la función pueda acceder al secret.

### 4. Verificar en Producción

1. Abre https://cuentas-financieras-0625.web.app
2. Inicia sesión
3. Abre el modal de voz (botón micrófono)
4. Verifica en Console que llama a: `https://us-central1-cuentas-financieras-0625.cloudfunctions.net/voiceSession`

---

## 🔍 Debugging

### Ver logs en tiempo real:

```bash
firebase functions:log --only voiceSession
```

### Ver logs en Firebase Console:

https://console.firebase.google.com/project/cuentas-financieras-0625/functions/logs

### Verificar que la función está deployada:

```bash
firebase functions:list
```

Deberías ver:
```
┌──────────────┬────────┬──────────────┐
│   Function   │ Status │   Region     │
├──────────────┼────────┼──────────────┤
│ voiceSession │ ACTIVE │ us-central1  │
└──────────────┴────────┴──────────────┘
```

---

## ⚠️ Importante: Eliminar API Route obsoleta

Una vez verificado que funciona en producción, elimina:
- `src/app/api/voice/session/route.ts` (obsoleto)
- `src/app/api/voice/session/route.test.ts` (obsoleto)

---

## 📊 Costos Estimados

**Firebase Functions:**
- Plan Blaze requerido (pago por uso)
- ~1000 invocaciones gratis/mes
- Después: $0.40 por millón de invocaciones
- Con 1000 comandos/día/usuario: ~$12/mes por 1000 usuarios

**OpenAI Realtime API:**
- Audio input: $0.06/min
- Audio output: $0.24/min  
- Text tokens: ~$0.01/1K tokens
- Con 15 seg/comando, 50 tokens respuesta: ~$0.02 por comando

---

## 🎯 Siguiente Fase

Con esto completado, puedes:
1. ✅ Deployar a producción con arquitectura estática + functions
2. ✅ Sistema de voz funcional end-to-end
3. ⏭️ FASE 8: Cleanup final (eliminar archivos obsoletos, actualizar README)
