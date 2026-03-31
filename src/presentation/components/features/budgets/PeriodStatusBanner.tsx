'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useBudgetPeriods } from '@/application/hooks/useBudgetPeriods';
import { AlertTriangle, AlertCircle, Plus, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatStrDate } from '@/lib/utils/format';
import { useRouter } from 'next/navigation';

export function PeriodStatusBanner() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const router = useRouter();

  // Def hooks without conditional
  const orgId = currentOrganization?.id || '';
  const userId = user?.uid || '';
  const { usePeriodExpiration } = useBudgetPeriods(orgId);
  const { data: status, isLoading } = usePeriodExpiration(userId);

  // Wait for auth and org
  if (!user || !currentOrganization) return null;

  if (isLoading || !status) return null;

  // Si no hay sugerencias ni alertas, no mostramos nada
  if (status.suggestion === 'none' && !status.isExpiringSoon) return null;

  const handleCreateNew = () => {
    router.push('/budgets'); // Assuming proper navigation logic handles the modal or page
  };

  if (!status.hasActivePeriod) {
    return (
      <div className="bg-destructive/15 border border-destructive/30 rounded-lg p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-destructive shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-destructive">
              No hay período de presupuesto activo
            </h4>
            <p className="text-sm text-destructive/80 mt-1">
              Tus gastos actuales no se están controlando bajo un presupuesto.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {status.lastExpiredPeriod && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateNew}
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar Anterior
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={handleCreateNew}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Crear Período
          </Button>
        </div>
      </div>
    );
  }

  // Si está expirando
  if (status.isExpiringSoon && status.activePeriod) {
    return (
      <div className="bg-amber-500/15 border border-amber-500/30 rounded-lg p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-500 shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-400">
              El período &quot;{status.activePeriod.name || 'actual'}&quot; vence pronto
            </h4>
            <p className="text-sm text-amber-700/80 dark:text-amber-500/80 mt-1">
              Vence el {formatStrDate(status.activePeriod.endDate.toISOString())} (
              {status.daysUntilExpiration} días restantes). Prepara el siguiente.
            </p>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateNew}
            className="border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
          >
            Preprar Siguiente
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
