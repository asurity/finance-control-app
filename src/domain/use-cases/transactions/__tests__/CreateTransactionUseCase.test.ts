import { CreateTransactionUseCase } from '../CreateTransactionUseCase';

describe('CreateTransactionUseCase', () => {
  it('creates an expense transaction and updates account balance', async () => {
    const mockTransactionRepo = {
      create: jest.fn().mockResolvedValue('transaction-id'),
    };

    const mockAccountRepo = {
      exists: jest.fn().mockResolvedValue(true),
      getById: jest.fn().mockResolvedValue({
        id: 'account-1',
        balance: 10000,
        type: 'CHECKING',
      }),
      updateBalance: jest.fn().mockResolvedValue(undefined),
    };

    const useCase = new CreateTransactionUseCase(
      mockTransactionRepo as any,
      mockAccountRepo as any
    );

    const result = await useCase.execute({
      type: 'EXPENSE',
      amount: 5000,
      description: 'Test expense',
      date: new Date('2026-03-29'),
      accountId: 'account-1',
      categoryId: 'category-1',
      userId: 'user-1',
    });

    expect(result).toEqual({ transactionId: 'transaction-id' });
    expect(mockTransactionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 5000,
        description: 'Test expense',
        accountId: 'account-1',
      })
    );
    expect(mockAccountRepo.updateBalance).toHaveBeenCalledWith('account-1', 5000);
  });

  it('throws when expense exceeds available balance', async () => {
    const mockTransactionRepo = {
      create: jest.fn(),
    };

    const mockAccountRepo = {
      exists: jest.fn().mockResolvedValue(true),
      getById: jest.fn().mockResolvedValue({
        id: 'account-1',
        balance: 1000,
        type: 'CHECKING',
      }),
      updateBalance: jest.fn(),
    };

    const useCase = new CreateTransactionUseCase(
      mockTransactionRepo as any,
      mockAccountRepo as any
    );

    await expect(
      useCase.execute({
        type: 'EXPENSE',
        amount: 5000,
        description: 'Oversized expense',
        date: new Date('2026-03-29'),
        accountId: 'account-1',
        categoryId: 'category-1',
        userId: 'user-1',
      })
    ).rejects.toThrow('Insufficient balance');
  });
});
