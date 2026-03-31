'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import { CreateTransactionSchema } from '@/application/validators/transactionValidator';
import type { TransactionType, AccountType } from '@/types/firestore';
import { useTransactions } from '@/application/hooks/useTransactions';
import { useAccounts } from '@/application/hooks/useAccounts';
import { useCategories } from '@/application/hooks/useCategories';
import type { z } from 'zod';

interface TransactionFormProps {
  orgId: string;
  userId: string;
  onSuccess?: () => void;
  defaultType?: 'EXPENSE' | 'INCOME';
}

// Infer form values type from schema
type TransactionFormValues = z.infer<typeof CreateTransactionSchema>;

export function TransactionForm({ orgId, userId, onSuccess, defaultType = 'EXPENSE' }: TransactionFormProps) {
  const [selectedAccountType, setSelectedAccountType] = useState<AccountType | null>(null);

  // Initialize hooks
  const { createTransaction } = useTransactions(orgId);
  const accountsHook = useAccounts(orgId);
  const categoriesHook = useCategories(orgId);

  // Get data from hooks
  const { data: accounts = [], isLoading: accountsLoading } = accountsHook.useActiveAccounts();
  const { data: allCategories = [], isLoading: categoriesLoading } = categoriesHook.useAllCategories();

  // Initialize form
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(CreateTransactionSchema) as any,
    defaultValues: {
      type: defaultType,
      amount: 0,
      description: '',
      date: new Date(),
      accountId: '',
      categoryId: '',
      userId,
      tags: [],
      receiptUrl: '',
      installments: undefined,
    },
  });

  // Watch form values for conditional fields
  const watchType = form.watch('type');
  const watchAccountId = form.watch('accountId');

  // Filter categories by transaction type
  const filteredCategories = allCategories.filter(
    (category) => category.type === watchType
  );

  // Update selected account type when account changes
  useEffect(() => {
    if (watchAccountId && accounts.length > 0) {
      const selectedAccount = accounts.find((acc) => acc.id === watchAccountId);
      setSelectedAccountType(selectedAccount?.type || null);
      
      // Reset installments field if account type is not CREDIT_CARD
      if (selectedAccount?.type !== 'CREDIT_CARD') {
        form.setValue('installments', undefined);
      }
    }
  }, [watchAccountId, accounts, form]);

  // Reset category when transaction type changes
  useEffect(() => {
    form.setValue('categoryId', '');
  }, [watchType, form]);

  // Submit handler
  const onSubmit = async (data: TransactionFormValues) => {
    try {
      await createTransaction.mutateAsync(data);
      toast.success('Transacción registrada exitosamente');
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error al crear transacción:', error);
      toast.error('Error al registrar transacción', {
        description: error.message || 'Por favor, inténtalo de nuevo',
      });
    }
  };

  const isLoading = createTransaction.isPending || accountsLoading || categoriesLoading;

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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="INCOME">Ingreso</SelectItem>
                  <SelectItem value="EXPENSE">Egreso</SelectItem>
                </SelectContent>
              </Select>
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
              <FormDescription>
                Ingresa el monto de la transacción
              </FormDescription>
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
                <Textarea
                  placeholder="Describe la transacción..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                  onChange={(e) => {
                    const date = new Date(e.target.value + 'T00:00:00');
                    if (!isNaN(date.getTime())) {
                      field.onChange(date);
                    }
                  }}
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </FormControl>
              <FormDescription>
                Fecha en que se realizó la transacción
              </FormDescription>
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
                      {account.name} - {account.currency} {account.balance.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {accounts.length === 0 ? (
                <FormDescription>
                  Primero debes crear una cuenta en la sección Cuentas para registrar ingresos o gastos.
                </FormDescription>
              ) : null}
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
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Categorías de {watchType === 'INCOME' ? 'ingresos' : 'egresos'}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Installments - Conditional */}
        {selectedAccountType === 'CREDIT_CARD' && (
          <FormField
            control={form.control}
            name="installments"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cuotas</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="60"
                    placeholder="0 = sin cuotas, 1 = pago siguiente corte"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value) : undefined;
                      field.onChange(value);
                    }}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormDescription>
                  0 = sin cuotas (pago inmediato), 1 = pago en siguiente corte, 2+ = cuotas diferidas
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Receipt URL - Optional */}
        <FormField
          control={form.control}
          name="receiptUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL del Recibo (Opcional)</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://..."
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>
                URL de la imagen o PDF del recibo
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={isLoading || accounts.length === 0}>
          {createTransaction.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Registrando...
            </>
          ) : (
            'Registrar Transacción'
          )}
        </Button>
      </form>
    </Form>
  );
}
