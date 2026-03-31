'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { toast } from 'sonner';
import {
  Sparkles,
  Wallet,
  PiggyBank,
  LayoutGrid,
  ChevronRight,
  ChevronLeft,
  SkipForward,
  Loader2,
  Check,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

import { useAccounts } from '@/application/hooks/useAccounts';
import { useBudgetPeriods } from '@/application/hooks/useBudgetPeriods';
import { useCategoryBudgets } from '@/application/hooks/useCategoryBudgets';
import { useCategories } from '@/application/hooks/useCategories';

// ========================================
// Schemas
// ========================================

const accountSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  type: z.enum(['CHECKING', 'SAVINGS', 'CASH']),
  balance: z.number().finite('Debe ser un número válido'),
  currency: z.string().default('CLP'),
});

const budgetSchema = z.object({
  totalAmount: z.number().positive('El monto debe ser mayor a 0'),
});

type AccountFormValues = z.infer<typeof accountSchema>;
type BudgetFormValues = z.infer<typeof budgetSchema>;

// ========================================
// Suggested categories with percentages
// ========================================

const SUGGESTED_CATEGORIES = [
  { name: 'Alimentación', percentage: 30 },
  { name: 'Transporte', percentage: 15 },
  { name: 'Servicios', percentage: 20 },
  { name: 'Entretenimiento', percentage: 10 },
  { name: 'Salud', percentage: 10 },
  { name: 'Otros', percentage: 15 },
];

// ========================================
// Props
// ========================================

interface OnboardingWizardProps {
  orgId: string;
  userId: string;
  onComplete: () => void;
}

