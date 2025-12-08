import { proxyActivities, WorkflowInfo, workflowInfo, ActivityOptions } from '@temporalio/workflow';
import type {
  ContractDefinition,
  InferInput,
  InferOutput,
  WorkflowDefinition,
  ActivityDefinition,
  InferWorkflowContextActivities,
} from '@temporal-contract/core';

/**
 * Workflow context with typed activities (workflow + global) and workflow info
 */
export interface WorkflowContext<
  TWorkflow extends WorkflowDefinition,
  TContract extends ContractDefinition
> {
  activities: InferWorkflowContextActivities<TWorkflow, TContract>;
  info: WorkflowInfo;
}

/**
 * Workflow implementation function (receives context + typed args)
 */
export type WorkflowImplementation<
  TWorkflow extends WorkflowDefinition,
  TContract extends ContractDefinition
> = (
  context: WorkflowContext<TWorkflow, TContract>,
  ...args: InferInput<TWorkflow>
) => Promise<InferOutput<TWorkflow>>;

/**
 * Raw activity implementation function (receives typed args)
 */
export type RawActivityImplementation<T extends ActivityDefinition> = (
  ...args: InferInput<T>
) => Promise<InferOutput<T>>;

/**
 * Map of all activity implementations for a contract (global + all workflow-specific)
 */
export type ActivityImplementations<T extends ContractDefinition> = 
  // Global activities
  (T['activities'] extends Record<string, ActivityDefinition>
    ? {
        [K in keyof T['activities']]: RawActivityImplementation<T['activities'][K]>;
      }
    : {}) &
  // All workflow-specific activities merged
  UnionToIntersection<
    {
      [K in keyof T['workflows']]: T['workflows'][K]['activities'] extends Record<string, ActivityDefinition>
        ? {
            [A in keyof T['workflows'][K]['activities']]: RawActivityImplementation<
              T['workflows'][K]['activities'][A]
            >;
          }
        : {};
    }[keyof T['workflows']]
  >;

/**
 * Utility type to convert union to intersection
 */
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

/**
 * Options for creating activities handler
 */
export interface CreateActivitiesHandlerOptions<T extends ContractDefinition> {
  contract: T;
  activities: ActivityImplementations<T>;
}

/**
 * Activities handler ready for Temporal Worker
 */
export interface ActivitiesHandler<T extends ContractDefinition> {
  contract: T;
  activities: Record<string, (...args: any[]) => Promise<any>>;
}

/**
 * Options for creating a workflow implementation
 */
export interface CreateWorkflowOptions<
  TWorkflow extends WorkflowDefinition,
  TContract extends ContractDefinition
> {
  definition: TWorkflow;
  contract: TContract;
  implementation: WorkflowImplementation<TWorkflow, TContract>;
  /**
   * Default activity options
   */
  activityOptions?: ActivityOptions;
}

/**
 * Create a validated activities proxy that parses inputs and outputs
 * 
 * This wrapper ensures data integrity across the network boundary between
 * workflow and activity execution.
 */
function createValidatedActivities<
  TWorkflow extends WorkflowDefinition,
  TContract extends ContractDefinition
>(
  rawActivities: Record<string, (...args: any[]) => Promise<any>>,
  workflowActivitiesDefinition: Record<string, ActivityDefinition> | undefined,
  contractActivitiesDefinition: Record<string, ActivityDefinition> | undefined
): InferWorkflowContextActivities<TWorkflow, TContract> {
  const validatedActivities: Record<string, (...args: any[]) => Promise<any>> = {};

  // Merge workflow activities and global contract activities
  const allActivitiesDefinition = {
    ...contractActivitiesDefinition,
    ...workflowActivitiesDefinition, // Workflow activities override global ones
  };

  for (const [activityName, activityDef] of Object.entries(allActivitiesDefinition)) {
    const rawActivity = rawActivities[activityName];
    
    validatedActivities[activityName] = async (...args: any[]) => {
      // Validate input before sending over network
      const validatedInput = activityDef.input.parse(args);
      
      // Call the actual activity
      const result = await rawActivity(...validatedInput);
      
      // Validate output after receiving from network
      return activityDef.output.parse(result);
    };
  }

  return validatedActivities as InferWorkflowContextActivities<TWorkflow, TContract>;
}

/**
 * Create a typed activities handler with automatic validation
 * 
 * This wraps all activity implementations with Zod validation at network boundaries.
 * TypeScript ensures ALL activities (global + workflow-specific) are implemented.
 * 
 * Use this to create the activities object for the Temporal Worker.
 * 
 * @example
 * ```ts
 * import { createActivitiesHandler } from '@temporal-contract/worker';
 * import myContract from './contract';
 * 
 * export const activitiesHandler = createActivitiesHandler({
 *   contract: myContract,
 *   activities: {
 *     // Global activities
 *     sendEmail: async (to, subject, body) => {
 *       await emailService.send({ to, subject, body });
 *       return { sent: true };
 *     },
 *     // Workflow-specific activities
 *     validateInventory: async (orderId) => {
 *       const available = await inventory.check(orderId);
 *       return { available };
 *     },
 *   },
 * });
 * 
 * // Use with Temporal Worker
 * import { Worker } from '@temporalio/worker';
 * 
 * const worker = await Worker.create({
 *   workflowsPath: require.resolve('./workflows'),
 *   activities: activitiesHandler.activities,
 *   taskQueue: activitiesHandler.contract.taskQueue,
 * });
 * ```
 */
