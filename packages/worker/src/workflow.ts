import { proxyActivities, WorkflowInfo, workflowInfo, ActivityOptions } from '@temporalio/workflow';
import type {
  WorkflowDefinition,
  InferInput,
  InferOutput,
  InferWorkflowActivities,
  ActivityDefinition,
} from '@temporal-contract/core';

/**
 * Workflow context with typed activities and workflow info
 */
export interface WorkflowContext<T extends WorkflowDefinition> {
  activities: InferWorkflowActivities<T>;
  info: WorkflowInfo;
}

/**
 * Create a validated activities proxy that parses inputs and outputs
 * 
 * This wrapper ensures data integrity across the network boundary between
 * workflow and activity execution:
 * 1. Validates activity inputs before serialization (workflow → activity)
 * 2. Validates activity outputs after deserialization (activity → workflow)
 * 
 * This is critical because Temporal serializes data when communicating
 * between workflows and activities, which may run on different processes
 * or machines.
 */
function createValidatedActivities<T extends WorkflowDefinition>(
  rawActivities: Record<string, (...args: any[]) => Promise<any>>,
  activitiesDefinition: Record<string, ActivityDefinition>
): InferWorkflowActivities<T> {
  const validatedActivities: Record<string, (...args: any[]) => Promise<any>> = {};

  for (const [activityName, activityDef] of Object.entries(activitiesDefinition)) {
    const rawActivity = rawActivities[activityName];
    
    validatedActivities[activityName] = async (...args: any[]) => {
      // Validate input with Zod schema (tuple) before sending over network
      const validatedInput = activityDef.input.parse(args);
      
      // Call the actual activity with validated input
      const result = await rawActivity(...validatedInput);
      
      // Validate output with Zod schema after receiving from network
      return activityDef.output.parse(result);
    };
  }

  return validatedActivities as InferWorkflowActivities<T>;
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
 * 1. Validate workflow input against the schema
 * 2. Create a validated proxy for typed activities (with input/output validation)
 * 3. Execute the implementation with context
 * 4. Validate workflow output against the schema
 * 
 * Activity calls are automatically wrapped with validation to ensure data
 * integrity across network boundaries. This protects against serialization
 * issues and ensures type safety at runtime.
 * 
 * @example
 * ```ts
 * const processOrder = createWorkflow({
 *   definition: myContract.workflows.processOrder,
 *   implementation: async (context, orderId, customerId) => {
 *     // arguments are fully typed
 *     // context.activities are fully typed and validated
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
    let activities: any = {};
    
    if (definition.activities) {
      // Create raw proxy from Temporal
      const rawActivities = proxyActivities<Record<string, (...args: any[]) => Promise<any>>>({
        startToCloseTimeout: 60_000, // 1 minute default
        ...activityOptions,
      });
      
      // Wrap with validation layer
      activities = createValidatedActivities<T>(rawActivities, definition.activities);
    }

    // Create workflow context
    const context: WorkflowContext<T> = {
      activities: activities as InferWorkflowActivities<T>,
      info: workflowInfo(),
    };

    // Execute workflow implementation
    const result = await implementation(context, ...validatedInput);

    // Validate output with Zod schema
    return definition.output.parse(result) as InferOutput<T>;
  };
}
