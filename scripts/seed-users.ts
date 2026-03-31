/**
 * Script de Seeding - Crear 3 Usuarios de Prueba
 * 
 * Este script crea 3 usuarios en Firebase Auth y sus documentos correspondientes en Firestore:
 * - Collection: users
 * - Collection: organizations
 * - Collection: organizationMembers
 * 
 * Uso: npm run seed:users
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno desde .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';

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

// Datos de los 3 usuarios de prueba
const testUsers = [
  {
    email: 'maria.gonzalez@test.com',
    password: 'Test123456!',
    name: 'María González',
    orgType: 'PERSONAL' as const,
  },
  {
    email: 'carlos.rodriguez@test.com',
    password: 'Test123456!',
    name: 'Carlos Rodríguez',
    orgType: 'PERSONAL' as const,
  },
  {
    email: 'empresa.demo@test.com',
    password: 'Test123456!',
    name: 'Empresa Demo S.A.',
    orgType: 'BUSINESS' as const,
  },
];

async function createUser(userData: typeof testUsers[0]) {
  try {
    console.log(`\n📝 Creando usuario: ${userData.email}`);

    // 1. Crear usuario en Firebase Auth
    const { user: firebaseUser } = await createUserWithEmailAndPassword(
      auth,
      userData.email,
      userData.password
    );
    console.log(`   ✅ Usuario creado en Auth: ${firebaseUser.uid}`);

    // 2. Crear documento en collection 'users'
    const userDocData = {
      email: userData.email,
      name: userData.name,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), userDocData);
    console.log(`   ✅ Documento creado en 'users'`);

    // 3. Crear organización en collection 'organizations'
    const orgId = `${firebaseUser.uid}-${userData.orgType.toLowerCase()}`;
    const orgName = userData.orgType === 'PERSONAL' 
      ? `${userData.name} - Personal`
      : userData.name;

    const orgDocData = {
      name: orgName,
      type: userData.orgType,
      ownerId: firebaseUser.uid,
      createdAt: Timestamp.now(),
    };

    await setDoc(doc(db, 'organizations', orgId), orgDocData);
    console.log(`   ✅ Organización creada: ${orgId}`);

    // 4. Crear membership en collection 'organizationMembers'
    const membershipId = `${orgId}_${firebaseUser.uid}`;
    const memberDocData = {
      organizationId: orgId,
      userId: firebaseUser.uid,
      role: 'OWNER',
      joinedAt: Timestamp.now(),
    };

    await setDoc(doc(db, 'organizationMembers', membershipId), memberDocData);
    console.log(`   ✅ Membership creado: ${membershipId}`);

    console.log(`   🎉 Usuario completado: ${userData.email}`);

    return {
      uid: firebaseUser.uid,
      email: userData.email,
      name: userData.name,
      orgId,
    };
  } catch (error: any) {
    console.error(`   ❌ Error creando usuario ${userData.email}:`, error.message);
    // Si el usuario ya existe, no es un error crítico
    if (error.code === 'auth/email-already-in-use') {
      console.log(`   ⚠️  Usuario ya existe, continuando...`);
      return null;
    }
    throw error;
  }
}

async function seedUsers() {
  console.log('🌱 Iniciando seeding de usuarios de prueba...\n');
  console.log('📦 Proyecto:', firebaseConfig.projectId);
  console.log('👥 Usuarios a crear:', testUsers.length);

  const results = [];

  for (const userData of testUsers) {
    const result = await createUser(userData);
    if (result) {
      results.push(result);
    }
    // Esperar 1 segundo entre cada creación para evitar rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Seeding completado!');
  console.log('='.repeat(60));
  console.log('\n📊 Resumen:');
  console.log(`   Total usuarios creados: ${results.length}/${testUsers.length}`);
  
  if (results.length > 0) {
    console.log('\n👤 Usuarios creados:');
    results.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email}`);
      console.log(`      - UID: ${user.uid}`);
      console.log(`      - Nombre: ${user.name}`);
      console.log(`      - Org ID: ${user.orgId}`);
    });

    console.log('\n🔑 Credenciales de acceso:');
    console.log('   Email: [cualquiera de los emails de arriba]');
    console.log('   Password: Test123456!');
  }

  console.log('\n💡 Siguiente paso:');
  console.log('   Ejecuta: npm run seed:data');
  console.log('   Para crear cuentas, transacciones, categorías, etc.\n');

  process.exit(0);
}

// Ejecutar seeding
seedUsers().catch((error) => {
  console.error('\n💥 Error fatal en seeding:', error);
  process.exit(1);
});
