import type {
  ActivityDefinition,
  InferInput,
  InferOutput,
} from '@temporal-contract/core';

/**
 * Options for creating an activity implementation
 */
export interface CreateActivityOptions<T extends ActivityDefinition> {
  definition: T;
  implementation: (...args: InferInput<T>) => Promise<InferOutput<T>>;
}

/**
 * Create a typed activity implementation with Zod validation
 * 
 * The activity will:
 * 1. Validate input against the schema
 * 2. Execute the implementation
 * 3. Validate output against the schema
 * 
 * @example
 * ```ts
 * const processPayment = createActivity({
 *   definition: myContract.workflows.processOrder.activities!.processPayment,
 *   implementation: async (amount) => {
 *     // arguments are fully typed
 *     const transactionId = await paymentGateway.charge(amount);
 *     return { transactionId, success: true };
 *   },
 * });
 * ```
 */
export function createActivity<T extends ActivityDefinition>(
  options: CreateActivityOptions<T>
): (...args: InferInput<T>) => Promise<InferOutput<T>> {
  const { definition, implementation } = options;

  return async (...args: any[]) => {
    // Validate input with Zod schema (tuple)
    const validatedInput = definition.input.parse(args) as any;

    // Execute activity implementation
    const result = await implementation(...validatedInput);

    // Validate output with Zod schema
    return definition.output.parse(result) as InferOutput<T>;
  };
}
