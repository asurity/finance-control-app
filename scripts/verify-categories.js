const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyA19XEttyk9sutNbIh-wr-IZT9GRxD5Qvs',
  authDomain: 'cuentas-financieras-0625.firebaseapp.com',
  projectId: 'cuentas-financieras-0625',
  storageBucket: 'cuentas-financieras-0625.firebasestorage.app',
  messagingSenderId: '207319380404',
  appId: '1:207319380404:web:8a06cb2656748a929882e1'
};

async function verifyCategories() {
  try {
    console.log('🔧 Inicializando Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app); // Usar database (default)
    
    console.log('\n✅ Conectado a Firestore (database: (default))');
    console.log('📂 Verificando categorías...\n');
    
    // Get all categories
    const categoriesRef = collection(db, 'categories');
    const snapshot = await getDocs(categoriesRef);
    
    console.log(`📊 Total de categorías en collection: ${snapshot.size}\n`);
    
    if (snapshot.empty) {
      console.log('⚠️  No hay categorías en la base de datos');
      console.log('💡 Intenta crear una categoría desde la aplicación y vuelve a ejecutar este script\n');
      return;
    }
    
    // Group by orgId
    const byOrg = {};
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const orgId = data.orgId || 'SIN_ORGID';
      
      if (!byOrg[orgId]) {
        byOrg[orgId] = [];
      }
      
      byOrg[orgId].push({
        id: doc.id,
        name: data.name,
        type: data.type,
        icon: data.icon,
        color: data.color,
        isSystem: data.isSystem,
        orgId: data.orgId
      });
    });
    
    // Display results
    console.log('📋 Categorías por Organización:\n');
    
    Object.keys(byOrg).forEach(orgId => {
      console.log(`\n🏢 Organización: ${orgId}`);
      console.log(`   Total: ${byOrg[orgId].length} categorías\n`);
      
      byOrg[orgId].forEach(cat => {
        console.log(`   • ${cat.icon} ${cat.name}`);
        console.log(`     ID: ${cat.id}`);
        console.log(`     Tipo: ${cat.type}`);
        console.log(`     Color: ${cat.color}`);
        console.log(`     Sistema: ${cat.isSystem || false}`);
        console.log('');
      });
    });
    
    // Test query with orgId filter
    console.log('\n🔍 Probando queries con filtro de orgId...\n');
    
    for (const orgId of Object.keys(byOrg)) {
      if (orgId === 'SIN_ORGID') continue;
      
      const q = query(categoriesRef, where('orgId', '==', orgId));
      const querySnapshot = await getDocs(q);
      
      console.log(`   Org ${orgId}: ${querySnapshot.size} categorías encontradas`);
    }
    
    console.log('\n✅ Verificación completa\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Detalles:', error);
  }
}

verifyCategories();
