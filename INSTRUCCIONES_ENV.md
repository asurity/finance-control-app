# Configuración de Variables de Entorno - Sistema de Voz

## ❌ Error Actual

```
POST http://localhost:3000/api/voice/session/ 500 (Internal Server Error)
Access to fetch at 'https://api.openai.com/v1/realtime' has been blocked by CORS
```

## ✅ Solución

El sistema de voz **requiere** que exista un archivo `.env.local` con la configuración de OpenAI API.

### Pasos para configurar:

1. **Crear archivo `.env.local`** en la raíz del proyecto (si no existe):

```bash
# En PowerShell:
cd "c:\Proyectos Asurity\finance-control-app"
Copy-Item .env.local.example .env.local
```

2. **Editar `.env.local`** y agregar tu API Key de OpenAI:

```env
# Firebase Configuration (ya deberías tenerlas configuradas)
NEXT_PUBLIC_FIREBASE_API_KEY=tu-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=tu-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# OpenAI Configuration (LEGACY - Fase de migración)
OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE

# Gemini Configuration (REQUERIDO para Voice Agent)
GEMINI_API_KEY=AIza-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Voice Agent Configuration (REQUERIDO)
NEXT_PUBLIC_ENABLE_VOICE_AGENT=true
NEXT_PUBLIC_AI_PROVIDER=gemini
```

3. **Obtener tu Gemini API Key** (RECOMENDADO - Más económico):
   - Ve a: https://aistudio.google.com/apikey
   - Crea una nueva API Key (empieza con `AIza...`)
   - Cópiala y pégala en `.env.local` como `GEMINI_API_KEY`
   
   **OPCIONAL - OpenAI API Key** (Legacy):
   - Ve a: https://platform.openai.com/api-keys
   - Crea una nueva API Key (empieza con `sk-proj-...`)
   - Solo necesaria si mantienes `NEXT_PUBLIC_AI_PROVIDER=openai`

4. **Reiniciar el servidor**:
   ```bash
   # Detener el servidor (Ctrl+C en la terminal donde corre npm run dev)
   # Reiniciar:
   npm run dev
   ```

5. **Verificar que funciona**:
   - Abre http://localhost:3000
   - Login
   - Clic en botón de micrófono
   - Hacer push-to-talk

## 🔒 Seguridad

- ✅ `.env.local` está en `.gitignore` - NO se subirá a git
- ✅ La API Key NUNCA se expone al navegador
- ✅ Solo el servidor Next.js tiene acceso a `OPENAI_API_KEY`

## 🧪 Verificación Rápida

Para verificar que las variables están cargadas correctamente:

```bash
# En PowerShell:
cd "c:\Proyectos Asurity\finance-control-app"
node -e "require('dotenv').config({ path: '.env.local' }); console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'CONFIGURADA ✓' : 'NO CONFIGURADA ✗')"
```

Debería mostrar: `GEMINI_API_KEY: CONFIGURADA ✓`

**Verificación Legacy (OpenAI):**
```bash
node -e "require('dotenv').config({ path: '.env.local' }); console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'CONFIGURADA ✓' : 'NO CONFIGURADA ✗')"
```
