import { proxyActivities, WorkflowInfo, workflowInfo, ActivityOptions } from '@temporalio/workflow';
import type {
  WorkflowDefinition,
  InferInput,
  InferOutput,
  InferWorkflowActivities,
} from '@temporal-contract/core';

/**
 * Workflow context with typed activities and workflow info
 */
export interface WorkflowContext<T extends WorkflowDefinition> {
  activities: InferWorkflowActivities<T>;
  info: WorkflowInfo;
}

/**
 * Workflow implementation function signature
 */
export type WorkflowImplementation<T extends WorkflowDefinition> = (
  context: WorkflowContext<T>,
  ...args: InferInput<T>
) => Promise<InferOutput<T>>;

/**
 * Options for creating a workflow implementation
 */
export interface CreateWorkflowOptions<T extends WorkflowDefinition> {
  definition: T;
  implementation: WorkflowImplementation<T>;
  /**
   * Default activity options
   */
  activityOptions?: ActivityOptions;
}

/**
 * Create a typed workflow implementation with Zod validation
 * 
 * The workflow will:
 * 1. Validate input against the schema
 * 2. Create a proxy for typed activities
 * 3. Execute the implementation with context
 * 4. Validate output against the schema
 * 
 * @example
 * ```ts
 * const processOrder = createWorkflow({
 *   definition: myContract.workflows.processOrder,
 *   implementation: async (context, orderId, customerId) => {
 *     // arguments are fully typed
 *     // context.activities are fully typed
 *     const inventory = await context.activities.validateInventory(orderId);
 *     
 *     return {
 *       orderId,
 *       status: 'success',
 *       totalAmount: 100,
 *     };
 *   },
 *   activityOptions: {
 *     startToCloseTimeout: '1 minute',
 *   },
 * });
 * ```
 */
export function createWorkflow<T extends WorkflowDefinition>(
  options: CreateWorkflowOptions<T>
): (...args: InferInput<T>) => Promise<InferOutput<T>> {
  const { definition, implementation, activityOptions } = options;

  return async (...args: any[]) => {
    // Validate input with Zod schema (tuple)
    const validatedInput = definition.input.parse(args) as any;

    // Create activities proxy if activities are defined
    const activities = definition.activities
      ? proxyActivities<unknown>({
          startToCloseTimeout: 60_000, // 1 minute default
          ...activityOptions,
        })
      : {};

    // Create workflow context
    const context: WorkflowContext<T> = {
      activities: activities as unknown as InferWorkflowActivities<T>,
      info: workflowInfo(),
    };

    // Execute workflow implementation
    const result = await implementation(context, ...validatedInput);

    // Validate output with Zod schema
    return definition.output.parse(result) as InferOutput<T>;
  };
}
