'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

import { useRecurringTransactions } from '@/application/hooks/useRecurringTransactions';
import { useAccounts } from '@/application/hooks/useAccounts';
import { useCategories } from '@/application/hooks/useCategories';
import type { RecurringTransaction, RecurrenceFrequency, TransactionType } from '@/types/firestore';

// Recurring transaction validation schema
const RecurringTransactionSchema = z.object({
  description: z.string().min(1, 'La descripción es obligatoria').max(200, 'Máximo 200 caracteres'),
  amount: z.number().positive('El monto debe ser mayor a cero'),
  type: z.enum(['INCOME', 'EXPENSE']),
  frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  accountId: z.string().min(1, 'Selecciona una cuenta'),
  categoryId: z.string().min(1, 'Selecciona una categoría'),
  startDate: z.date(),
  endDate: z.date().optional().nullable(),
  isActive: z.boolean(),
  hasEndDate: z.boolean(),
});

type RecurringTransactionFormValues = z.infer<typeof RecurringTransactionSchema>;

interface RecurringTransactionFormProps {
  orgId: string;
  userId: string;
  initialData?: RecurringTransaction;
  onSuccess?: () => void;
}

const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'DAILY', label: 'Diaria' },
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'BIWEEKLY', label: 'Quincenal' },
  { value: 'MONTHLY', label: 'Mensual' },
  { value: 'QUARTERLY', label: 'Trimestral' },
  { value: 'YEARLY', label: 'Anual' },
];

export function RecurringTransactionForm({
  orgId,
  userId,
  initialData,
  onSuccess,
}: RecurringTransactionFormProps) {
  const recurringHook = useRecurringTransactions(orgId, userId);
  const accountsHook = useAccounts(orgId);
  const categoriesHook = useCategories(orgId);

  const { data: accounts = [], isLoading: accountsLoading } = accountsHook.useActiveAccounts();
  const { data: allCategories = [], isLoading: categoriesLoading } =
    categoriesHook.useAllCategories();

  const { mutateAsync: createRecurringTransaction, isPending: isCreating } =
    recurringHook.createRecurringTransaction;
  const { mutateAsync: updateRecurringTransaction, isPending: isUpdating } =
    recurringHook.updateRecurringTransaction;

  const isEditMode = !!initialData;

  // Initialize form
  const form = useForm<RecurringTransactionFormValues>({
    resolver: zodResolver(RecurringTransactionSchema),
    defaultValues: {
      description: initialData?.description || '',
      amount: initialData?.amount || 0,
      type: initialData?.type || 'EXPENSE',
      frequency: initialData?.frequency || 'MONTHLY',
      accountId: initialData?.accountId || '',
      categoryId: initialData?.categoryId || '',
      startDate: initialData?.startDate || new Date(),
      endDate: initialData?.endDate || null,
      isActive: initialData?.isActive ?? true,
      hasEndDate: !!initialData?.endDate,
    },
  });

  // Watch form values for conditional fields
  const watchType = form.watch('type');
  const watchHasEndDate = form.watch('hasEndDate');

  // Filter categories by transaction type
  const filteredCategories = allCategories.filter((category) => category.type === watchType);

  // Reset category when transaction type changes
  useEffect(() => {
    form.setValue('categoryId', '');
  }, [watchType, form]);

  // Clear endDate when hasEndDate is toggled off
  useEffect(() => {
    if (!watchHasEndDate) {
      form.setValue('endDate', null);
    }
  }, [watchHasEndDate, form]);

  // Submit handler
  const onSubmit = async (data: RecurringTransactionFormValues) => {
    try {
      const payload = {
        description: data.description,
        amount: data.amount,
        type: data.type as TransactionType,
        frequency: data.frequency as RecurrenceFrequency,
        accountId: data.accountId,
        categoryId: data.categoryId,
        userId,
        orgId,
        startDate: data.startDate,
        endDate: data.hasEndDate && data.endDate ? data.endDate : undefined,
        nextOccurrence: initialData?.nextOccurrence || data.startDate,
        isActive: data.isActive,
      };

      if (isEditMode && initialData) {
        await updateRecurringTransaction({
          id: initialData.id,
          data: payload,
        });
        toast.success('Transacción recurrente actualizada');
      } else {
        await createRecurringTransaction(payload as any);
        toast.success('Transacción recurrente creada');
      }

      form.reset();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error al guardar transacción recurrente:', error);
      toast.error('Error al guardar', {
        description: error.message || 'Por favor, inténtalo de nuevo',
      });
    }
  };

  const isLoading = isCreating || isUpdating || accountsLoading || categoriesLoading;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Transaction Type */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Transacción</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="INCOME">Ingreso</SelectItem>
                  <SelectItem value="EXPENSE">Gasto</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Renta mensual, Suscripción Netflix..." {...field} />
              </FormControl>
              <FormDescription>Describe esta transacción recurrente</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Amount */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monto</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormDescription>Monto de la transacción</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Frequency */}
        <FormField
          control={form.control}
          name="frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frecuencia</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona la frecuencia" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>¿Cada cuánto se repite?</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Account */}
        <FormField
          control={form.control}
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cuenta</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una cuenta" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Start Date */}
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha de Inicio</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                  onChange={(e) => {
                    if (!e.target.value) {
                      field.onChange(new Date());
                      return;
                    }
                    const date = new Date(e.target.value + 'T00:00:00');
                    if (!isNaN(date.getTime())) {
                      field.onChange(date);
                    }
                  }}
                />
              </FormControl>
              <FormDescription>¿Cuándo inicia esta recurrencia?</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Has End Date Toggle */}
        <FormField
          control={form.control}
          name="hasEndDate"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Fecha de Fin</FormLabel>
                <FormDescription>¿Esta recurrencia tiene fecha de fin?</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {/* End Date (conditional) */}
        {watchHasEndDate && (
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Fin</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      if (!e.target.value) {
                        field.onChange(undefined);
                        return;
                      }
                      const date = new Date(e.target.value + 'T00:00:00');
                      if (!isNaN(date.getTime())) {
                        field.onChange(date);
                      }
                    }}
                  />
                </FormControl>
                <FormDescription>La recurrencia terminará en esta fecha</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Is Active */}
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Estado</FormLabel>
                <FormDescription>
                  {field.value
                    ? 'La transacción se procesará automáticamente'
                    : 'La transacción está pausada'}
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditMode ? 'Actualizar' : 'Crear'} Transacción Recurrente
          </Button>
        </div>
      </form>
    </Form>
  );
}
