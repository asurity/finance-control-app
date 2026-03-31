const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, Timestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyA19XEttyk9sutNbIh-wr-IZT9GRxD5Qvs',
  authDomain: 'cuentas-financieras-0625.firebaseapp.com',
  projectId: 'cuentas-financieras-0625',
  storageBucket: 'cuentas-financieras-0625.firebasestorage.app',
  messagingSenderId: '207319380404',
  appId: '1:207319380404:web:8a06cb2656748a929882e1'
};

const userId = 'eMKrOUdxVrhGSfSmjyLg0ZkW04D3';
const userEmail = 'pablo.guerrero@asurity.cl';
const userName = 'Pablo Guerrero';

async function fixUserData() {
  try {
    console.log('🔧 Inicializando Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app); // Usar database (default)
    
    console.log('\n✅ Conectado a Firestore (database: (default))');
    console.log('👤 Usuario a corregir:', userId);
    console.log('📧 Email:', userEmail);
    
    const now = Timestamp.now();
    const orgId = `${userId}-personal`;
    
    // 1. Verificar/Crear documento de usuario
    console.log('\n1️⃣ Verificando documento de usuario...');
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log('   ❌ Documento de usuario NO existe. Creando...');
      await setDoc(userRef, {
        email: userEmail,
        name: userName,
        createdAt: now,
        updatedAt: now,
      });
      console.log('   ✅ Documento de usuario creado');
    } else {
      console.log('   ✅ Documento de usuario existe');
      console.log('   Datos:', userDoc.data());
    }
    
    // 2. Verificar/Crear organización personal
    console.log('\n2️⃣ Verificando organización personal...');
    const orgRef = doc(db, 'organizations', orgId);
    const orgDoc = await getDoc(orgRef);
    
    if (!orgDoc.exists()) {
      console.log('   ❌ Organización NO existe. Creando...');
      await setDoc(orgRef, {
        name: `${userName} - Personal`,
        type: 'PERSONAL',
        ownerId: userId,
        createdAt: now,
      });
      console.log('   ✅ Organización creada');
    } else {
      console.log('   ✅ Organización existe');
      console.log('   Datos:', orgDoc.data());
    }
    
    // 3. Verificar/Crear membership
    console.log('\n3️⃣ Verificando membership...');
    const memberRef = doc(db, 'organizationMembers', `${orgId}_${userId}`);
    const memberDoc = await getDoc(memberRef);
    
    if (!memberDoc.exists()) {
      console.log('   ❌ Membership NO existe. Creando...');
      await setDoc(memberRef, {
        organizationId: orgId,
        userId: userId,
        role: 'OWNER',
        joinedAt: now,
      });
      console.log('   ✅ Membership creado');
    } else {
      console.log('   ✅ Membership existe');
      console.log('   Datos:', memberDoc.data());
    }
    
    console.log('\n✅ ¡Proceso completado exitosamente!');
    console.log('\n📋 Resumen:');
    console.log(`   User ID: ${userId}`);
    console.log(`   Org ID: ${orgId}`);
    console.log(`   Member ID: ${orgId}_${userId}`);
    console.log('\n🔄 Recarga la página del dashboard e intenta de nuevo.');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error('Detalles:', error.message);
    if (error.code) {
      console.error('Código:', error.code);
    }
    process.exit(1);
  }
}

fixUserData();
