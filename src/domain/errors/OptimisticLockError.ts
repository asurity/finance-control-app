/**
 * OptimisticLockError
 * 
 * Error thrown when an optimistic locking conflict is detected.
 * This occurs when two users attempt to update the same resource simultaneously.
 */
export class OptimisticLockError extends Error {
  public readonly currentVersion: number;
  public readonly attemptedVersion: number;
  public readonly resourceId: string;
  public readonly resourceType: string;

  constructor(
    resourceType: string,
    resourceId: string,
    currentVersion: number,
    attemptedVersion: number,
    message?: string
  ) {
    super(
      message ||
        `Optimistic lock conflict: ${resourceType} (${resourceId}) has been modified by another user. ` +
        `Expected version ${attemptedVersion}, but current version is ${currentVersion}.`
    );
    
    this.name = 'OptimisticLockError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
    this.currentVersion = currentVersion;
    this.attemptedVersion = attemptedVersion;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OptimisticLockError);
    }

    Object.setPrototypeOf(this, OptimisticLockError.prototype);
  }

  /**
   * Creates a user-friendly error message
   */
  getUserMessage(): string {
    return `Este ${this.getResourceTypeInSpanish()} ha sido modificado por otro usuario. Por favor, recarga la página y vuelve a intentarlo.`;
  }

  /**
   * Translates resource type to Spanish for user messages
   */
  private getResourceTypeInSpanish(): string {
    const translations: Record<string, string> = {
      BudgetPeriod: 'período de presupuesto',
      CategoryBudget: 'presupuesto de categoría',
      Transaction: 'transacción',
      Category: 'categoría',
      Account: 'cuenta',
    };

    return translations[this.resourceType] || 'recurso';
  }

  /**
   * Checks if an error is an OptimisticLockError
   */
  static isOptimisticLockError(error: unknown): error is OptimisticLockError {
    return error instanceof OptimisticLockError;
  }
}
