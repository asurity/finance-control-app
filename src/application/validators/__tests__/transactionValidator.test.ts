import { CreateTransactionSchema } from '../transactionValidator';

describe('CreateTransactionSchema', () => {
  it('applies default tags when omitted', () => {
    const result = CreateTransactionSchema.parse({
      type: 'EXPENSE',
      amount: 25000,
      description: 'Compra supermercado',
      date: new Date('2026-03-29'),
      accountId: 'account-1',
      categoryId: 'category-1',
      userId: 'user-1',
    });

    expect(result.tags).toEqual([]);
  });

  it('rejects invalid amounts', () => {
    const result = CreateTransactionSchema.safeParse({
      type: 'EXPENSE',
      amount: 0,
      description: 'Compra supermercado',
      date: new Date('2026-03-29'),
      accountId: 'account-1',
      categoryId: 'category-1',
      userId: 'user-1',
    });

    expect(result.success).toBe(false);
  });
});
