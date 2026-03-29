import { BaseUseCase } from '../base/BaseUseCase';
import { ICreditCardRepository } from '@/domain/repositories/ICreditCardRepository';
import { CreditCard } from '@/types/firestore';

/**
 * Input for getting upcoming credit card payments
 */
export interface GetUpcomingPaymentsInput {
  daysAhead?: number; // How many days to look ahead (default: 30)
}

/**
 * Payment due information
 */
export interface PaymentDue {
  creditCardId: string;
  creditCardName: string;
  bank: string;
  lastFourDigits: string;
  currentBalance: number;
  minimumPayment: number;
  paymentDueDay: number;
  daysUntilDue: number;
  isOverdue: boolean;
  isPastCutoff: boolean;
}

/**
 * Output with upcoming payments
 */
export interface GetUpcomingPaymentsOutput {
  payments: PaymentDue[];
  totalDue: number;
  overdueCount: number;
}

/**
 * Use Case: Get Upcoming Payments
 * Retrieves all upcoming credit card payments within a specified time frame
 */
export class GetUpcomingPaymentsUseCase extends BaseUseCase<
  GetUpcomingPaymentsInput,
  GetUpcomingPaymentsOutput
> {
  constructor(private creditCardRepo: ICreditCardRepository) {
    super();
  }

  async execute(input: GetUpcomingPaymentsInput): Promise<GetUpcomingPaymentsOutput> {
    const daysAhead = input.daysAhead || 30;

    // Get all active credit cards
    const allCreditCards = await this.creditCardRepo.getAll();
    const activeCreditCards = allCreditCards.filter((card) => card.isActive);

    // Calculate payment due information for each card
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const payments: PaymentDue[] = [];

    for (const card of activeCreditCards) {
      const paymentDue = this.calculatePaymentDueInfo(
        card,
        today,
        currentDay,
        currentMonth,
        currentYear,
        daysAhead
      );

      if (paymentDue) {
        payments.push(paymentDue);
      }
    }

    // Sort by days until due (overdue first, then soonest)
    payments.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return a.daysUntilDue - b.daysUntilDue;
    });

    // Calculate totals
    const totalDue = payments.reduce((sum, p) => sum + p.minimumPayment, 0);
    const overdueCount = payments.filter((p) => p.isOverdue).length;

    return {
      payments,
      totalDue,
      overdueCount,
    };
  }

  private calculatePaymentDueInfo(
    card: CreditCard,
    today: Date,
    currentDay: number,
    currentMonth: number,
    currentYear: number,
    daysAhead: number
  ): PaymentDue | null {
    const paymentDueDay = card.paymentDueDay;

    // Calculate the due date
    let dueDate: Date;

    if (paymentDueDay >= currentDay) {
      // Due date is this month
      dueDate = new Date(currentYear, currentMonth, paymentDueDay);
    } else {
      // Due date is next month
      dueDate = new Date(currentYear, currentMonth + 1, paymentDueDay);
    }

    // Calculate days until due (negative if overdue)
    const daysUntilDue = Math.ceil(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Only include if within the specified time frame or overdue
    if (daysUntilDue > daysAhead && daysUntilDue > 0) {
      return null;
    }

    const isOverdue = daysUntilDue < 0;

    // Check if past cutoff date
    const cutoffDate = new Date(currentYear, currentMonth, card.cutoffDay);
    const isPastCutoff = today > cutoffDate;

    // Calculate minimum payment
    const minimumPayment = this.calculateMinimumPayment(
      card.currentBalance,
      card.minimumPaymentPercent
    );

    return {
      creditCardId: card.id,
      creditCardName: card.name,
      bank: card.bank,
      lastFourDigits: card.lastFourDigits,
      currentBalance: card.currentBalance,
      minimumPayment,
      paymentDueDay: card.paymentDueDay,
      daysUntilDue,
      isOverdue,
      isPastCutoff,
    };
  }

  private calculateMinimumPayment(currentBalance: number, minimumPercent: number): number {
    const percentagePayment = (currentBalance * minimumPercent) / 100;
    const MINIMUM_FLOOR = 25;
    return Math.min(Math.max(percentagePayment, MINIMUM_FLOOR), currentBalance);
  }
}
