import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, CreditCard } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Bienvenido al Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Resumen de tu situación financiera
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Balance Total */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2,450,000</div>
            <p className="text-xs text-muted-foreground mt-1">
              CLP
            </p>
          </CardContent>
        </Card>

        {/* Ingresos del Mes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-income" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-income">$1,850,000</div>
            <p className="text-xs text-muted-foreground mt-1">
              +15% vs mes anterior
            </p>
          </CardContent>
        </Card>

        {/* Gastos del Mes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos del Mes</CardTitle>
            <TrendingDown className="h-4 w-4 text-expense" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-expense">$980,000</div>
            <p className="text-xs text-muted-foreground mt-1">
              -5% vs mes anterior
            </p>
          </CardContent>
        </Card>

        {/* Cuentas Activas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cuentas Activas</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cuentas bancarias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estado del Proyecto */}
        <Card>
          <CardHeader>
            <CardTitle>Estado del Proyecto</CardTitle>
            <CardDescription>Progreso de implementación</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Fase 0: Preparación</span>
                <Badge variant="default">80%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Fase 1: Proyecto Base</span>
                <Badge variant="default">100%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Fase 2: Firebase Setup</span>
                <Badge variant="default">100%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Fase 3: UI/Layout</span>
                <Badge variant="default">100%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Fase 4: Autenticación</span>
                <Badge variant="outline">Pendiente</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Próximos Pasos */}
        <Card>
          <CardHeader>
            <CardTitle>Próximos Pasos</CardTitle>
            <CardDescription>Roadmap de desarrollo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary">→</span>
                <span>Implementar sistema de autenticación con Firebase Auth</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">→</span>
                <span>Crear servicios y hooks de React Query</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">→</span>
                <span>Desarrollar módulo de transacciones (CRUD)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">→</span>
                <span>Implementar gráficos y reportes con Recharts</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">→</span>
                <span>Integrar Agent Skills para exportación Excel/PDF</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Firebase Test Status */}
      <Card>
        <CardHeader>
          <CardTitle>Conexión Firebase</CardTitle>
          <CardDescription>Estado de la conexión con Firestore</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm font-medium">Conectado exitosamente</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Proyecto: cuentas-financieras-0625
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
