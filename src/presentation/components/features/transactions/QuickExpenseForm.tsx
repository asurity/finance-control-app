'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Check } from 'lucide-react';
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
import { useCategorySuggestion } from './hooks/useCategorySuggestion';
import type { z } from 'zod';

interface QuickExpenseFormProps {
  orgId: string;
  userId: string;
  onSuccess?: () => void;
  onAdvancedMode?: () => void; // Callback para cambiar a formulario completo
}

type QuickExpenseFormValues = z.infer<typeof CreateTransactionSchema>;

/**
 * QuickExpenseForm
 * Formulario simplificado y optimizado para móvil para registrar gastos rápidamente
 * - Enfoque mobile-first con botones grandes
 * - Categorías frecuentes como chips seleccionables
 * - Defaults inteligentes basados en comportamiento
 * - Mínimo de campos requeridos
 */
export function QuickExpenseForm({
  orgId,
  userId,
  onSuccess,
  onAdvancedMode,
}: QuickExpenseFormProps) {
  const amountInputRef = useRef<HTMLInputElement>(null);

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
    transactionType: 'EXPENSE',
  });

  // Initialize form con smart defaults
  const form = useForm<QuickExpenseFormValues>({
    resolver: zodResolver(CreateTransactionSchema) as any,
    defaultValues: {
      type: 'EXPENSE',
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

  // Filtrar categorías de gastos (excluir sub-categorías del listado principal)
  const expenseCategories = allCategories.filter((cat) => cat.type === 'EXPENSE' && !cat.parentId);

  // Submit handler
  const onSubmit = async (data: QuickExpenseFormValues) => {
    try {
      await createTransaction.mutateAsync(data);

      // Guardar última cuenta usada
      if (typeof window !== 'undefined') {
        localStorage.setItem(`lastAccountId_${orgId}`, data.accountId);
      }

      toast.success('¡Gasto registrado!', {
        description: `$${data.amount.toFixed(2)} en ${expenseCategories.find((c) => c.id === data.categoryId)?.name}`,
      });

      form.reset({
        type: 'EXPENSE',
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
      toast.error('Error al registrar gasto', {
        description: error.message || 'Por favor, inténtalo de nuevo',
      });
    }
  };

  const watchCategoryId = form.watch('categoryId');
  const watchAmount = form.watch('amount');
  const watchDate = form.watch('date');
  const watchDescription = form.watch('description');

  // Category suggestion based on description
  const categorySuggestion = useCategorySuggestion({
    orgId,
    userId,
    transactionType: 'EXPENSE',
    description: watchDescription || '',
    categories: allCategories,
    enabled: !!watchDescription && watchDescription.length >= 2,
  });

  // Auto-select category on high confidence suggestion
  useEffect(() => {
    if (
      categorySuggestion.confidence === 'high' &&
      categorySuggestion.categoryId &&
      !watchCategoryId
    ) {
      form.setValue('categoryId', categorySuggestion.categoryId);
    }
  }, [categorySuggestion.categoryId, categorySuggestion.confidence, watchCategoryId, form]);

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
              <FormLabel className="text-sm sm:text-base font-semibold">¿Cuánto gastaste?</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-xl sm:text-2xl md:text-3xl font-bold text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="text-xl sm:text-2xl md:text-3xl font-bold pl-9 sm:pl-12 h-12 sm:h-14 md:h-16 text-red-600"
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
              <FormLabel className="text-sm sm:text-base font-semibold">¿En qué?</FormLabel>

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
                <SelectContent>
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
                    {expenseCategories.map((category) => (
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

        {/* Account Selection - Pre-seleccionada pero modificable */}
        <FormField
          control={form.control}
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm">Cuenta</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una cuenta" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center justify-between gap-4 w-full">
                        <div className="flex flex-col">
                          <span className="font-medium">{account.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {account.cardNumber && `****${account.cardNumber.slice(-4)} • `}
                            {account.currency} {account.balance.toFixed(2)}
                          </span>
                        </div>
                        {account.id === smartDefaults.mostUsedAccount && (
                          <Badge variant="secondary" className="text-xs">
                            Frecuente
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
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
                  placeholder="Ej: Compra en supermercado"
                  className="h-9 text-sm"
                  {...field}
                />
              </FormControl>
              {categorySuggestion.confidence === 'medium' && categorySuggestion.categoryName && (
                <p
                  className="text-xs text-primary cursor-pointer hover:underline"
                  onClick={() => {
                    if (categorySuggestion.categoryId) {
                      form.setValue('categoryId', categorySuggestion.categoryId);
                    }
                  }}
                >
                  ¿Es esto {categorySuggestion.categoryName}?
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <Button
            type="submit"
            disabled={isSubmitting || !watchAmount || !watchCategoryId}
            className="w-full h-12 text-base font-semibold"
            variant="destructive"
          >
            {isSubmitting ? 'Registrando...' : 'Registrar Gasto'}
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
