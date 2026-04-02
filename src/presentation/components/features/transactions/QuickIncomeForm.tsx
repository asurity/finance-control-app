'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

import { CreateTransactionSchema } from '@/application/validators/transactionValidator';

// Helper para parsear fecha del input sin problemas de timezone
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};
import { useTransactions } from '@/application/hooks/useTransactions';
import { useAccounts } from '@/application/hooks/useAccounts';
import { useCategories } from '@/application/hooks/useCategories';
import { useSmartDefaults } from './hooks/useSmartDefaults';
import type { z } from 'zod';

interface QuickIncomeFormProps {
  orgId: string;
  userId: string;
  onSuccess?: () => void;
  onAdvancedMode?: () => void; // Callback para cambiar a formulario completo
}

type QuickIncomeFormValues = z.infer<typeof CreateTransactionSchema>;

/**
 * QuickIncomeForm
 * Formulario simplificado y optimizado para móvil para registrar ingresos rápidamente
 * - Enfoque mobile-first con botones grandes
 * - Categorías frecuentes como chips seleccionables
 * - Defaults inteligentes basados en comportamiento
 * - Mínimo de campos requeridos
 */
export function QuickIncomeForm({
  orgId,
  userId,
  onSuccess,
  onAdvancedMode,
}: QuickIncomeFormProps) {
  const amountInputRef = useRef<HTMLInputElement>(null);
  const [showAllAccounts, setShowAllAccounts] = useState(false);

  // Hooks
  const { createTransaction } = useTransactions(orgId);
  const accountsHook = useAccounts(orgId);
  const categoriesHook = useCategories(orgId);

  const { data: accounts = [], isLoading: accountsLoading } = accountsHook.useActiveAccounts();
  const { data: allCategories = [], isLoading: categoriesLoading } =
    categoriesHook.useAllCategories();

  // Smart defaults
  const smartDefaults = useSmartDefaults({
    orgId,
    userId,
    transactionType: 'INCOME',
  });

  // Initialize form con smart defaults
  const form = useForm<QuickIncomeFormValues>({
    resolver: zodResolver(CreateTransactionSchema) as any,
    defaultValues: {
      type: 'INCOME',
      amount: 0,
      description: '',
      date: smartDefaults.defaultDate,
      accountId: smartDefaults.defaultAccountId || '',
      categoryId: smartDefaults.suggestedCategoryId || '',
      userId,
      tags: [],
    },
  });

  // Actualizar defaults cuando se carguen
  useEffect(() => {
    if (smartDefaults.defaultAccountId && !form.getValues('accountId')) {
      form.setValue('accountId', smartDefaults.defaultAccountId);
    }
    if (smartDefaults.suggestedCategoryId && !form.getValues('categoryId')) {
      form.setValue('categoryId', smartDefaults.suggestedCategoryId);
    }
  }, [smartDefaults, form]);

  // Auto-focus en el input de monto
  useEffect(() => {
    const timeout = setTimeout(() => {
      amountInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

  // Filtrar categorías de ingresos
  const incomeCategories = allCategories.filter((cat) => cat.type === 'INCOME');

  // Submit handler
  const onSubmit = async (data: QuickIncomeFormValues) => {
    try {
      await createTransaction.mutateAsync(data);

      // Guardar última cuenta usada
      if (typeof window !== 'undefined') {
        localStorage.setItem(`lastAccountId_${orgId}`, data.accountId);
      }

      toast.success('¡Ingreso registrado!', {
        description: `$${data.amount.toFixed(2)} en ${incomeCategories.find((c) => c.id === data.categoryId)?.name}`,
      });

      form.reset({
        type: 'INCOME',
        amount: 0,
        description: '',
        date: new Date(),
        accountId: data.accountId, // Mantener la cuenta seleccionada
        categoryId: smartDefaults.suggestedCategoryId || '',
        userId,
        tags: [],
      });

      // Re-enfocar el input de monto para siguiente transacción
      setTimeout(() => amountInputRef.current?.focus(), 100);

      onSuccess?.();
    } catch (error: any) {
      console.error('Error al crear transacción:', error);
      toast.error('Error al registrar ingreso', {
        description: error.message || 'Por favor, inténtalo de nuevo',
      });
    }
  };

  const watchCategoryId = form.watch('categoryId');
  const watchAmount = form.watch('amount');
  const watchDate = form.watch('date');

  const isLoading = accountsLoading || categoriesLoading || smartDefaults.isLoading;
  const isSubmitting = createTransaction.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Amount Input - Grande y prominente */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm sm:text-base font-semibold">¿Cuánto recibiste?</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-xl sm:text-2xl md:text-3xl font-bold text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="text-xl sm:text-2xl md:text-3xl font-bold pl-9 sm:pl-12 h-12 sm:h-14 md:h-16 text-green-600"
                    {...field}
                    ref={(e) => {
                      field.ref(e);
                      amountInputRef.current = e;
                    }}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category Selection - Chips grandes para móvil */}
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm sm:text-base font-semibold">¿Por qué concepto?</FormLabel>

              {/* Categorías frecuentes como chips - máximo 4 para no saturar */}
              {smartDefaults.recentCategories.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {smartDefaults.recentCategories.slice(0, 4).map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => field.onChange(category.id)}
                      className={cn(
                        'relative p-3 sm:p-4 rounded-lg border-2 text-left transition-all',
                        'hover:border-primary hover:bg-accent',
                        'active:scale-95',
                        field.value === category.id
                          ? 'border-primary bg-accent shadow-sm'
                          : 'border-border'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm sm:text-base font-medium truncate">{category.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {category.count} {category.count === 1 ? 'vez' : 'veces'}
                          </div>
                        </div>
                        {field.value === category.id && (
                          <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <div
                        className="absolute top-0 right-0 w-3 h-3 rounded-bl-lg"
                        style={{ backgroundColor: category.color }}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Dropdown con categorías agrupadas: frecuentes primero, luego todas */}
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="O busca en todas las categorías" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
                  {smartDefaults.recentCategories.length > 0 && (
                    <>
                      <SelectGroup>
                        <SelectLabel>⭐ Frecuentes</SelectLabel>
                        {smartDefaults.recentCategories.slice(0, 6).map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                              <span>{category.name}</span>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {category.count}x
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectSeparator />
                    </>
                  )}
                  <SelectGroup>
                    <SelectLabel>Todas las categorías</SelectLabel>
                    {incomeCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <FormMessage />
            </FormItem>
          )}
        />

        {/* Account Selection - Expandible sin dropdown */}
        <FormField
          control={form.control}
          name="accountId"
          render={({ field }) => {
            // Ordenar cuentas: más usada primero, luego por nombre
            const sortedAccounts = [...accounts].sort((a, b) => {
              if (a.id === smartDefaults.mostUsedAccount) return -1;
              if (b.id === smartDefaults.mostUsedAccount) return 1;
              return a.name.localeCompare(b.name);
            });

            const topAccounts = sortedAccounts.slice(0, 3);
            const remainingAccounts = sortedAccounts.slice(3);
            const selectedAccount = accounts.find(acc => acc.id === field.value);

            return (
              <FormItem>
                <FormLabel className="text-sm">Cuenta de destino</FormLabel>
                
                {/* Cuentas principales */}
                <div className="space-y-2">
                  {topAccounts.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => field.onChange(account.id)}
                      className={cn(
                        'w-full p-3 rounded-lg border-2 text-left transition-all',
                        'hover:border-primary hover:bg-accent',
                        'active:scale-[0.98]',
                        field.value === account.id
                          ? 'border-primary bg-accent shadow-sm'
                          : 'border-border'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{account.name}</span>
                            {account.id === smartDefaults.mostUsedAccount && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                ★
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {account.cardNumber && `****${account.cardNumber.slice(-4)} • `}
                            {account.currency} {account.balance.toFixed(2)}
                          </div>
                        </div>
                        {field.value === account.id && (
                          <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Botón Ver todas + Lista expandible */}
                {remainingAccounts.length > 0 && (
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAllAccounts(!showAllAccounts)}
                      className="w-full justify-between"
                    >
                      <span className="text-xs">
                        {showAllAccounts ? 'Ocultar' : `Ver todas (${remainingAccounts.length} más)`}
                      </span>
                      {showAllAccounts ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>

                    {/* Lista expandible con scroll nativo */}
                    {showAllAccounts && (
                      <div className="mt-2 space-y-2 max-h-[200px] overflow-y-auto overscroll-contain pr-1">
                        {remainingAccounts.map((account) => (
                          <button
                            key={account.id}
                            type="button"
                            onClick={() => {
                              field.onChange(account.id);
                              setShowAllAccounts(false);
                            }}
                            className={cn(
                              'w-full p-3 rounded-lg border-2 text-left transition-all',
                              'hover:border-primary hover:bg-accent',
                              'active:scale-[0.98]',
                              field.value === account.id
                                ? 'border-primary bg-accent shadow-sm'
                                : 'border-border'
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm">{account.name}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {account.cardNumber && `****${account.cardNumber.slice(-4)} • `}
                                  {account.currency} {account.balance.toFixed(2)}
                                </div>
                              </div>
                              {field.value === account.id && (
                                <Check className="h-5 w-5 text-primary flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <FormMessage />
              </FormItem>
            );
          }}
        />

        {/* Date Picker - Siempre visible pero compacto */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-muted-foreground">Fecha</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                  onChange={(e) => field.onChange(parseLocalDate(e.target.value))}
                  className="h-9 text-sm"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description - Siempre visible pero compacto */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs text-muted-foreground">Descripción (opcional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ej: Pago de nómina"
                  className="h-9 text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <Button
            type="submit"
            disabled={isSubmitting || !watchAmount || !watchCategoryId}
            className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? 'Registrando...' : 'Registrar Ingreso'}
          </Button>

          {onAdvancedMode && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onAdvancedMode}
              className="text-muted-foreground"
            >
              Usar formulario completo
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
