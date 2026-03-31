'use client';

import { useState, useEffect } from 'react';
import { Settings, Bell, Shield, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import type { AlertSettings } from '@/types/firestore';

const DEFAULT_SETTINGS: Omit<AlertSettings, 'id' | 'userId'> = {
  enableBudgetAlerts: true,
  budgetThresholdPercent: 80,
  enablePaymentDueAlerts: true,
  paymentDueDaysBefore: 3,
  enableLowBalanceAlerts: true,
  lowBalanceThreshold: 50000,
  enableUnusualExpenseAlerts: true,
  unusualExpenseMultiplier: 3,
  enableSavingsGoalAlerts: true,
  enableCreditLimitAlerts: true,
  creditLimitThresholdPercent: 90,
};

export default function SettingsPage() {
  const { user } = useAuth();
  const { currentOrgId } = useOrganization();

  if (!user || !currentOrgId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return <SettingsContent userId={user.id} orgId={currentOrgId} />;
}

interface SettingsContentProps {
  userId: string;
  orgId: string;
}

function SettingsContent({ userId, orgId }: SettingsContentProps) {
  const [settings, setSettings] = useState<Omit<AlertSettings, 'id' | 'userId'>>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const docRef = doc(db, 'userSettings', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings({
            enableBudgetAlerts: data.enableBudgetAlerts ?? DEFAULT_SETTINGS.enableBudgetAlerts,
            budgetThresholdPercent: data.budgetThresholdPercent ?? DEFAULT_SETTINGS.budgetThresholdPercent,
            enablePaymentDueAlerts: data.enablePaymentDueAlerts ?? DEFAULT_SETTINGS.enablePaymentDueAlerts,
            paymentDueDaysBefore: data.paymentDueDaysBefore ?? DEFAULT_SETTINGS.paymentDueDaysBefore,
            enableLowBalanceAlerts: data.enableLowBalanceAlerts ?? DEFAULT_SETTINGS.enableLowBalanceAlerts,
            lowBalanceThreshold: data.lowBalanceThreshold ?? DEFAULT_SETTINGS.lowBalanceThreshold,
            enableUnusualExpenseAlerts: data.enableUnusualExpenseAlerts ?? DEFAULT_SETTINGS.enableUnusualExpenseAlerts,
            unusualExpenseMultiplier: data.unusualExpenseMultiplier ?? DEFAULT_SETTINGS.unusualExpenseMultiplier,
            enableSavingsGoalAlerts: data.enableSavingsGoalAlerts ?? DEFAULT_SETTINGS.enableSavingsGoalAlerts,
            enableCreditLimitAlerts: data.enableCreditLimitAlerts ?? DEFAULT_SETTINGS.enableCreditLimitAlerts,
            creditLimitThresholdPercent: data.creditLimitThresholdPercent ?? DEFAULT_SETTINGS.creditLimitThresholdPercent,
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [userId]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const docRef = doc(db, 'userSettings', userId);
      await setDoc(docRef, {
        ...settings,
        userId,
        orgId,
        updatedAt: new Date(),
      }, { merge: true });
      toast.success('Configuración guardada');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Settings className="h-7 w-7" />
            Configuración
          </h1>
          <p className="text-muted-foreground mt-1">
            Personaliza tu experiencia y configura tus alertas
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar Cambios
        </Button>
      </div>

      {/* Budget Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertas de Presupuesto
          </CardTitle>
          <CardDescription>
            Configura cuándo recibir alertas sobre el uso de tu presupuesto por categoría
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Alertas de presupuesto</Label>
              <p className="text-sm text-muted-foreground">
                Recibir alertas cuando una categoría supere el umbral configurado
              </p>
            </div>
            <Switch
              checked={settings.enableBudgetAlerts}
              onCheckedChange={(checked) =>
                setSettings((s) => ({ ...s, enableBudgetAlerts: checked }))
              }
            />
          </div>
          {settings.enableBudgetAlerts && (
            <div className="space-y-4 pl-4 border-l-2 border-muted">
              <div className="space-y-2">
                <Label>Umbral de alerta (%)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={50}
                    max={100}
                    value={settings.budgetThresholdPercent}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, budgetThresholdPercent: Number(e.target.value) }))
                    }
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    Alerta cuando el gasto supere el {settings.budgetThresholdPercent}% del presupuesto
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Alertas de Pagos
          </CardTitle>
          <CardDescription>
            Configura recordatorios de pagos de tarjetas de crédito
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Recordatorio de pago</Label>
              <p className="text-sm text-muted-foreground">
                Recibir alerta antes del vencimiento de pago de tarjeta
              </p>
            </div>
            <Switch
              checked={settings.enablePaymentDueAlerts}
              onCheckedChange={(checked) =>
                setSettings((s) => ({ ...s, enablePaymentDueAlerts: checked }))
              }
            />
          </div>
          {settings.enablePaymentDueAlerts && (
            <div className="space-y-4 pl-4 border-l-2 border-muted">
              <div className="space-y-2">
                <Label>Días antes del vencimiento</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={15}
                    value={settings.paymentDueDaysBefore}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, paymentDueDaysBefore: Number(e.target.value) }))
                    }
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    días antes del vencimiento
                  </span>
                </div>
              </div>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Alerta de límite de crédito</Label>
              <p className="text-sm text-muted-foreground">
                Recibir alerta cuando se acerque al límite de crédito
              </p>
            </div>
            <Switch
              checked={settings.enableCreditLimitAlerts}
              onCheckedChange={(checked) =>
                setSettings((s) => ({ ...s, enableCreditLimitAlerts: checked }))
              }
            />
          </div>
          {settings.enableCreditLimitAlerts && (
            <div className="space-y-4 pl-4 border-l-2 border-muted">
              <div className="space-y-2">
                <Label>Umbral de uso de crédito (%)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={50}
                    max={100}
                    value={settings.creditLimitThresholdPercent}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, creditLimitThresholdPercent: Number(e.target.value) }))
                    }
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    Alerta al {settings.creditLimitThresholdPercent}% del límite
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Balance Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertas de Saldo
          </CardTitle>
          <CardDescription>
            Configura alertas para saldos bajos en tus cuentas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Alerta de saldo bajo</Label>
              <p className="text-sm text-muted-foreground">
                Recibir alerta cuando el saldo de una cuenta caiga bajo el mínimo
              </p>
            </div>
            <Switch
              checked={settings.enableLowBalanceAlerts}
              onCheckedChange={(checked) =>
                setSettings((s) => ({ ...s, enableLowBalanceAlerts: checked }))
              }
            />
          </div>
          {settings.enableLowBalanceAlerts && (
            <div className="space-y-4 pl-4 border-l-2 border-muted">
              <div className="space-y-2">
                <Label>Monto mínimo ($)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    value={settings.lowBalanceThreshold}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, lowBalanceThreshold: Number(e.target.value) }))
                    }
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">
                    Alerta cuando el saldo sea menor a ${settings.lowBalanceThreshold.toLocaleString('es-CL')}
                  </span>
                </div>
              </div>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Alertas de gastos inusuales</Label>
              <p className="text-sm text-muted-foreground">
                Detectar transacciones inusualmente altas
              </p>
            </div>
            <Switch
              checked={settings.enableUnusualExpenseAlerts}
              onCheckedChange={(checked) =>
                setSettings((s) => ({ ...s, enableUnusualExpenseAlerts: checked }))
              }
            />
          </div>
          {settings.enableUnusualExpenseAlerts && (
            <div className="space-y-4 pl-4 border-l-2 border-muted">
              <div className="space-y-2">
                <Label>Multiplicador de gasto promedio</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={2}
                    max={10}
                    value={settings.unusualExpenseMultiplier}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, unusualExpenseMultiplier: Number(e.target.value) }))
                    }
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    Alerta cuando un gasto supere {settings.unusualExpenseMultiplier}x el promedio
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Other Alert Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Otras Alertas</CardTitle>
          <CardDescription>
            Alertas adicionales para metas de ahorro
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Alertas de metas de ahorro</Label>
              <p className="text-sm text-muted-foreground">
                Recibir alertas de progreso en tus metas de ahorro
              </p>
            </div>
            <Switch
              checked={settings.enableSavingsGoalAlerts}
              onCheckedChange={(checked) =>
                setSettings((s) => ({ ...s, enableSavingsGoalAlerts: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
