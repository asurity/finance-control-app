'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

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
import { Progress } from '@/components/ui/progress';
import { MoneyDisplay } from '@/presentation/components/shared/MoneyDisplay';

import { useSavingsGoals } from '@/application/hooks/useSavingsGoals';
import { useAccounts } from '@/application/hooks/useAccounts';
import type { SavingsGoal } from '@/types/firestore';

const ContributionSchema = z.object({
  amount: z.number().positive('El monto debe ser mayor a cero'),
  fromAccountId: z.string().min(1, 'Selecciona una cuenta'),
  note: z.string().max(200, 'Máximo 200 caracteres').optional(),
});

type ContributionFormValues = z.infer<typeof ContributionSchema>;

interface ContributionFormProps {
  orgId: string;
  userId: string;
  goal: SavingsGoal;
  onSuccess?: () => void;
}

export function ContributionForm({ orgId, userId, goal, onSuccess }: ContributionFormProps) {
  const savingsHook = useSavingsGoals(orgId, userId);
  const accountsHook = useAccounts(orgId);

  const { mutate: addContribution, isPending } = savingsHook.addContribution;
  const { data: accounts = [] } = accountsHook.useAllAccounts();

  const progress = goal.targetAmount > 0
    ? (goal.currentAmount / goal.targetAmount) * 100
    : 0;
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);

  const form = useForm<ContributionFormValues>({
    resolver: zodResolver(ContributionSchema),
    defaultValues: {
      amount: 0,
      fromAccountId: goal.linkedAccountId || '',
      note: '',
    },
  });

  const onSubmit = (values: ContributionFormValues) => {
    addContribution(
      {
        goalId: goal.id,
        amount: values.amount,
        fromAccountId: values.fromAccountId,
        note: values.note,
      },
      { onSuccess }
    );
  };

  return (
    <div className="space-y-4">
      {/* Goal Progress Summary */}
      <div className="rounded-lg bg-muted p-4 space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Progreso actual</span>
          <span className="font-medium">{progress.toFixed(1)}%</span>
        </div>
        <Progress value={Math.min(progress, 100)} className="h-2" />
        <div className="flex justify-between text-sm">
          <span>
            Ahorrado: <MoneyDisplay amount={goal.currentAmount} type="income" size="sm" />
          </span>
          <span>
            Faltan: <MoneyDisplay amount={remaining} type="neutral" size="sm" />
          </span>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Amount */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monto a aportar</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0"
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  Monto restante para completar la meta: ${remaining.toLocaleString('es-CL')}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* From Account */}
          <FormField
            control={form.control}
            name="fromAccountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cuenta de origen</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cuenta" />
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

          {/* Note */}
          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nota (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Aporte del mes de marzo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Aportar
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
