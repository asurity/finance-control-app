'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
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

import { useSavingsGoals } from '@/application/hooks/useSavingsGoals';
import { useAccounts } from '@/application/hooks/useAccounts';
import type { SavingsGoal } from '@/types/firestore';

const GOAL_ICONS = [
  { value: '🎯', label: 'Objetivo' },
  { value: '🏠', label: 'Casa' },
  { value: '🚗', label: 'Auto' },
  { value: '✈️', label: 'Viaje' },
  { value: '🎓', label: 'Educación' },
  { value: '💻', label: 'Tecnología' },
  { value: '🏥', label: 'Salud' },
  { value: '🎉', label: 'Evento' },
  { value: '💍', label: 'Boda' },
  { value: '🛡️', label: 'Emergencia' },
  { value: '📱', label: 'Celular' },
  { value: '🏖️', label: 'Vacaciones' },
];

const SavingsGoalSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
  description: z.string().max(300, 'Máximo 300 caracteres').optional(),
  targetAmount: z.number().positive('El monto debe ser mayor a cero'),
  icon: z.string().optional(),
  targetDate: z.string().optional(),
  linkedAccountId: z.string().optional(),
});

type SavingsGoalFormValues = z.infer<typeof SavingsGoalSchema>;

interface SavingsGoalFormProps {
  orgId: string;
  userId: string;
  initialData?: SavingsGoal;
  onSuccess?: () => void;
}

export function SavingsGoalForm({ orgId, userId, initialData, onSuccess }: SavingsGoalFormProps) {
  const savingsHook = useSavingsGoals(orgId, userId);
  const accountsHook = useAccounts(orgId);

  const { mutate: createGoal, isPending: isCreating } = savingsHook.createSavingsGoal;
  const { mutate: updateGoal, isPending: isUpdating } = savingsHook.updateSavingsGoal;
  const { data: accounts = [] } = accountsHook.useAllAccounts();

  const isEditing = !!initialData;
  const isPending = isCreating || isUpdating;

  const form = useForm<SavingsGoalFormValues>({
    resolver: zodResolver(SavingsGoalSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      targetAmount: initialData?.targetAmount || 0,
      icon: initialData?.icon || '🎯',
      targetDate: initialData?.targetDate
        ? format(
            initialData.targetDate instanceof Date
              ? initialData.targetDate
              : new Date(initialData.targetDate),
            'yyyy-MM-dd'
          )
        : '',
      linkedAccountId: initialData?.linkedAccountId || 'none',
    },
  });

  const onSubmit = (values: SavingsGoalFormValues) => {
    if (isEditing && initialData) {
      updateGoal(
        {
          id: initialData.id,
          data: {
            name: values.name,
            description: values.description,
            targetAmount: values.targetAmount,
            icon: values.icon,
            targetDate: values.targetDate ? new Date(values.targetDate) : undefined,
            linkedAccountId: values.linkedAccountId && values.linkedAccountId !== 'none' ? values.linkedAccountId : undefined,
          },
        },
        { onSuccess }
      );
    } else {
      createGoal(
        {
          name: values.name,
          description: values.description,
          targetAmount: values.targetAmount,
          currentAmount: 0,
          currency: 'CLP',
          status: 'ACTIVE',
          icon: values.icon,
          targetDate: values.targetDate ? new Date(values.targetDate) : undefined,
          linkedAccountId: values.linkedAccountId && values.linkedAccountId !== 'none' ? values.linkedAccountId : undefined,
          userId,
        } as Omit<SavingsGoal, 'id'>,
        { onSuccess }
      );
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre de la meta</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Fondo de emergencia" {...field} />
              </FormControl>
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
              <FormLabel>Descripción (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Ej: 3 meses de gastos fijos" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Target Amount */}
        <FormField
          control={form.control}
          name="targetAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monto objetivo</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0"
                  {...field}
                  value={field.value || ''}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormDescription>El monto total que deseas ahorrar</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          {/* Icon */}
          <FormField
            control={form.control}
            name="icon"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Icono</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar icono" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {GOAL_ICONS.map((icon) => (
                      <SelectItem key={icon.value} value={icon.value}>
                        {icon.value} {icon.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Target Date */}
          <FormField
            control={form.control}
            name="targetDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha objetivo (opcional)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Linked Account */}
        <FormField
          control={form.control}
          name="linkedAccountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cuenta vinculada (opcional)</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value || 'none'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin cuenta vinculada" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Sin cuenta vinculada</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Opcional: vincula una cuenta para rastrear los aportes
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Guardar Cambios' : 'Crear Meta'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
