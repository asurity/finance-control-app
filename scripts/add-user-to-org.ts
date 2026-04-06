/**
 * Script para Agregar Usuario Existente a Organización
 * 
 * Usa Firebase Admin SDK (bypasea reglas de seguridad).
 * Ambos (usuario y organización) deben existir previamente.
 * 
 * Uso: npm run add-user
 */

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

// Inicializar Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'cuentas-financieras-0625-firebase-adminsdk-fbsvc-d97375c92b.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account file not found at:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(
  fs.readFileSync(serviceAccountPath, 'utf8')
) as ServiceAccount;

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// 🔧 CONFIGURACIÓN - Modifica estos datos
const EXISTING_USER_ID = 'Sy36q08EyiOZ1jxeHgVPZsb96mN2';
const EXISTING_ORG_ID = 'QorVu0F4Y73evZrK6BF8';
// Roles válidos: 'OWNER' | 'ADMIN' | 'ACCOUNTANT' | 'USER' | 'VIEWER'
const ROLE = 'USER';

async function addUserToOrganization() {
  try {
    console.log('🚀 Agregando usuario existente a organización...\n');
    console.log('👤 Usuario UID:', EXISTING_USER_ID);
    console.log('🏢 Organización:', EXISTING_ORG_ID);
    console.log('🎭 Rol:', ROLE);
    console.log('');

    // 1. Verificar que la organización existe
    console.log('1️⃣ Verificando organización...');
    const orgDoc = await db.collection('organizations').doc(EXISTING_ORG_ID).get();
    
    if (!orgDoc.exists) {
      throw new Error(`La organización ${EXISTING_ORG_ID} no existe en Firestore`);
    }
    
    const orgData = orgDoc.data()!;
    console.log(`   ✅ Organización encontrada: "${orgData.name}"`);

    // 2. Verificar que el usuario existe
    console.log('\n2️⃣ Verificando usuario...');
    const userDoc = await db.collection('users').doc(EXISTING_USER_ID).get();
    
    if (!userDoc.exists) {
      throw new Error(`El usuario ${EXISTING_USER_ID} no existe en Firestore`);
    }
    
    const userData = userDoc.data()!;
    console.log(`   ✅ Usuario encontrado: "${userData.name}" (${userData.email})`);

    // 3. Verificar que no exista ya el membership
    console.log('\n3️⃣ Verificando membership existente...');
    const membershipId = `${EXISTING_ORG_ID}_${EXISTING_USER_ID}`;
    const memberDoc = await db.collection('organizationMembers').doc(membershipId).get();
    
    if (memberDoc.exists) {
      console.log(`   ⚠️ Ya es miembro con rol: ${memberDoc.data()!.role}`);
      console.log('   No se realizaron cambios.');
      process.exit(0);
    }

    // 4. Crear membership
    console.log('\n4️⃣ Creando membership...');
    await db.collection('organizationMembers').doc(membershipId).set({
      organizationId: EXISTING_ORG_ID,
      userId: EXISTING_USER_ID,
      role: ROLE,
      joinedAt: Timestamp.now(),
    });
    console.log(`   ✅ Membership creado: ${membershipId}`);

    // Resumen
    console.log('\n' + '='.repeat(70));
    console.log('✨ ¡Usuario agregado exitosamente a la organización!');
    console.log('='.repeat(70));
    console.log(`\n   👤 ${userData.name} (${userData.email})`);
    console.log(`   🏢 ${orgData.name}`);
    console.log(`   🎭 Rol: ${ROLE}\n`);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

addUserToOrganization()
  .then(() => {
    console.log('✅ Script finalizado correctamente\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error crítico:', error);
    process.exit(1);
  });
