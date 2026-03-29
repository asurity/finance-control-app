const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit, query } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyA19XEttyk9sutNbIh-wr-IZT9GRxD5Qvs',
  authDomain: 'cuentas-financieras-0625.firebaseapp.com',
  projectId: 'cuentas-financieras-0625',
  storageBucket: 'cuentas-financieras-0625.firebasestorage.app',
  messagingSenderId: '207319380404',
  appId: '1:207319380404:web:8a06cb2656748a929882e1'
};

async function verifyCollections() {
  try {
    console.log('Inicializando Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app, 'finanzas'); // Especificar database ID
    
    console.log('\n✓ Conexión a Firestore exitosa');
    console.log('Proyecto:', firebaseConfig.projectId);
    console.log('Database: finanzas');
    console.log('\nVerificando colecciones...\n');
    
    const collections = ['users', 'organizations', 'organizationMembers'];
    
    for (const collectionName of collections) {
      try {
        const collectionRef = collection(db, collectionName);
        const q = query(collectionRef, limit(1));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          console.log(`⚠️  ${collectionName}: Existe pero está vacía (0 documentos)`);
        } else {
          console.log(`✓ ${collectionName}: Existe (${snapshot.size} documento(s) encontrado)`);
          // Mostrar un documento de ejemplo
          const doc = snapshot.docs[0];
          console.log(`   ID: ${doc.id}`);
          console.log(`   Campos: ${Object.keys(doc.data()).join(', ')}`);
        }
      } catch (error) {
        if (error.code === 'permission-denied') {
          console.log(`⚠️  ${collectionName}: Existe pero requiere autenticación para leer`);
        } else {
          console.log(`✗ ${collectionName}: Error - ${error.message}`);
        }
      }
    }
    
    console.log('\n✓ Verificación completada');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    if (error.code === 'failed-precondition') {
      console.error('\n⚠️  CAUSA: La base de datos Firestore no está creada en Firebase Console');
      console.error('   SOLUCIÓN: Ve a https://console.firebase.google.com/project/cuentas-financieras-0625/firestore');
      console.error('   y crea la base de datos en modo Producción con ubicación us-central1');
    }
    process.exit(1);
  }
}

verifyCollections();
