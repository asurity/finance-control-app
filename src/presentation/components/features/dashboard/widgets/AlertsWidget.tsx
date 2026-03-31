/**
 * Alerts Widget
 * Shows the last 3 unread alerts with priorities
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeDate } from '@/lib/utils/format';
import { AlertCircle, AlertTriangle, Info, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertPriority } from '@/types/firestore';

interface AlertsWidgetProps {
  alerts: Alert[];
}

const priorityConfig = {
  LOW: {
    icon: Info,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    badgeVariant: 'secondary' as const,
    label: 'Baja',
  },
  MEDIUM: {
    icon: Info,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    badgeVariant: 'default' as const,
    label: 'Media',
  },
  HIGH: {
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    badgeVariant: 'default' as const,
    label: 'Alta',
  },
  URGENT: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    badgeVariant: 'destructive' as const,
    label: 'Urgente',
  },
};

export function AlertsWidget({ alerts }: AlertsWidgetProps) {
  const unreadAlerts = alerts.filter((alert) => !alert.isRead).slice(0, 3);

  if (unreadAlerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alertas</CardTitle>
          <CardDescription>Notificaciones importantes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Info className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No tienes alertas pendientes</p>
            <p className="text-xs text-muted-foreground mt-1">¡Todo bajo control!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Alertas</span>
          <Badge variant="secondary">{unreadAlerts.length} sin leer</Badge>
        </CardTitle>
        <CardDescription>Notificaciones importantes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {unreadAlerts.map((alert) => {
            const config = priorityConfig[alert.priority];
            const Icon = config.icon;

            return (
              <div
                key={alert.id}
                className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${config.bgColor} flex-shrink-0`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold truncate">{alert.title}</p>
                      <Badge variant={config.badgeVariant} className="text-xs flex-shrink-0">
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {alert.createdAt ? formatRelativeDate(alert.createdAt) : ''}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <Link
          href="/alerts"
          className="flex items-center justify-center gap-2 mt-4 text-sm text-primary hover:underline"
        >
          Ver todas las alertas
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}

export function AlertsWidgetSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="space-y-2">
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-3 border rounded-lg">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 bg-muted animate-pulse rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-full bg-muted animate-pulse rounded" />
                  <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