export function createActivitiesHandler<T extends ContractDefinition>(
  options: CreateActivitiesHandlerOptions<T>
): ActivitiesHandler<T> {
  const { contract, activities } = options;

  // Wrap activities with validation
  const wrappedActivities: Record<string, (...args: any[]) => Promise<any>> = {};
  
  for (const [activityName, activityImpl] of Object.entries(activities)) {
    // Find activity definition (global or workflow-specific)
    let activityDef: ActivityDefinition | undefined;
    
    // Check global activities
    if (contract.activities?.[activityName]) {
      activityDef = contract.activities[activityName];
    } else {
      // Check workflow-specific activities
      for (const workflow of Object.values(contract.workflows) as WorkflowDefinition[]) {
        if (workflow.activities?.[activityName]) {
          activityDef = workflow.activities[activityName];
          break;
        }
      }
    }
    
    if (!activityDef) {
      throw new Error(`Activity definition not found for: ${activityName}`);
    }
    
    wrappedActivities[activityName] = async (...args: any[]) => {
      // Validate input
      const validatedInput = activityDef.input.parse(args) as any;
      
      // Execute activity
      const result = await (activityImpl as any)(...validatedInput);
      
      // Validate output
      return activityDef.output.parse(result);
    };
  }

  return {
    contract,
    activities: wrappedActivities,
  };
}

/**
 * Create a typed workflow implementation with automatic validation
 * 
 * This wraps a workflow implementation with:
 * - Input/output validation
 * - Typed workflow context with activities
 * - Workflow info access
 * 
 * Workflows must be defined in separate files and imported by the Temporal Worker
 * via workflowsPath.
 * 
 * @example
 * ```ts
 * // workflows/processOrder.ts
 * import { createWorkflow } from '@temporal-contract/worker';
 * import myContract from '../contract';
 * 
 * export const processOrder = createWorkflow({
 *   definition: myContract.workflows.processOrder,
 *   contract: myContract,
 *   implementation: async (context, orderId, customerId) => {
 *     // context.activities: typed activities (workflow + global)
 *     // context.info: WorkflowInfo
 *     
 *     const inventory = await context.activities.validateInventory(orderId);
 *     
 *     if (!inventory.available) {
 *       throw new Error('Out of stock');
 *     }
 *     
 *     const payment = await context.activities.chargePayment(customerId, 100);
 *     
 *     // Global activity
 *     await context.activities.sendEmail(
 *       customerId,
 *       'Order processed',
 *       'Your order has been processed'
 *     );
 *     
 *     return {
 *       orderId,
 *       status: payment.success ? 'success' : 'failed',
 *       transactionId: payment.transactionId,
 *     };
 *   },
 *   activityOptions: {
 *     startToCloseTimeout: '1 minute',
 *   },
 * });
 * ```
 * 
 * Then in your worker setup:
 * ```ts
 * // worker.ts
 * import { Worker } from '@temporalio/worker';
 * import { activitiesHandler } from './activities';
 * 
 * const worker = await Worker.create({
 *   workflowsPath: require.resolve('./workflows'), // Imports processOrder
 *   activities: activitiesHandler.activities,
 *   taskQueue: activitiesHandler.contract.taskQueue,
 * });
 * ```
 */
export function createWorkflow<
  TWorkflow extends WorkflowDefinition,
  TContract extends ContractDefinition
>(
  options: CreateWorkflowOptions<TWorkflow, TContract>
): (...args: InferInput<TWorkflow>) => Promise<InferOutput<TWorkflow>> {
  const { definition, contract, implementation, activityOptions } = options;

  return async (...args: any[]) => {
    // Validate workflow input
    const validatedInput = definition.input.parse(args) as any;

    // Create activities proxy if activities are defined
    let contextActivities: any = {};
    
    if (definition.activities || contract.activities) {
      const rawActivities = proxyActivities<Record<string, (...args: any[]) => Promise<any>>>({
        startToCloseTimeout: 60_000, // 1 minute default
        ...activityOptions,
      });
      
      contextActivities = createValidatedActivities(
        rawActivities,
        definition.activities,
        contract.activities
      );
    }

    // Create workflow context
    const context: WorkflowContext<TWorkflow, TContract> = {
      activities: contextActivities,
      info: workflowInfo(),
    };

    // Execute workflow
    const result = await implementation(context, ...validatedInput);

    // Validate workflow output
    return definition.output.parse(result) as InferOutput<TWorkflow>;
  };
}

