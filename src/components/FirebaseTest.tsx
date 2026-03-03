'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';

export default function FirebaseTest() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const testConnection = async () => {
      try {
        if (!db) {
          throw new Error('Firebase no inicializado');
        }

        // Verificar que las variables de entorno estén configuradas
        const requiredVars = [
          'NEXT_PUBLIC_FIREBASE_API_KEY',
          'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
          'NEXT_PUBLIC_FIREBASE_APP_ID',
        ];

        const missing = requiredVars.filter((v) => !process.env[v]);

        if (missing.length > 0) {
          throw new Error(`Faltan variables: ${missing.join(', ')}`);
        }

        setStatus('connected');
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Error desconocido');
      }
    };

    testConnection();
  }, []);

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <h2 className="text-xl font-bold mb-4">🔥 Estado de Firebase</h2>

      {status === 'checking' && (
        <div className="flex items-center gap-2 text-gray-600">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          Verificando conexión...
        </div>
      )}

      {status === 'connected' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-600 font-semibold">
            ✅ Conectado exitosamente
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <strong>Project ID:</strong> {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}
            </p>
            <p>
              <strong>Auth Domain:</strong> {process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}
            </p>
            <p>
              <strong>Analytics:</strong>{' '}
              {process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true'
                ? '✅ Habilitado'
                : '❌ Deshabilitado'}
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-red-600 font-semibold">
            ❌ Error de conexión
          </div>
          <div className="text-sm text-red-500 bg-red-50 p-3 rounded">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}
    </div>
  );
}
