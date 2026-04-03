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

  // Intenta cargar credenciales desde variable de entorno
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (serviceAccount) {
    try {
      const credentials = JSON.parse(serviceAccount);
      adminApp = initializeApp({
        credential: cert(credentials),
      });
    } catch (error) {
      throw new Error('Error al parsear FIREBASE_SERVICE_ACCOUNT_KEY: ' + error);
    }
  } else {
    // Modo desarrollo: usa Application Default Credentials
    // o el archivo JSON de credenciales en la raíz del proyecto
    adminApp = initializeApp({
      credential: cert(require('../../../cuentas-financieras-0625-firebase-adminsdk-fbsvc-d97375c92b.json')),
    });
  }

  adminAuth = getAuth(adminApp);
  adminDb = getFirestore(adminApp);
}

// Inicializar en la primera importación
initializeFirebaseAdmin();

export { adminApp, adminAuth, adminDb };
