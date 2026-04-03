/**
 * Firebase Admin SDK Configuration
 * Para uso server-side en API Routes
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App;
let adminAuth: Auth;
let adminDb: Firestore;

/**
 * Inicializa Firebase Admin SDK (singleton)
 * Usa credenciales del archivo JSON o variables de entorno
 */
function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    adminAuth = getAuth(adminApp);
    adminDb = getFirestore(adminApp);
    return;
  }

  try {
    // Intenta cargar credenciales desde variable de entorno
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccount) {
      const credentials = JSON.parse(serviceAccount);
      adminApp = initializeApp({
        credential: cert(credentials),
      });
    } else {
      // Modo desarrollo: construye credenciales desde variables de entorno individuales
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
          'Faltan credenciales de Firebase Admin. ' +
          'Configura FIREBASE_SERVICE_ACCOUNT_KEY o las variables individuales ' +
          '(FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)'
        );
      }

      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'), // Decodificar saltos de línea
        }),
      });
    }

    adminAuth = getAuth(adminApp);
    adminDb = getFirestore(adminApp);
    
    console.log('[Firebase Admin] Inicializado correctamente');
  } catch (error) {
    console.error('[Firebase Admin] Error al inicializar:', error);
    throw error;
  }
}

// Inicializar en la primera importación
initializeFirebaseAdmin();

export { adminApp, adminAuth, adminDb };
