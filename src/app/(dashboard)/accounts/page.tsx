'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Landmark, PlusCircle, Wallet } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useAccounts } from '@/application/hooks/useAccounts';
import { CreateAccountSchema } from '@/application/validators/accountValidator';
import type { z } from 'zod';
import type { AccountType } from '@/types/firestore';
import { formatCurrency } from '@/lib/utils/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type AccountFormValues = z.infer<typeof CreateAccountSchema>;

const defaultAccountFormValues = (userId: string): AccountFormValues => ({
  name: '',
  type: 'CHECKING',
  balance: 0,
  currency: 'CLP',
  userId,
  isActive: true,
  description: '',
  bankName: '',
  cardNumber: '',
  creditLimit: undefined,
  creditCardCutoffDay: undefined,
  creditCardPaymentDays: undefined,
});

const accountTypeOptions: Array<{ value: AccountType; label: string }> = [
  { value: 'CHECKING', label: 'Cuenta Corriente / Débito' },
  { value: 'SAVINGS', label: 'Cuenta de Ahorro' },
  { value: 'CASH', label: 'Efectivo' },
  { value: 'INVESTMENT', label: 'Inversión' },
  { value: 'CREDIT_CARD', label: 'Tarjeta de Crédito' },
  { value: 'LINE_OF_CREDIT', label: 'Línea de Crédito' },
];

export default function AccountsPage() {
  const { user } = useAuth();
  const { currentOrgId, currentOrganization } = useOrganization();

  if (!user || !currentOrgId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Cargando cuentas...</p>
      </div>
    );
  }

  return (
    <AccountsContent
      orgId={currentOrgId}
      userId={user.id}
      organizationName={currentOrganization?.name || 'Organización actual'}
    />
  );
}

function AccountsContent({
  orgId,
  userId,
  organizationName,
}: {
  orgId: string;
  userId: string;
  organizationName: string;
}) {
  const accountsHook = useAccounts(orgId);
  const { data: accounts = [], isLoading } = accountsHook.useAllAccounts();

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(CreateAccountSchema) as any,
    defaultValues: defaultAccountFormValues(userId),
  });

  const selectedType = form.watch('type');
  const totalBalance = useMemo(
    () => accounts.filter((account) => account.isActive).reduce((sum, account) => sum + account.balance, 0),
    [accounts]
  );

  const onSubmit = async (values: AccountFormValues) => {
    try {
      const isCreditAccount = values.type === 'CREDIT_CARD' || values.type === 'LINE_OF_CREDIT';
      const paymentDueDay = isCreditAccount && values.creditCardCutoffDay && values.creditCardPaymentDays
        ? Math.min(values.creditCardCutoffDay + values.creditCardPaymentDays, 31)
        : undefined;

      await accountsHook.createAccount.mutateAsync({
        name: values.name,
        type: values.type,
        balance: values.balance,
        currency: values.currency,
        userId: values.userId,
        isActive: values.isActive,
        bankName: values.bankName || undefined,
        cardNumber: values.cardNumber || undefined,
        creditLimit: isCreditAccount ? values.creditLimit : undefined,
        creditCardId: undefined,
        cutoffDay: isCreditAccount ? values.creditCardCutoffDay : undefined,
        paymentDueDay,
        availableCredit: isCreditAccount ? values.creditLimit : undefined,
      } as any);

      toast.success('Cuenta creada exitosamente');
      form.reset(defaultAccountFormValues(userId));
    } catch (error: any) {
      console.error('Error al crear cuenta:', error);
      toast.error('No se pudo crear la cuenta', {
        description: error.message || 'Inténtalo nuevamente.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Cuentas</h1>
        <p className="text-muted-foreground">
          Registra desde dónde gastas y en qué cuenta recibes dinero en {organizationName}.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5" />
              Nueva cuenta
            </CardTitle>
            <CardDescription>
              Crea cuentas para efectivo, banco, ahorro, inversión o tarjeta de crédito.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Banco Principal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accountTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bankName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banco (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Banco Estado, BCI, Santander" {...field} />
                      </FormControl>
                      <FormDescription>
                        Nombre de la institución financiera
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cardNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Últimos 4 dígitos (opcional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="1234" 
                          maxLength={4}
                          pattern="\d{4}"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Solo los últimos 4 dígitos de la tarjeta
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="balance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Saldo inicial</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(event) => field.onChange(Number(event.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Moneda</FormLabel>
                        <FormControl>
                          <Input placeholder="CLP" maxLength={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {selectedType === 'CREDIT_CARD' || selectedType === 'LINE_OF_CREDIT' ? (
                  <>
                    <FormField
                      control={form.control}
                      name="creditLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Límite de crédito</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              value={field.value ?? ''}
                              onChange={(event) => field.onChange(Number(event.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="creditCardCutoffDay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Día de corte</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                max="31"
                                value={field.value ?? ''}
                                onChange={(event) => field.onChange(Number(event.target.value) || undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="creditCardPaymentDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Días hasta pago</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                max="60"
                                value={field.value ?? ''}
                                onChange={(event) => field.onChange(Number(event.target.value) || undefined)}
                              />
                            </FormControl>
                            <FormDescription>
                              Se usará para calcular el día de pago aproximado.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                ) : null}

                <Button type="submit" className="w-full" disabled={accountsHook.createAccount.isPending}>
                  {accountsHook.createAccount.isPending ? 'Guardando...' : 'Crear cuenta'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Tus cuentas
            </CardTitle>
            <CardDescription>
              Balance total actual: {formatCurrency(totalBalance)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Cargando cuentas...</p>
            ) : accounts.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <Landmark className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-medium">Aún no tienes cuentas registradas</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Crea tu primera cuenta para poder registrar ingresos y gastos.
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Banco</TableHead>
                      <TableHead>Tarjeta</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">{account.name}</TableCell>
                        <TableCell>
                          {accountTypeOptions.find((option) => option.value === account.type)?.label || account.type}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {account.bankName || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {account.cardNumber ? `**** ${account.cardNumber}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={account.isActive ? 'default' : 'secondary'}>
                            {account.isActive ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(account.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
