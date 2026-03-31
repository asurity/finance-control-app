import { render, screen } from '@testing-library/react';
import { TransactionForm } from '../TransactionForm';

jest.mock('@/application/hooks/useTransactions', () => ({
  useTransactions: () => ({
    createTransaction: {
      mutateAsync: jest.fn(),
      isPending: false,
    },
  }),
}));

jest.mock('@/application/hooks/useAccounts', () => ({
  useAccounts: () => ({
    useActiveAccounts: () => ({
      data: [
        {
          id: 'account-1',
          name: 'Cuenta Corriente',
          currency: 'CLP',
          balance: 100000,
          type: 'CHECKING',
        },
      ],
      isLoading: false,
    }),
  }),
}));

jest.mock('@/application/hooks/useCategories', () => ({
  useCategories: () => ({
    useAllCategories: () => ({
      data: [
        { id: 'category-1', name: 'Alimentación', type: 'EXPENSE' },
        { id: 'category-2', name: 'Salario', type: 'INCOME' },
      ],
      isLoading: false,
    }),
  }),
}));

describe('TransactionForm', () => {
  it('renders the main fields', () => {
    render(<TransactionForm orgId="org-1" userId="user-1" />);

    expect(screen.getByText('Tipo de Transacción')).toBeTruthy();
    expect(screen.getByText('Monto')).toBeTruthy();
    expect(screen.getByText('Descripción')).toBeTruthy();
    expect(screen.getByText('Fecha')).toBeTruthy();
    expect(screen.getByText('Cuenta')).toBeTruthy();
    expect(screen.getByText('Categoría')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Registrar Transacción' })).toBeTruthy();
  });
});
