/**
 * Base Use Case
 * All use cases should extend this abstract class
 * Provides a standard interface for executing business logic
 */
export abstract class BaseUseCase<TInput, TOutput> {
  /**
   * Execute the use case with the given input
   * @param input The input data for the use case
   * @returns The result of the use case execution
   */
  abstract execute(input: TInput): Promise<TOutput>;
}
