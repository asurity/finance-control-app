# Configuración de Variables de Entorno - Sistema de Voz

## ✅ Configuración Actual (Gemini)

El sistema de voz utiliza **Gemini 2.5 Flash-Lite** como proveedor de IA principal, con reducción de costos del 97-100% respecto a OpenAI.

### Pasos para configurar:

1. **Crear archivo `.env.local`** en la raíz del proyecto (si no existe):

```bash
# En PowerShell:
cd "c:\Proyectos Asurity\finance-control-app"
Copy-Item .env.local.example .env.local
```

2. **Editar `.env.local`** y agregar tu API Key de Gemini:

```env
# Firebase Configuration (ya deberías tenerlas configuradas)
NEXT_PUBLIC_FIREBASE_API_KEY=tu-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=tu-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Gemini Configuration (REQUERIDO para Voice Agent)
GEMINI_API_KEY=AIza-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Voice Agent Configuration (REQUERIDO)
NEXT_PUBLIC_ENABLE_VOICE_AGENT=true
NEXT_PUBLIC_AI_PROVIDER=gemini

# --- LEGACY: Solo para rollback ---
# OpenAI Configuration (DEPRECADO - Solo mantener si necesitas rollback)
# OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE
```
QUERIDO):
   - Ve a: https://aistudio.google.com/apikey
   - Crea una nueva API Key (empieza con `AIza...`)
   - Cópiala y pégala en `.env.local` como `GEMINI_API_KEY`
   - **Costo**: $0.00/mes (tier gratuito) o ~$0.05/día con uso intensivo
   
   **Solo para Rollback - OpenAI API Key** (DEPRECADO):
   - ⚠️ Solo necesaria si cambias `NEXT_PUBLIC_AI_PROVIDER=openai` temporalmente
   - Ve a: https://platform.openai.com/api-keys
   - Crea una nueva API Key (empieza con `sk-proj-...`)
   - **Costo**: $50-100/mes (97-100% más caro que Gemini)
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