// ========================================
// Step Components
// ========================================

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center space-y-6 py-8">
      <div className="rounded-full bg-primary/10 p-6">
        <Sparkles className="h-12 w-12 text-primary" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">¡Bienvenido a Control Financiero!</h2>
        <p className="text-muted-foreground max-w-md">
          Vamos a configurar tu cuenta en 2 minutos. Te guiaremos paso a paso para que puedas
          empezar a controlar tus finanzas.
        </p>
      </div>
      <Button size="lg" onClick={onNext} className="gap-2">
        Comenzar <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function StepAccount({
  orgId,
  userId,
  onNext,
  onSkip,
}: {
  orgId: string;
  userId: string;
  onNext: () => void;
  onSkip: () => void;
}) {
  const { createAccount } = useAccounts(orgId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      type: 'CHECKING',
      balance: 0,
      currency: 'CLP',
    },
  });

  const handleSubmit = async (values: AccountFormValues) => {
    setIsSubmitting(true);
    try {
      await createAccount.mutateAsync({
        ...values,
        userId,
        isActive: true,
      });
      toast.success('Cuenta creada exitosamente');
      onNext();
    } catch (error) {
      toast.error('Error al crear la cuenta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3">
          <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Crear tu primera cuenta</h2>
          <p className="text-sm text-muted-foreground">
            Agrega la cuenta principal desde donde manejas tu dinero.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre de la cuenta</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Cuenta corriente BancoEstado" {...field} />
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
                <FormLabel>Tipo de cuenta</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="CHECKING">Cuenta corriente</SelectItem>
                    <SelectItem value="SAVINGS">Cuenta de ahorro</SelectItem>
                    <SelectItem value="CASH">Efectivo</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="balance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Saldo inicial</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between pt-4">
            <Button type="button" variant="ghost" onClick={onSkip} className="gap-1">
              <SkipForward className="h-4 w-4" /> Omitir
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Crear cuenta <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

function StepBudgetPeriod({
  orgId,
  userId,
  onNext,
  onSkip,
  onCreated,
}: {
  orgId: string;
  userId: string;
  onNext: () => void;
  onSkip: () => void;
  onCreated: (periodId: string) => void;
}) {
  const { createBudgetPeriod } = useBudgetPeriods(orgId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      totalAmount: 500000,
    },
  });

  const handleSubmit = async (values: BudgetFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await createBudgetPeriod.mutateAsync({
        totalAmount: values.totalAmount,
        startDate,
        endDate,
        userId,
        name: `Presupuesto ${now.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}`,
      });
      toast.success('Período de presupuesto creado');
      onCreated(result.id);
      onNext();
    } catch (error) {
      toast.error('Error al crear el período');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
          <PiggyBank className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Crear período de presupuesto</h2>
          <p className="text-sm text-muted-foreground">
            Define cuánto planeas gastar este mes. Después podrás ajustarlo.
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-muted/50 p-4 text-sm">
        <p className="font-medium">Período automático:</p>
        <p className="text-muted-foreground">
          {startDate.toLocaleDateString('es-CL')} — {endDate.toLocaleDateString('es-CL')}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="totalAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monto total del presupuesto</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="500000"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between pt-4">
            <Button type="button" variant="ghost" onClick={onSkip} className="gap-1">
              <SkipForward className="h-4 w-4" /> Omitir
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Crear presupuesto <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

function StepCategories({
  orgId,
  userId,
  budgetPeriodId,
  onComplete,
  onSkip,
}: {
  orgId: string;
  userId: string;
  budgetPeriodId: string | null;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const { useAllCategories } = useCategories(orgId);
  const { setCategoryBudget } = useCategoryBudgets(orgId);
  const { data: categories = [] } = useAllCategories();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selections, setSelections] = useState<Record<string, { enabled: boolean; percentage: number }>>({});

  // Match suggested categories to actual categories by name
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');

  const getCategoryMatch = (suggestedName: string) => {
    return expenseCategories.find(
      (c) => c.name.toLowerCase().includes(suggestedName.toLowerCase()) ||
        suggestedName.toLowerCase().includes(c.name.toLowerCase())
    );
  };

  const toggleCategory = (categoryId: string, percentage: number) => {
    setSelections((prev) => ({
      ...prev,
      [categoryId]: {
        enabled: !prev[categoryId]?.enabled,
        percentage: prev[categoryId]?.percentage ?? percentage,
      },
    }));
  };

  const updatePercentage = (categoryId: string, percentage: number) => {
    setSelections((prev) => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        percentage,
      },
    }));
  };

  const handleComplete = async () => {
    if (!budgetPeriodId) {
      onComplete();
      return;
    }

    const selectedCategories = Object.entries(selections).filter(([, v]) => v.enabled);
    if (selectedCategories.length === 0) {
      onComplete();
      return;
    }

    setIsSubmitting(true);
    try {
      for (const [categoryId, { percentage }] of selectedCategories) {
        await setCategoryBudget.mutateAsync({
          budgetPeriodId,
          categoryId,
          percentage,
          userId,
        });
      }
      toast.success('Categorías asignadas exitosamente');
      onComplete();
    } catch (error) {
      toast.error('Error al asignar categorías');
      onComplete(); // Still complete the wizard
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-3">
          <LayoutGrid className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Asignar categorías al presupuesto</h2>
          <p className="text-sm text-muted-foreground">
            Selecciona las categorías y asigna un porcentaje del presupuesto a cada una.
          </p>
        </div>
      </div>

      {!budgetPeriodId ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          <p>No se creó un período de presupuesto.</p>
          <p>Puedes asignar categorías más adelante desde la sección de Presupuestos.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {SUGGESTED_CATEGORIES.map((suggested) => {
            const match = getCategoryMatch(suggested.name);
            if (!match) return null;

            const isEnabled = selections[match.id]?.enabled ?? false;
            const percentage = selections[match.id]?.percentage ?? suggested.percentage;

            return (
              <div
                key={match.id}
                className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                  isEnabled ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => toggleCategory(match.id, suggested.percentage)}
                  />
                  <div>
                    <p className="font-medium text-sm">{match.name}</p>
                    <p className="text-xs text-muted-foreground">{match.icon}</p>
                  </div>
                </div>
                {isEnabled && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={percentage}
                      onChange={(e) => updatePercentage(match.id, Number(e.target.value))}
                      className="w-16 h-8 text-center text-sm"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Show unmatched categories */}
          {expenseCategories
            .filter((c) => !SUGGESTED_CATEGORIES.some((s) => getCategoryMatch(s.name)?.id === c.id))
            .map((cat) => {
              const isEnabled = selections[cat.id]?.enabled ?? false;
              const percentage = selections[cat.id]?.percentage ?? 5;

              return (
                <div
                  key={cat.id}
                  className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                    isEnabled ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => toggleCategory(cat.id, 5)}
                    />
                    <div>
                      <p className="font-medium text-sm">{cat.name}</p>
                      <p className="text-xs text-muted-foreground">{cat.icon}</p>
                    </div>
                  </div>
                  {isEnabled && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={percentage}
                        onChange={(e) => updatePercentage(cat.id, Number(e.target.value))}
                        className="w-16 h-8 text-center text-sm"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button type="button" variant="ghost" onClick={onSkip} className="gap-1">
          <SkipForward className="h-4 w-4" /> Omitir
        </Button>
        <Button onClick={handleComplete} disabled={isSubmitting} className="gap-2">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Finalizar configuración
        </Button>
      </div>
    </div>
  );
}

// ========================================
// Main Wizard Component
// ========================================

export function OnboardingWizard({ orgId, userId, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [budgetPeriodId, setBudgetPeriodId] = useState<string | null>(null);

  const totalSteps = 4;
  const progress = ((step + 1) / totalSteps) * 100;

  const handleComplete = async () => {
    try {
      // Mark onboarding as completed
      await setDoc(
        doc(db, `userSettings/${userId}`),
        { onboardingCompleted: true, completedAt: new Date() },
        { merge: true }
      );
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-lg mx-4 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-2">
            <CardDescription>
              Paso {step + 1} de {totalSteps}
            </CardDescription>
            {step > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep(step - 1)}
                className="gap-1 h-7"
              >
                <ChevronLeft className="h-3 w-3" /> Atrás
              </Button>
            )}
          </div>
          <Progress value={progress} className="h-2" />
        </CardHeader>
        <CardContent>
          {step === 0 && <StepWelcome onNext={() => setStep(1)} />}
          {step === 1 && (
            <StepAccount
              orgId={orgId}
              userId={userId}
              onNext={() => setStep(2)}
              onSkip={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <StepBudgetPeriod
              orgId={orgId}
              userId={userId}
              onNext={() => setStep(3)}
              onSkip={() => setStep(3)}
              onCreated={(id) => setBudgetPeriodId(id)}
            />
          )}
          {step === 3 && (
            <StepCategories
              orgId={orgId}
              userId={userId}
              budgetPeriodId={budgetPeriodId}
              onComplete={handleComplete}
              onSkip={handleComplete}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
