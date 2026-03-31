/**
 * Script para Agregar Usuario a Organización Existente
 * 
 * Este script crea un usuario en Firebase Auth y lo vincula a una organización existente
 * sin crear una nueva organización personal.
 * 
 * Uso: npm run add-user
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno desde .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';

// Configuración de Firebase (leer desde .env.local)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🔧 CONFIGURACIÓN - Modifica estos datos
const NEW_USER = {
  email: 'carreronc@gmail.com',              // 📧 Email de tu esposa
  password: 'Temporal2026!',                  // 🔒 Contraseña temporal (que ella cambie después)
  name: 'Nieves Carrero',                     // 👤 Nombre completo
};

const EXISTING_ORG_ID = 'PEfURLowIyfxHbs66CpW'; // 🏢 ID de tu organización existente
const ROLE = 'MEMBER'; // Opciones: 'OWNER', 'ADMIN', 'MEMBER'

async function addUserToOrganization() {
  try {
    console.log('🚀 Iniciando proceso de agregar usuario a organización...\n');
    console.log('📦 Proyecto:', firebaseConfig.projectId);
    console.log('👤 Usuario:', NEW_USER.email);
    console.log('🏢 Organización:', EXISTING_ORG_ID);
    console.log('🎭 Rol:', ROLE);
    console.log('');

    // 1. Verificar que la organización existe
    console.log('1️⃣ Verificando organización...');
    const orgRef = doc(db, 'organizations', EXISTING_ORG_ID);
    const orgDoc = await getDoc(orgRef);
    
    if (!orgDoc.exists()) {
      throw new Error(`❌ La organización ${EXISTING_ORG_ID} no existe en Firestore`);
    }
    
    const orgData = orgDoc.data();
    console.log(`   ✅ Organización encontrada: "${orgData.name}"`);

    // 2. Crear usuario en Firebase Auth
    console.log('\n2️⃣ Creando usuario en Firebase Auth...');
    const { user: firebaseUser } = await createUserWithEmailAndPassword(
      auth,
      NEW_USER.email,
      NEW_USER.password
    );
    console.log(`   ✅ Usuario creado en Auth: ${firebaseUser.uid}`);

    // 3. Crear documento en collection 'users'
    console.log('\n3️⃣ Creando documento en Firestore...');
    const userDocData = {
      email: NEW_USER.email,
      name: NEW_USER.name,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), userDocData);
    console.log(`   ✅ Documento creado en colección 'users'`);

    // 4. Crear membership vinculando al usuario con la organización existente
    console.log('\n4️⃣ Creando membership...');
    const membershipId = `${EXISTING_ORG_ID}_${firebaseUser.uid}`;
    const memberDocData = {
      organizationId: EXISTING_ORG_ID,
      userId: firebaseUser.uid,
      role: ROLE,
      joinedAt: Timestamp.now(),
    };

    await setDoc(doc(db, 'organizationMembers', membershipId), memberDocData);
    console.log(`   ✅ Membership creado: ${membershipId}`);

    // Resumen final
    console.log('\n' + '='.repeat(70));
    console.log('✨ ¡Usuario agregado exitosamente!');
    console.log('='.repeat(70));
    console.log('\n📊 Resumen:');
    console.log(`   👤 Usuario ID: ${firebaseUser.uid}`);
    console.log(`   📧 Email: ${NEW_USER.email}`);
    console.log(`   👤 Nombre: ${NEW_USER.name}`);
    console.log(`   🏢 Organización: ${orgData.name} (${EXISTING_ORG_ID})`);
    console.log(`   🎭 Rol: ${ROLE}`);
    console.log('\n🔐 Credenciales de acceso:');
    console.log(`   Email: ${NEW_USER.email}`);
    console.log(`   Password: ${NEW_USER.password}`);
    console.log('\n⚠️  IMPORTANTE: Pídele que cambie su contraseña después del primer login');
    console.log('');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'auth/email-already-in-use') {
      console.log('\n💡 El email ya está registrado. Si necesitas agregarlo a otra organización,');
      console.log('   puedes crear el membership manualmente en Firestore.');
    }
    process.exit(1);
  }
}

// Ejecutar el script
addUserToOrganization()
  .then(() => {
    console.log('✅ Script finalizado correctamente\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error crítico:', error);
    process.exit(1);
  });
