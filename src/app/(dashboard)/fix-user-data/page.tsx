'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';

export default function FixUserDataPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'checking' | 'fixing' | 'success' | 'error'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<any>(null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    console.log(message);
  };

  const checkAndFixUserData = async () => {
    if (!user) {
      addLog('❌ No hay usuario autenticado');
      return;
    }

    setStatus('checking');
    setLogs([]);
    addLog('🔍 Iniciando verificación...');
    addLog(`👤 Usuario: ${user.id}`);
    addLog(`📧 Email: ${user.email}`);

    try {
      const now = Timestamp.now();
      const orgId = `${user.id}-personal`;
      const results = {
        user: { exists: false, created: false },
        organization: { exists: false, created: false },
        membership: { exists: false, created: false },
      };

      // 1. Verificar usuario
      addLog('\n1️⃣ Verificando documento de usuario...');
      const userRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        addLog('   ❌ No existe. Creando...');
        setStatus('fixing');
        await setDoc(userRef, {
          email: user.email!,
          name: user.name,
          createdAt: now,
          updatedAt: now,
        });
        addLog('   ✅ Usuario creado');
        results.user.created = true;
      } else {
        addLog('   ✅ Ya existe');
        results.user.exists = true;
      }

      // 2. Verificar organización
      addLog('\n2️⃣ Verificando organización personal...');
      const orgRef = doc(db, 'organizations', orgId);
      const orgDoc = await getDoc(orgRef);
      
      if (!orgDoc.exists()) {
        addLog('   ❌ No existe. Creando...');
        setStatus('fixing');
        await setDoc(orgRef, {
          name: `${user.name} - Personal`,
          type: 'PERSONAL',
          ownerId: user.id,
          createdAt: now,
        });
        addLog('   ✅ Organización creada');
        results.organization.created = true;
      } else {
        addLog('   ✅ Ya existe');
        results.organization.exists = true;
      }

      // 3. Verificar membership
      addLog('\n3️⃣ Verificando membership...');
      const memberRef = doc(db, 'organizationMembers', `${orgId}_${user.id}`);
      const memberDoc = await getDoc(memberRef);
      
      if (!memberDoc.exists()) {
        addLog('   ❌ No existe. Creando...');
        setStatus('fixing');
        await setDoc(memberRef, {
          organizationId: orgId,
          userId: user.id,
          role: 'OWNER',
          joinedAt: now,
        });
        addLog('   ✅ Membership creado');
        results.membership.created = true;
      } else {
        addLog('   ✅ Ya existe');
        results.membership.exists = true;
      }

      addLog('\n✅ ¡Proceso completado exitosamente!');
      setStatus('success');
      setResults(results);
    } catch (error: any) {
      addLog(`\n❌ Error: ${error.message}`);
      console.error('Error completo:', error);
      setStatus('error');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>🔧 Reparar Datos de Usuario</CardTitle>
          <CardDescription>
            Esta herramienta verifica y crea los documentos necesarios en Firestore para tu usuario
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!user ? (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>Debes iniciar sesión primero</span>
            </div>
          ) : (
            <>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm"><strong>Usuario:</strong> {user.email}</p>
                <p className="text-sm"><strong>ID:</strong> {user.id}</p>
                <p className="text-sm"><strong>Nombre:</strong> {user.name}</p>
              </div>

              <Button 
                onClick={checkAndFixUserData} 
                disabled={status === 'checking' || status === 'fixing'}
                className="w-full"
              >
                {status === 'checking' || status === 'fixing' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {status === 'checking' ? 'Verificando...' : 'Reparando...'}
                  </>
                ) : (
                  'Verificar y Reparar'
                )}
              </Button>

              {logs.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Logs:</h3>
                  <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs max-h-96 overflow-y-auto whitespace-pre-wrap">
                    {logs.map((log, i) => (
                      <div key={i}>{log}</div>
                    ))}
                  </div>
                </div>
              )}

              {status === 'success' && results && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-green-900">¡Reparación completada!</h3>
                  </div>
                  <ul className="space-y-1 text-sm text-green-800">
                    <li>• Usuario: {results.user.exists ? 'Ya existía' : results.user.created ? 'Creado' : 'Sin cambios'}</li>
                    <li>• Organización: {results.organization.exists ? 'Ya existía' : results.organization.created ? 'Creada' : 'Sin cambios'}</li>
                    <li>• Membership: {results.membership.exists ? 'Ya existía' : results.membership.created ? 'Creado' : 'Sin cambios'}</li>
                  </ul>
                  <p className="mt-3 text-sm font-medium text-green-900">
                    Ahora puedes ir al <a href="/dashboard" className="underline">Dashboard</a>
                  </p>
                </div>
              )}

              {status === 'error' && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    <h3 className="font-semibold text-red-900">Error al reparar</h3>
                  </div>
                  <p className="mt-2 text-sm text-red-800">Revisa los logs arriba para más detalles</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
