'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function EmailVerificationBanner() {
  const { firebaseUser, resendVerificationEmail } = useAuth();
  const [isHidden, setIsHidden] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Solo mostrar si hay un usuario autenticado, no está verificado, y no está oculto
  if (!firebaseUser || firebaseUser.emailVerified || isHidden) {
    return null;
  }

  const handleResendEmail = async () => {
    setIsSending(true);
    try {
      await resendVerificationEmail();
      toast.success('Correo enviado', {
        description: 'Revisa tu bandeja de entrada',
      });
    } catch (error: any) {
      console.error('Error al reenviar correo:', error);

      let errorMessage = 'Error al enviar correo';
      let errorDescription = '';

      if (error.message === 'El correo ya está verificado') {
        errorMessage = 'Correo ya verificado';
        errorDescription = 'Tu correo electrónico ya está verificado';
        // Recargar para actualizar el estado
        window.location.reload();
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos';
        errorDescription = 'Espera unos minutos antes de intentar de nuevo';
      } else if (error.message) {
        errorDescription = error.message;
      }

      toast.error(errorMessage, {
        description: errorDescription,
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Alert className="relative border-amber-500 bg-amber-50 dark:bg-amber-950 mb-4">
      <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="flex items-center justify-between gap-4 text-amber-800 dark:text-amber-200">
        <div className="flex-1">
          <p className="font-medium">Verifica tu correo electrónico</p>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            Te enviamos un correo de verificación a <strong>{firebaseUser.email}</strong>. Revisa tu
            bandeja de entrada y haz clic en el enlace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResendEmail}
            disabled={isSending}
            className="border-amber-600 text-amber-700 hover:bg-amber-100 dark:border-amber-400 dark:text-amber-300 dark:hover:bg-amber-900"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Enviando...
              </>
            ) : (
              'Reenviar correo'
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsHidden(true)}
            className="h-8 w-8 text-amber-600 dark:text-amber-400"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
