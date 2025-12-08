import { Result, Future } from '@swan-io/boxed';
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
 * Activity error type
 */
export interface ActivityError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Boxed activity implementation using Result pattern
 * Returns Result<Output, ActivityError> instead of throwing exceptions
 */
export type BoxedActivityImplementation<T extends ActivityDefinition> = (
  ...args: InferInput<T>
) => Future<Result<InferOutput<T>, ActivityError>>;

/**
 * Map of all boxed activity implementations for a contract (global + all workflow-specific)
 */
export type BoxedActivityImplementations<T extends ContractDefinition> = 
  // Global activities
  (T['activities'] extends Record<string, ActivityDefinition>
    ? {
        [K in keyof T['activities']]: BoxedActivityImplementation<T['activities'][K]>;
      }
    : {}) &
  // All workflow-specific activities merged
  UnionToIntersection<
    {
      [K in keyof T['workflows']]: T['workflows'][K]['activities'] extends Record<string, ActivityDefinition>
        ? {
            [A in keyof T['workflows'][K]['activities']]: BoxedActivityImplementation<
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
 * Options for creating boxed activities handler
 */
export interface CreateBoxedActivitiesHandlerOptions<T extends ContractDefinition> {
  contract: T;
  activities: BoxedActivityImplementations<T>;
}

/**
 * Boxed activities handler ready for Temporal Worker
 */
export interface BoxedActivitiesHandler<T extends ContractDefinition> {
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
 * Create a typed boxed activities handler with automatic validation and Result pattern
 * 
 * This wraps all activity implementations with:
 * - Zod validation at network boundaries
 * - Result<T, ActivityError> pattern for explicit error handling
 * - Automatic conversion from Result to Promise (throwing on Error)
 * 
 * TypeScript ensures ALL activities (global + workflow-specific) are implemented.
 * 
 * Use this to create the activities object for the Temporal Worker.
 * 
 * @example
 * ```ts
 * import { createBoxedActivitiesHandler } from '@temporal-contract/worker-boxed';
 * import { Result, Future } from '@swan-io/boxed';
 * import myContract from './contract';
 * 
 * export const activitiesHandler = createBoxedActivitiesHandler({
 *   contract: myContract,
 *   activities: {
 *     // Activity returns Result instead of throwing
 *     sendEmail: (to, subject, body) => {
 *       return Future.make(async resolve => {
 *         try {
 *           await emailService.send({ to, subject, body });
 *           resolve(Result.Ok({ sent: true }));
 *         } catch (error) {
 *           resolve(Result.Error({
 *             code: 'EMAIL_SEND_FAILED',
 *             message: error.message,
 *             details: error
 *           }));
 *         }
 *       });
 *     },
 *     
 *     validateInventory: (orderId) => {
 *       return Future.make(async resolve => {
 *         const available = await inventory.check(orderId);
 *         if (available) {
 *           resolve(Result.Ok({ available: true }));
 *         } else {
 *           resolve(Result.Error({
 *             code: 'OUT_OF_STOCK',
 *             message: `Product ${orderId} is out of stock`
 *           }));
 *         }
 *       });
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
export function createBoxedActivitiesHandler<T extends ContractDefinition>(
  options: CreateBoxedActivitiesHandlerOptions<T>
): BoxedActivitiesHandler<T> {
  const { contract, activities } = options;

  // Wrap activities with validation and Result unwrapping
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
      
      // Execute boxed activity (returns Future<Result<T, E>>)
      const futureResult = await (activityImpl as any)(...validatedInput);
      
      // Unwrap Future and Result
      const result = await futureResult.toPromise();
      
      return result.match({
        Ok: (value: any) => {
          // Validate output on success
          return activityDef.output.parse(value);
        },
        Error: (error: ActivityError) => {
          // Convert Result.Error to thrown exception for Temporal
          const err = new Error(error.message);
          (err as any).code = error.code;
          (err as any).details = error.details;
          throw err;
        },
      });
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
 * import { createWorkflow } from '@temporal-contract/worker-boxed';
 * import myContract from '../contract';
 * 
 * export const processOrder = createWorkflow({
 *   definition: myContract.workflows.processOrder,
 *   contract: myContract,
 *   implementation: async (context, orderId, customerId) => {
 *     // context.activities: typed activities (workflow + global)
 *     // context.info: WorkflowInfo
 *     
 *     // Activities still throw on error (Result is unwrapped in handler)
 *     try {
 *       const inventory = await context.activities.validateInventory(orderId);
 *       const payment = await context.activities.chargePayment(customerId, 100);
 *       
 *       await context.activities.sendEmail(
 *         customerId,
 *         'Order processed',
 *         'Your order has been processed'
 *       );
 *       
 *       return {
 *         orderId,
 *         status: payment.success ? 'success' : 'failed',
 *         transactionId: payment.transactionId,
 *       };
 *     } catch (error) {
 *       // Handle activity errors
 *       return {
 *         orderId,
 *         status: 'failed',
 *         error: error.message,
 *       };
 *     }
 *   },
 *   activityOptions: {
 *     startToCloseTimeout: '1 minute',
 *   },
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
