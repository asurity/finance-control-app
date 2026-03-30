'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/transactions', label: 'Transacciones', icon: Receipt },
  { href: '/accounts', label: 'Cuentas', icon: CreditCard },
  { href: '/budgets', label: 'Presupuestos', icon: PieChart },
  { href: '/receivables', label: 'Por Cobrar', icon: TrendingUp },
  { href: '/payables', label: 'Por Pagar', icon: Wallet },
  { href: '/reports', label: 'Reportes', icon: FileText },
  { href: '/settings', label: 'Configuración', icon: Settings },
];

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/transactions', label: 'Transacciones', icon: Receipt },
  { href: '/accounts', label: 'Cuentas', icon: CreditCard },
  { href: '/budgets', label: 'Presupuestos', icon: PieChart },
  { href: '/receivables', label: 'Por Cobrar', icon: TrendingUp },
  { href: '/payables', label: 'Por Pagar', icon: Wallet },
  { href: '/reports', label: 'Reportes', icon: FileText },
  { href: '/settings', label: 'Configuración', icon: Settings },
];

interface SidebarContentProps {
  onLinkClick?: () => void;
}

function SidebarContent({ onLinkClick }: SidebarContentProps) {
  const pathname = usePathname();

  return (
    <>
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold text-primary">Control Financiero</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestión profesional
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onLinkClick}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="px-4 py-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">Versión Beta</p>
          <p className="text-sm font-semibold">v0.6.0</p>
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
            className="lg:hidden fixed top-4 left-4 z-50"
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
