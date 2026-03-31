'use client';

import * as React from 'react';
import { DollarSign, Plus, TrendingDown, TrendingUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FloatingActionButtonProps {
  onExpenseClick?: () => void;
  onIncomeClick?: () => void;
  className?: string;
}

export function FloatingActionButton({
  onExpenseClick,
  onIncomeClick,
  className,
}: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleExpenseClick = () => {
    setIsOpen(false);
    onExpenseClick?.();
  };

  const handleIncomeClick = () => {
    setIsOpen(false);
    onIncomeClick?.();
  };

  return (
    <>
      {/* Overlay cuando está abierto */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Contenedor del FAB */}
      <div className={cn('fixed bottom-6 right-6 z-50 lg:hidden', className)}>
        {/* Opciones del menú */}
        <div
          className={cn(
            'absolute bottom-16 right-0 flex flex-col gap-3 transition-all duration-300',
            isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          )}
        >
          {/* Opción de Gasto */}
          <button
            onClick={handleExpenseClick}
            className="flex items-center gap-3 bg-red-500 text-white px-4 py-3 rounded-full shadow-lg hover:bg-red-600 transition-colors"
          >
            <TrendingDown className="h-5 w-5" />
            <span className="font-medium text-sm whitespace-nowrap">Nuevo Gasto</span>
          </button>

          {/* Opción de Ingreso */}
          <button
            onClick={handleIncomeClick}
            className="flex items-center gap-3 bg-green-500 text-white px-4 py-3 rounded-full shadow-lg hover:bg-green-600 transition-colors"
          >
            <TrendingUp className="h-5 w-5" />
            <span className="font-medium text-sm whitespace-nowrap">Nuevo Ingreso</span>
          </button>
        </div>

        {/* Botón principal */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center',
            isOpen ? 'bg-gray-600 hover:bg-gray-700 rotate-45' : 'bg-primary hover:bg-primary/90'
          )}
        >
          {isOpen ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <DollarSign className="h-6 w-6 text-white" />
          )}
        </button>
      </div>
    </>
  );
}
