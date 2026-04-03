/**
 * Tests para tools del Voice Agent
 * Fase 2: Tool Declarations
 */

import { createExpenseTool } from '../tools/createExpenseTool';
import { getBalanceTool } from '../tools/getBalanceTool';
import { listAccountsTool } from '../tools/listAccountsTool';
import { VoiceToolContext } from '../types';
import { DIContainer } from '../../di/DIContainer';

// Mock del DIContainer
const mockContainer = {
  getCreateTransactionUseCase: jest.fn(),
  getGetAccountByIdUseCase: jest.fn(),
  getAccountRepository: jest.fn(),
  getCategoryRepository: jest.fn(),
} as unknown as DIContainer;

const mockContext: VoiceToolContext = {
  userId: 'test-user-id',
  container: mockContainer,
};

describe('Voice Agent Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createExpenseTool', () => {
    it('should have correct declaration', () => {
      expect(createExpenseTool.declaration.name).toBe('create_expense');
      expect(createExpenseTool.declaration.type).toBe('function');
      expect(createExpenseTool.declaration.parameters.required).toContain('amount');
      expect(createExpenseTool.declaration.parameters.required).toContain('description');
    });

    it('should create expense successfully', async () => {
      const mockExecute = jest.fn().mockResolvedValue({
        id: 'transaction-id',
        amount: 5000,
        description: 'Almuerzo',
        type: 'EXPENSE',
      });

      (mockContainer.getCreateTransactionUseCase as jest.Mock).mockReturnValue({
        execute: mockExecute,
      });

      const result = await createExpenseTool.execute(
        {
          amount: 5000,
          description: 'Almuerzo',
          categoryId: 'category-id',
          accountId: 'account-id',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('5.000');
      expect(mockExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'EXPENSE',
          amount: 5000,
          description: 'Almuerzo',
          userId: 'test-user-id',
        })
      );
    });

    it('should fail with invalid arguments', async () => {
      const result = await createExpenseTool.execute(
        {
          amount: 'invalid',
          description: 'Test',
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error de validación');
    });

    it('should handle use case errors', async () => {
      (mockContainer.getCreateTransactionUseCase as jest.Mock).mockReturnValue({
        execute: jest.fn().mockRejectedValue(new Error('Database error')),
      });

      const result = await createExpenseTool.execute(
        {
          amount: 5000,
          description: 'Test',
          categoryId: 'cat-id',
          accountId: 'acc-id',
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('No pude registrar');
    });
  });

  describe('getBalanceTool', () => {
    it('should have correct declaration', () => {
      expect(getBalanceTool.declaration.name).toBe('get_balance');
      expect(getBalanceTool.declaration.type).toBe('function');
      expect(getBalanceTool.declaration.parameters.required).toContain('accountId');
    });

    it('should get balance successfully', async () => {
      const mockExecute = jest.fn().mockResolvedValue({
        account: {
          id: 'account-id',
          name: 'Cuenta Corriente',
          balance: 50000,
        },
      });

      (mockContainer.getGetAccountByIdUseCase as jest.Mock).mockReturnValue({
        execute: mockExecute,
      });

      const result = await getBalanceTool.execute(
        { accountId: 'account-id' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('50.000');
      expect(result.message).toContain('Cuenta Corriente');
      expect(mockExecute).toHaveBeenCalledWith({
        accountId: 'account-id',
      });
    });

    it('should fail with invalid accountId', async () => {
      const result = await getBalanceTool.execute({}, mockContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error de validación');
    });

    it('should handle account not found', async () => {
      (mockContainer.getGetAccountByIdUseCase as jest.Mock).mockReturnValue({
        execute: jest.fn().mockRejectedValue(new Error('Account not found')),
      });

      const result = await getBalanceTool.execute(
        { accountId: 'invalid-id' },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('No pude consultar el saldo');
    });
  });

  describe('listAccountsTool', () => {
    it('should have correct declaration', () => {
      expect(listAccountsTool.declaration.name).toBe('list_accounts');
      expect(listAccountsTool.declaration.type).toBe('function');
    });

    it('should list accounts successfully', async () => {
      const mockAccounts = [
        { id: '1', name: 'Cuenta Corriente', balance: 50000 },
        { id: '2', name: 'Tarjeta de Crédito', balance: -10000 },
      ];

      mockContainer.getAccountRepository = jest.fn().mockReturnValue({
        getAll: jest.fn().mockResolvedValue(mockAccounts),
      });

      const result = await listAccountsTool.execute({}, mockContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAccounts);
      expect(result.message).toContain('Cuenta Corriente');
      expect(result.message).toContain('50.000');
    });

    it('should handle empty accounts list', async () => {
      mockContainer.getAccountRepository = jest.fn().mockReturnValue({
        getAll: jest.fn().mockResolvedValue([]),
      });

      const result = await listAccountsTool.execute({}, mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('No tienes cuentas');
    });
  });
});
