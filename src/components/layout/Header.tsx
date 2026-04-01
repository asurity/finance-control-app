'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, Check, ChevronDown, LogOut, Plus, Settings, User, Bell, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useUnreadAlerts } from '@/presentation/components/features/dashboard/hooks/useUnreadAlerts';
import { formatRelativeDate } from '@/lib/utils/format';
import { QuickTransactionModal } from '@/presentation/components/features/transactions/QuickTransactionModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface HeaderProps {
  title?: string;
}

export function Header({ title = 'Dashboard' }: HeaderProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const {
    currentOrgId,
    currentOrganization,
    organizations,
    setCurrentOrgId,
    createOrganization,
    isLoading: organizationsLoading,
  } = useOrganization();
  const [createOrgOpen, setCreateOrgOpen] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [organizationType, setOrganizationType] = useState<'PERSONAL' | 'BUSINESS'>('PERSONAL');
  const [isCreatingOrganization, setIsCreatingOrganization] = useState(false);
  const { data: unreadAlerts = [] } = useUnreadAlerts(5);
  const unreadCount = unreadAlerts.length;

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Sesión cerrada exitosamente');
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('Error al cerrar sesión');
    }
  };

  const handleCreateOrganization = async () => {
    try {
      setIsCreatingOrganization(true);
      await createOrganization(organizationName, organizationType);
      toast.success('Organización creada exitosamente');
      setOrganizationName('');
      setOrganizationType('PERSONAL');
      setCreateOrgOpen(false);
    } catch (error) {
      console.error('Error al crear organización:', error);
      toast.error('Error al crear organización');
    } finally {
      setIsCreatingOrganization(false);
    }
  };

  const getUserInitials = () => {
    if (!user?.name) return 'US';
    return user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="border-b bg-card sticky top-0 z-10 shadow-sm">
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3">
        {/* Page Title */}
        <div className="flex items-center gap-4">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-foreground pl-12 lg:pl-0">
            {title}
          </h2>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Botón Nueva Transacción - Solo desktop */}
          {user && currentOrgId ? (
            <div className="hidden lg:block">
              <QuickTransactionModal orgId={currentOrgId} userId={user.id} />
            </div>
          ) : null}

          {/* Notification Bell */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-9 sm:w-9">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-80 max-h-[70vh] overflow-y-auto">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notificaciones</span>
                {unreadCount > 0 && (
                  <span className="text-xs text-muted-foreground font-normal">
                    {unreadCount} sin leer
                  </span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {unreadAlerts.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Sin notificaciones pendientes
                </div>
              ) : (
                unreadAlerts.map((alert) => {
                  const IconComponent =
                    alert.priority === 'URGENT' ? AlertCircle :
                    alert.priority === 'HIGH' ? AlertTriangle : Info;
                  const iconColor =
                    alert.priority === 'URGENT' ? 'text-red-600' :
                    alert.priority === 'HIGH' ? 'text-orange-600' :
                    alert.priority === 'MEDIUM' ? 'text-yellow-600' : 'text-blue-600';

                  return (
                    <DropdownMenuItem
                      key={alert.id}
                      className="flex items-start gap-3 p-3 cursor-pointer"
                      onClick={() => router.push('/notifications')}
                    >
                      <IconComponent className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{alert.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {alert.createdAt ? formatRelativeDate(alert.createdAt) : ''}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  );
                })
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="justify-center text-primary cursor-pointer"
                onClick={() => router.push('/notifications')}
              >
                Ver todas las notificaciones
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Organization Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-1.5 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
              >
                <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden md:inline">
                  {organizationsLoading
                    ? 'Cargando...'
                    : currentOrganization?.name || 'Sin organización'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-56">
              <DropdownMenuLabel>Mis Organizaciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {organizations.map((organization) => (
                <DropdownMenuItem
                  key={organization.id}
                  onClick={() => setCurrentOrgId(organization.id)}
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  <span className="flex-1">{organization.name}</span>
                  {organization.id === currentOrgId ? <Check className="w-4 h-4" /> : null}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCreateOrgOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                <span className="text-primary">Nueva organización</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 rounded-full"
              >
                <Avatar>
                  <AvatarImage src="" alt={user?.name || 'Usuario'} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.name || 'Usuario'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="w-4 h-4 mr-2" />
                Mi Perfil
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Configuración
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={createOrgOpen} onOpenChange={setCreateOrgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear organización</DialogTitle>
            <DialogDescription>
              Crea una organización como Familia o Empresa y comienza a registrar datos por
              separado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input
                placeholder="Ej: Familia, Empresa"
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select
                value={organizationType}
                onValueChange={(value: 'PERSONAL' | 'BUSINESS') => setOrganizationType(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERSONAL">Personal / Familia</SelectItem>
                  <SelectItem value="BUSINESS">Empresa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOrgOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateOrganization}
              disabled={isCreatingOrganization || !organizationName.trim()}
            >
              {isCreatingOrganization ? 'Creando...' : 'Crear organización'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
