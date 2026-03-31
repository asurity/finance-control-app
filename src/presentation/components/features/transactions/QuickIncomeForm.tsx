'use client';

import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronDown, ChevronUp, Calendar, Check } from 'lucide-react';
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

import { CreateTransactionSchema } from '@/application/validators/transactionValidator';
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
  onAdvancedMode 
}: QuickIncomeFormProps) {
  const [showDescription, setShowDescription] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Hooks
  const { createTransaction } = useTransactions(orgId);
  const accountsHook = useAccounts(orgId);
  const categoriesHook = useCategories(orgId);
  
  const { data: accounts = [], isLoading: accountsLoading } = accountsHook.useActiveAccounts();
  const { data: allCategories = [], isLoading: categoriesLoading } = categoriesHook.useAllCategories();

  // Smart defaults
  const smartDefaults = useSmartDefaults({ 
    orgId, 
    userId, 
    transactionType: 'INCOME' 
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
  const incomeCategories = allCategories.filter(cat => cat.type === 'INCOME');
  
  // Categorías no frecuentes (para el selector completo)
  const otherCategories = incomeCategories.filter(
    cat => !smartDefaults.recentCategories.some(rc => rc.id === cat.id)
  );

  // Submit handler
  const onSubmit = async (data: QuickIncomeFormValues) => {
    try {
      await createTransaction.mutateAsync(data);
      
      // Guardar última cuenta usada
      if (typeof window !== 'undefined') {
        localStorage.setItem(`lastAccountId_${orgId}`, data.accountId);
      }
      
      toast.success('¡Ingreso registrado!', {
        description: `$${data.amount.toFixed(2)} en ${incomeCategories.find(c => c.id === data.categoryId)?.name}`,
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

  const isLoading = createTransaction.isPending || accountsLoading || categoriesLoading || smartDefaults.isLoading;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Amount Input - Grande y prominente */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-semibold">¿Cuánto recibiste?</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="text-3xl font-bold pl-12 h-16 text-green-600"
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
              <FormLabel className="text-base font-semibold">¿Por qué concepto?</FormLabel>
              
              {/* Categorías frecuentes como chips */}
              {smartDefaults.recentCategories.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {smartDefaults.recentCategories.map(category => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => field.onChange(category.id)}
                      className={cn(
                        'relative p-4 rounded-lg border-2 text-left transition-all',
                        'hover:border-primary hover:bg-accent',
                        'active:scale-95',
                        field.value === category.id
                          ? 'border-primary bg-accent shadow-sm'
                          : 'border-border'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{category.name}</div>
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

              {/* Botón para mostrar todas las categorías */}
              {(otherCategories.length > 0 || smartDefaults.recentCategories.length === 0) && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowAllCategories(!showAllCategories)}
                  >
                    {showAllCategories ? (
                      <>
                        <ChevronUp className="mr-2 h-4 w-4" />
                        Ocultar otras categorías
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-2 h-4 w-4" />
                        {smartDefaults.recentCategories.length > 0 
                          ? 'Ver otras categorías' 
                          : 'Seleccionar categoría'}
                      </>
                    )}
                  </Button>

                  {showAllCategories && (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Selecciona una categoría" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {incomeCategories.map(category => (
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
                      </SelectContent>
                    </Select>
                  )}
                </>
              )}
              
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
              <FormLabel className="text-sm">Cuenta de destino</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una cuenta" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts.map(account => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                      {account.id === smartDefaults.mostUsedAccount && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Frecuente
                        </Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Optional: Date Picker (collapsed by default) */}
        <div className="space-y-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-auto p-0 font-normal text-muted-foreground"
            onClick={() => setShowDatePicker(!showDatePicker)}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {format(watchDate, "d 'de' MMMM, yyyy", { locale: es })}
            {showDatePicker ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
          </Button>

          {showDatePicker && (
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                      onChange={(e) => field.onChange(new Date(e.target.value))}
                      className="mt-2"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Optional: Description (collapsed by default) */}
        <div className="space-y-2">
          {!showDescription && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto p-0 font-normal text-muted-foreground"
              onClick={() => setShowDescription(true)}
            >
              <ChevronDown className="mr-2 h-4 w-4" />
              Agregar descripción (opcional)
            </Button>
          )}

          {showDescription && (
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-sm">Descripción</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-normal text-muted-foreground"
                      onClick={() => setShowDescription(false)}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: Pago de nómina"
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <Button 
            type="submit" 
            disabled={isLoading || !watchAmount || !watchCategoryId}
            className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700"
          >
            {isLoading ? 'Registrando...' : 'Registrar Ingreso'}
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
