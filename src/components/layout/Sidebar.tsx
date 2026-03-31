'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Home,
  Receipt,
  PieChart,
  CreditCard,
  Settings,
  FileText,
  TrendingUp,
  Wallet,
  Menu,
  X,
  Bug,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { APP_CONFIG } from '@/lib/constants/config';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, implemented: true, debug: false },
  { href: '/transactions', label: 'Transacciones', icon: Receipt, implemented: true, debug: false },
  { href: '/accounts', label: 'Cuentas', icon: CreditCard, implemented: true, debug: false },
  { href: '/budgets', label: 'Presupuestos', icon: PieChart, implemented: true, debug: false },
  { href: '/receivables', label: 'Por Cobrar', icon: TrendingUp, implemented: false, debug: false },
  { href: '/payables', label: 'Por Pagar', icon: Wallet, implemented: false, debug: false },
  { href: '/reports', label: 'Reportes', icon: FileText, implemented: true, debug: false },
  {
    href: '/debug-transactions',
    label: '🔍 Debug Transacciones',
    icon: Bug,
    implemented: true,
    debug: true,
  },
  {
    href: '/analyze-alondrita',
    label: '🔬 Analizar Alondrita',
    icon: Bug,
    implemented: true,
    debug: true,
  },
  {
    href: '/fix-budget-spent',
    label: '🔧 Corregir Presupuestos',
    icon: Bug,
    implemented: true,
    debug: true,
  },
  { href: '/settings', label: 'Configuración', icon: Settings, implemented: false, debug: false },
];

interface SidebarContentProps {
  onLinkClick?: () => void;
}

function SidebarContent({ onLinkClick }: SidebarContentProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Filtrar items de debug en producción
  const isDevelopment = process.env.NODE_ENV === 'development';
  const visibleMenuItems = menuItems.filter((item) => isDevelopment || !item.debug);

  const handleNavigation = (href: string) => {
    router.push(href);
    onLinkClick?.();
  };

  return (
    <>
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-primary">Control Financiero</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestión profesional</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleMenuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (!item.implemented) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground/50 cursor-not-allowed"
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
                <span className="text-xs ml-auto">(pendiente)</span>
              </div>
            );
          }

          return (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t space-y-2">
        <div className="flex items-center justify-between px-2">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Versión</p>
            <p className="text-sm font-semibold">v{APP_CONFIG.version}</p>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-3 left-3 z-[100] bg-background/80 backdrop-blur-sm hover:bg-background"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex flex-col h-full">
            <SidebarContent onLinkClick={() => setMobileMenuOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-card border-r h-screen sticky top-0 flex-col">
        <SidebarContent />
      </aside>
    </>
  );
}
