import { OptimisticLockError } from '@/domain/errors/OptimisticLockError';
import { toast } from 'sonner';

/**
 * Error handler for optimistic locking conflicts
 * Shows user-friendly error messages and provides retry guidance
 */
export function handleOptimisticLockError(error: unknown, onRetry?: () => void): boolean {
  if (OptimisticLockError.isOptimisticLockError(error)) {
    // Show user-friendly toast notification
    toast.error('Conflicto de edición detectado', {
      description: error.getUserMessage(),
      action: onRetry
        ? {
            label: 'Recargar',
            onClick: () => {
              window.location.reload();
            },
          }
        : undefined,
      duration: 10000, // Show longer for conflicts
    });

    return true; // Error was handled
  }

  return false; // Error was not an OptimisticLockError
}

/**
 * Wrapper for mutation functions that automatically handles optimistic locking errors
 * @param mutationFn - The async mutation function to wrap
 * @param options - Options for error handling
 * @returns Wrapped mutation function with optimistic lock error handling
 */
export function withOptimisticLockErrorHandler<TInput, TOutput>(
  mutationFn: (input: TInput) => Promise<TOutput>,
  options?: {
    onOptimisticLockError?: (error: OptimisticLockError) => void;
    showToast?: boolean;
  }
): (input: TInput) => Promise<TOutput> {
  return async (input: TInput) => {
    try {
      return await mutationFn(input);
    } catch (error) {
      const showToast = options?.showToast !== false; // Default to true

      if (OptimisticLockError.isOptimisticLockError(error)) {
        // Call custom handler if provided
        if (options?.onOptimisticLockError) {
          options.onOptimisticLockError(error);
        }

        // Show toast notification if enabled
        if (showToast) {
          handleOptimisticLockError(error, () => window.location.reload());
        }
      }

      // Re-throw the error for React Query to handle
      throw error;
    }
  };
}

/**
 * Creates an error message for React Query mutations
 * Handles both OptimisticLockError and generic errors
 */
export function getMutationErrorMessage(error: unknown): string {
  if (OptimisticLockError.isOptimisticLockError(error)) {
    return error.getUserMessage();
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Ocurrió un error inesperado';
}
