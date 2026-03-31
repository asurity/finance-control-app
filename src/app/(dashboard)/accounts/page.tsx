'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Landmark,
  PlusCircle,
  Wallet,
  MoreVertical,
  Pencil,
  Trash2,
  TrendingUp,
  CreditCard,
} from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';
import { useAccounts } from '@/application/hooks/useAccounts';
import { useDebtSummary } from '@/presentation/components/features/dashboard/hooks/useDebtSummary';
import {
  CreateAccountSchema,
  UpdateAccountSchema,
} from '@/application/validators/accountValidator';
import type { z } from 'zod';
import type { AccountType } from '@/types/firestore';
import type { Account } from '@/types/firestore';
import { MoneyDisplay } from '@/presentation/components/shared/MoneyDisplay';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type AccountFormValues = z.infer<typeof CreateAccountSchema>;
type UpdateAccountFormValues = z.infer<typeof UpdateAccountSchema>;

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
  const { data: debtSummary, isLoading: isLoadingDebtSummary } = useDebtSummary();

  // State for edit and delete dialogs
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(CreateAccountSchema) as any,
    defaultValues: defaultAccountFormValues(userId),
  });

  const editForm = useForm<UpdateAccountFormValues>({
    resolver: zodResolver(UpdateAccountSchema) as any,
  });

  const selectedType = form.watch('type');
  const editSelectedType = editForm.watch('type');

  // Separate accounts by type
  const assetAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.isActive &&
          (account.type === 'CHECKING' ||
            account.type === 'SAVINGS' ||
            account.type === 'CASH' ||
            account.type === 'INVESTMENT')
      ),
    [accounts]
  );

  const debtAccounts = useMemo(
    () =>
      accounts.filter(
        (account) =>
          account.isActive && (account.type === 'CREDIT_CARD' || account.type === 'LINE_OF_CREDIT')
      ),
    [accounts]
  );

  const totalBalance = useMemo(
    () =>
      accounts
        .filter((account) => account.isActive)
        .reduce((sum, account) => sum + account.balance, 0),
    [accounts]
  );

  const onSubmit = async (values: AccountFormValues) => {
    try {
      const isCreditAccount = values.type === 'CREDIT_CARD' || values.type === 'LINE_OF_CREDIT';
      const paymentDueDay =
        isCreditAccount && values.creditCardCutoffDay && values.creditCardPaymentDays
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

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);

    // Convertir los valores del account al formato que espera el formulario
    const isCreditAccount = account.type === 'CREDIT_CARD' || account.type === 'LINE_OF_CREDIT';

    editForm.reset({
      id: account.id,
      name: account.name,
      type: account.type,
      balance: account.balance,
      currency: account.currency,
      isActive: account.isActive,
      bankName: account.bankName || '',
      cardNumber: account.cardNumber || '',
      creditLimit: isCreditAccount ? account.creditLimit : undefined,
      creditCardCutoffDay: isCreditAccount ? account.cutoffDay : undefined,
      creditCardPaymentDays:
        isCreditAccount && account.cutoffDay && account.paymentDueDay
          ? account.paymentDueDay - account.cutoffDay
          : undefined,
    } as any);

    setIsEditDialogOpen(true);
  };

  const handleUpdateAccount = async (values: UpdateAccountFormValues) => {
    try {
      const isCreditAccount = values.type === 'CREDIT_CARD' || values.type === 'LINE_OF_CREDIT';
      const paymentDueDay =
        isCreditAccount && values.creditCardCutoffDay && values.creditCardPaymentDays
          ? Math.min(values.creditCardCutoffDay + values.creditCardPaymentDays, 31)
          : undefined;

      await accountsHook.updateAccount.mutateAsync({
        id: values.id,
        name: values.name,
        type: values.type,
        balance: values.balance,
        currency: values.currency,
        isActive: values.isActive,
        bankName: values.bankName || undefined,
        cardNumber: values.cardNumber || undefined,
        creditLimit: isCreditAccount ? values.creditLimit : undefined,
        cutoffDay: isCreditAccount ? values.creditCardCutoffDay : undefined,
        paymentDueDay,
        availableCredit:
          isCreditAccount && values.creditLimit && values.balance !== undefined
            ? values.type === 'LINE_OF_CREDIT'
              ? values.balance
              : values.creditLimit - Math.abs(values.balance)
            : undefined,
      });

      toast.success('Cuenta actualizada exitosamente');
      setIsEditDialogOpen(false);
      setEditingAccount(null);
    } catch (error: any) {
      console.error('Error al actualizar cuenta:', error);
      toast.error('No se pudo actualizar la cuenta', {
        description: error.message || 'Inténtalo nuevamente.',
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletingAccount) return;

    try {
      await accountsHook.deleteAccount.mutateAsync(deletingAccount.id);
      toast.success('Cuenta eliminada exitosamente');
      setIsDeleteDialogOpen(false);
      setDeletingAccount(null);
    } catch (error: any) {
      console.error('Error al eliminar cuenta:', error);
      toast.error('No se pudo eliminar la cuenta', {
        description: error.message || 'Puede que tenga transacciones asociadas.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Cuentas</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Registra desde dónde gastas y en qué cuenta recibes dinero en {organizationName}.
        </p>
      </div>

      {/* Financial Summary */}
      {debtSummary && !isLoadingDebtSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Resumen Financiero
            </CardTitle>
            <CardDescription>Visión general de tu patrimonio neto</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Net Worth */}
              <div className="text-center py-4 px-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Patrimonio Neto</p>
                <div className="flex items-center justify-center gap-2">
                  <span
                    className={`text-3xl font-bold ${
                      debtSummary.netWorth >= 0
                        ? 'text-green-600 dark:text-green-500'
                        : 'text-red-600 dark:text-red-500'
                    }`}
                  >
                    {debtSummary.netWorth >= 0 ? '↑' : '↓'}
                  </span>
                  <MoneyDisplay
                    amount={Math.abs(debtSummary.netWorth)}
                    className="text-3xl font-bold"
                    showSign={false}
                  />
                </div>
              </div>

              {/* Assets vs Debts */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm font-medium">Total Activos</span>
                    </div>
                    <MoneyDisplay
                      amount={debtSummary.totalAssets}
                      className="font-semibold"
                      showSign={false}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground pl-5">
                    {assetAccounts.length} cuenta{assetAccounts.length !== 1 ? 's' : ''} activa
                    {assetAccounts.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-sm font-medium">Total Deudas</span>
                    </div>
                    <MoneyDisplay
                      amount={debtSummary.totalDebt}
                      className="font-semibold"
                      showSign={false}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground pl-5">
                    {debtAccounts.length} cuenta{debtAccounts.length !== 1 ? 's' : ''} de crédito
                  </p>
                </div>
              </div>

              {/* Visual bar */}
              <div className="flex h-4 rounded-full overflow-hidden bg-muted">
                {debtSummary.totalAssets > 0 && (
                  <div
                    className="bg-green-500 transition-all flex items-center justify-center text-xs text-white font-medium"
                    style={{
                      width: `${(debtSummary.totalAssets / (debtSummary.totalAssets + debtSummary.totalDebt)) * 100}%`,
                    }}
                  >
                    {debtSummary.totalAssets > debtSummary.totalDebt && (
                      <span className="px-2">
                        {(
                          (debtSummary.totalAssets /
                            (debtSummary.totalAssets + debtSummary.totalDebt)) *
                          100
                        ).toFixed(0)}
                        %
                      </span>
                    )}
                  </div>
                )}
                {debtSummary.totalDebt > 0 && (
                  <div
                    className="bg-red-500 transition-all flex items-center justify-center text-xs text-white font-medium"
                    style={{
                      width: `${(debtSummary.totalDebt / (debtSummary.totalAssets + debtSummary.totalDebt)) * 100}%`,
                    }}
                  >
                    {debtSummary.totalDebt > debtSummary.totalAssets && (
                      <span className="px-2">
                        {(
                          (debtSummary.totalDebt /
                            (debtSummary.totalAssets + debtSummary.totalDebt)) *
                          100
                        ).toFixed(0)}
                        %
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                      <FormDescription>Nombre de la institución financiera</FormDescription>
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
                        <Input placeholder="1234" maxLength={4} pattern="\d{4}" {...field} />
                      </FormControl>
                      <FormDescription>Solo los últimos 4 dígitos de la tarjeta</FormDescription>
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
                              onChange={(event) =>
                                field.onChange(Number(event.target.value) || undefined)
                              }
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
                                onChange={(event) =>
                                  field.onChange(Number(event.target.value) || undefined)
                                }
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
                                onChange={(event) =>
                                  field.onChange(Number(event.target.value) || undefined)
                                }
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

                <Button
                  type="submit"
                  className="w-full"
                  disabled={accountsHook.createAccount.isPending}
                >
                  {accountsHook.createAccount.isPending ? 'Guardando...' : 'Crear cuenta'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Asset and Debt Accounts Section */}
        <div className="space-y-6">
          {/* Asset Accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Mis Cuentas
              </CardTitle>
              <CardDescription>
                Cuentas de activos:{' '}
                {assetAccounts.length > 0 && (
                  <>
                    Balance total:{' '}
                    <MoneyDisplay amount={debtSummary?.totalAssets ?? 0} type="balance" size="sm" />
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground">Cargando cuentas...</p>
              ) : assetAccounts.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Landmark className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="font-medium">No tienes cuentas de activos</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Crea una cuenta corriente, de ahorro o efectivo.
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
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assetAccounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">{account.name}</TableCell>
                          <TableCell>
                            {accountTypeOptions.find((option) => option.value === account.type)
                              ?.label || account.type}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {account.bankName || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={account.isActive ? 'default' : 'secondary'}>
                              {account.isActive ? 'Activa' : 'Inactiva'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <MoneyDisplay amount={account.balance} type="balance" size="sm" />
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">Abrir menú</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditAccount(account)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setDeletingAccount(account);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  className="text-red-600 dark:text-red-400"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Debt Accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Mis Deudas
              </CardTitle>
              <CardDescription>
                Tarjetas de crédito y líneas de crédito:{' '}
                {debtAccounts.length > 0 && (
                  <>
                    Total adeudado:{' '}
                    <MoneyDisplay amount={debtSummary?.totalDebt ?? 0} type="expense" size="sm" />
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground">Cargando deudas...</p>
              ) : debtAccounts.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <CreditCard className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="font-medium">No tienes cuentas de crédito registradas</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Registra tus tarjetas de crédito o líneas de crédito.
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
                        <TableHead className="text-right">Saldo/Deuda</TableHead>
                        <TableHead className="text-right">Límite</TableHead>
                        <TableHead className="text-right">Disponible</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {debtAccounts.map((account) => {
                        const isCreditAccount =
                          account.type === 'CREDIT_CARD' || account.type === 'LINE_OF_CREDIT';
                        const creditLimit = account.creditLimit || 0;

                        // Calculate used credit and available credit based on account type
                        let usedCredit = 0;
                        let availableCredit = 0;

                        if (isCreditAccount && creditLimit > 0) {
                          if (account.type === 'LINE_OF_CREDIT') {
                            // LINE_OF_CREDIT: balance is available (positive), used = limit - balance
                            availableCredit = account.balance;
                            usedCredit = creditLimit - account.balance;
                          } else {
                            // CREDIT_CARD: balance is debt (negative), used = |balance|
                            usedCredit = Math.abs(account.balance);
                            availableCredit = creditLimit - usedCredit;
                          }
                        }

                        const creditUtilization =
                          isCreditAccount && creditLimit > 0 ? (usedCredit / creditLimit) * 100 : 0;

                        return (
                          <TableRow key={account.id}>
                            <TableCell className="font-medium">{account.name}</TableCell>
                            <TableCell>
                              {accountTypeOptions.find((option) => option.value === account.type)
                                ?.label || account.type}
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
                            <TableCell className="text-right">
                              <MoneyDisplay amount={account.balance} type="balance" size="sm" />
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {isCreditAccount && creditLimit > 0 ? (
                                <MoneyDisplay amount={creditLimit} type="neutral" size="sm" />
                              ) : (
                                '-'
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isCreditAccount && creditLimit > 0 ? (
                                <div className="space-y-1">
                                  <MoneyDisplay
                                    amount={availableCredit}
                                    type="neutral"
                                    size="sm"
                                    className={
                                      creditUtilization > 90
                                        ? 'text-red-600 dark:text-red-400'
                                        : creditUtilization > 70
                                          ? 'text-yellow-600 dark:text-yellow-400'
                                          : 'text-green-600 dark:text-green-400'
                                    }
                                  />
                                  <Progress value={creditUtilization} className="h-1.5" />
                                  <p className="text-xs text-muted-foreground">
                                    {creditUtilization.toFixed(0)}% usado
                                  </p>
                                </div>
                              ) : (
                                <MoneyDisplay amount={account.balance} type="balance" size="sm" />
                              )}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                    <span className="sr-only">Abrir menú</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditAccount(account)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setDeletingAccount(account);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                    className="text-red-600 dark:text-red-400"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Account Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar cuenta</DialogTitle>
            <DialogDescription>
              Modifica los datos de tu cuenta. Ten cuidado al cambiar el saldo manualmente.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleUpdateAccount)} className="space-y-4">
              <FormField
                control={editForm.control}
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
                control={editForm.control}
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
                control={editForm.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banco (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Banco Estado, BCI, Santander" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="cardNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Últimos 4 dígitos (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="1234" maxLength={4} pattern="\d{4}" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={editForm.control}
                  name="balance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Saldo</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(event) => field.onChange(Number(event.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>Cuidado al modificar manualmente</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
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

              {editSelectedType === 'CREDIT_CARD' || editSelectedType === 'LINE_OF_CREDIT' ? (
                <>
                  <FormField
                    control={editForm.control}
                    name="creditLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Límite de crédito</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            value={field.value ?? ''}
                            onChange={(event) =>
                              field.onChange(Number(event.target.value) || undefined)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={editForm.control}
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
                              onChange={(event) =>
                                field.onChange(Number(event.target.value) || undefined)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
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
                              onChange={(event) =>
                                field.onChange(Number(event.target.value) || undefined)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              ) : null}

              <FormField
                control={editForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Cuenta activa</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={accountsHook.updateAccount.isPending}>
                  {accountsHook.updateAccount.isPending ? 'Actualizando...' : 'Actualizar cuenta'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la cuenta{' '}
              <span className="font-semibold">{deletingAccount?.name}</span> y todos sus datos
              asociados.
              {deletingAccount && Math.abs(deletingAccount.balance) > 0 && (
                <span className="block mt-2 text-orange-600 dark:text-orange-400">
                  ⚠️ Esta cuenta tiene un saldo de{' '}
                  <MoneyDisplay
                    amount={deletingAccount.balance}
                    type="balance"
                    size="sm"
                    className="inline"
                  />
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingAccount(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
            >
              {accountsHook.deleteAccount.isPending ? 'Eliminando...' : 'Eliminar cuenta'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
