'use client';

import { useState, useMemo } from 'react';
import {
  Bell,
  CheckCheck,
  Archive,
  AlertCircle,
  AlertTriangle,
  Info,
  Trash2,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatRelativeDate } from '@/lib/utils/format';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { useAlerts } from '@/application/hooks/useAlerts';
import type { Alert, AlertPriority } from '@/types/firestore';

type FilterType = 'ALL' | 'UNREAD' | 'READ';
type FilterPriority = 'ALL' | AlertPriority;

const PRIORITY_CONFIG: Record<AlertPriority, {
  icon: typeof AlertCircle;
  color: string;
  bgColor: string;
  label: string;
  badgeVariant: 'default' | 'secondary' | 'destructive';
}> = {
  LOW: {
    icon: Info,
    color: 'text-info',
    bgColor: 'bg-info-light',
    label: 'Baja',
    badgeVariant: 'secondary',
  },
  MEDIUM: {
    icon: Info,
    color: 'text-warning',
    bgColor: 'bg-warning-light',
    label: 'Media',
    badgeVariant: 'default',
  },
  HIGH: {
    icon: AlertTriangle,
    color: 'text-warning',
    bgColor: 'bg-warning-light',
    label: 'Alta',
    badgeVariant: 'default',
  },
  URGENT: {
    icon: AlertCircle,
    color: 'text-danger',
    bgColor: 'bg-danger-light',
    label: 'Urgente',
    badgeVariant: 'destructive',
  },
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  BUDGET_THRESHOLD: 'Presupuesto',
  PAYMENT_DUE: 'Pago pendiente',
  LOW_BALANCE: 'Saldo bajo',
  UNUSUAL_EXPENSE: 'Gasto inusual',
  SAVINGS_GOAL: 'Meta de ahorro',
  CREDIT_LIMIT: 'Límite de crédito',
  RECURRING_FAILED: 'Recurrente fallida',
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const { currentOrgId } = useOrganization();

  if (!user || !currentOrgId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return <NotificationsContent orgId={currentOrgId} userId={user.id} />;
}

interface NotificationsContentProps {
  orgId: string;
  userId: string;
}

function NotificationsContent({ orgId, userId }: NotificationsContentProps) {
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [filterPriority, setFilterPriority] = useState<FilterPriority>('ALL');
  const [archivingReadAlerts, setArchivingReadAlerts] = useState(false);

  const alertsHook = useAlerts(orgId, userId);
  const { data: alerts = [], isLoading } = alertsHook.useAllAlerts();

  const { mutate: markAsRead } = alertsHook.markAsRead;
  const { mutate: markMultipleAsRead } = alertsHook.markMultipleAsRead;
  const { mutate: archiveAlert } = alertsHook.archiveAlert;
  const { mutate: deleteAlert } = alertsHook.deleteAlert;

  // Filter alerts (exclude archived)
  const filteredAlerts = useMemo(() => {
    return alerts
      .filter((a) => !a.isArchived)
      .filter((a) => {
        if (filterType === 'UNREAD') return !a.isRead;
        if (filterType === 'READ') return a.isRead;
        return true;
      })
      .filter((a) => {
        if (filterPriority === 'ALL') return true;
        return a.priority === filterPriority;
      })
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }, [alerts, filterType, filterPriority]);

  const unreadCount = alerts.filter((a) => !a.isRead && !a.isArchived).length;
  const readAlerts = alerts.filter((a) => a.isRead && !a.isArchived);

  const handleMarkAllAsRead = () => {
    const unreadIds = alerts
      .filter((a) => !a.isRead && !a.isArchived)
      .map((a) => a.id);
    if (unreadIds.length > 0) {
      markMultipleAsRead(unreadIds);
    }
  };

  const handleArchiveRead = () => {
    readAlerts.forEach((alert) => {
      archiveAlert(alert.id);
    });
    setArchivingReadAlerts(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Cargando notificaciones...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Bell className="h-7 w-7" />
            Notificaciones
          </h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0
              ? `${unreadCount} alerta${unreadCount !== 1 ? 's' : ''} sin leer`
              : 'No tienes alertas pendientes'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar todas como leídas
            </Button>
          )}
          {readAlerts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setArchivingReadAlerts(true)}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archivar leídas
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={filterType}
              onValueChange={(v) => setFilterType(v as FilterType)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                <SelectItem value="UNREAD">Sin leer</SelectItem>
                <SelectItem value="READ">Leídas</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filterPriority}
              onValueChange={(v) => setFilterPriority(v as FilterPriority)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas las prioridades</SelectItem>
                <SelectItem value="URGENT">Urgente</SelectItem>
                <SelectItem value="HIGH">Alta</SelectItem>
                <SelectItem value="MEDIUM">Media</SelectItem>
                <SelectItem value="LOW">Baja</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground ml-auto">
              {filteredAlerts.length} resultado{filteredAlerts.length !== 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas</CardTitle>
          <CardDescription>
            {filteredAlerts.length === 0
              ? 'No hay alertas que coincidan con los filtros'
              : `Mostrando ${filteredAlerts.length} alerta${filteredAlerts.length !== 1 ? 's' : ''}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin notificaciones</h3>
              <p className="text-muted-foreground">
                {filterType !== 'ALL' || filterPriority !== 'ALL'
                  ? 'No hay alertas que coincidan con los filtros seleccionados'
                  : 'No tienes notificaciones pendientes. ¡Todo bajo control!'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => {
                const config = PRIORITY_CONFIG[alert.priority];
                const Icon = config.icon;

                return (
                  <div
                    key={alert.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      !alert.isRead
                        ? 'bg-accent/50 border-accent-foreground/10'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${config.bgColor} flex-shrink-0`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-sm font-semibold">{alert.title}</p>
                          <Badge variant={config.badgeVariant} className="text-xs">
                            {config.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {ALERT_TYPE_LABELS[alert.type] || alert.type}
                          </Badge>
                          {!alert.isRead && (
                            <span className="h-2 w-2 rounded-full bg-info flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {alert.createdAt ? formatRelativeDate(alert.createdAt) : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!alert.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => markAsRead(alert.id)}
                            title="Marcar como leída"
                          >
                            <CheckCheck className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => archiveAlert(alert.id)}
                          title="Archivar"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteAlert(alert.id)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Archive Read Confirmation */}
      <AlertDialog
        open={archivingReadAlerts}
        onOpenChange={setArchivingReadAlerts}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Archivar alertas leídas?</AlertDialogTitle>
            <AlertDialogDescription>
              Se archivarán {readAlerts.length} alerta{readAlerts.length !== 1 ? 's' : ''} leída{readAlerts.length !== 1 ? 's' : ''}.
              Podrás encontrarlas en la sección de archivadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveRead}>Archivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
