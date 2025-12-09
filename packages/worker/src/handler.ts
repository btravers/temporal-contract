import {
  ActivityOptions,
  WorkflowInfo,
  defineQuery,
  defineSignal,
  defineUpdate,
  proxyActivities,
  setHandler,
  workflowInfo,
} from "@temporalio/workflow";
import type {
  ActivityDefinition,
  ContractDefinition,
  InferInput,
  InferOutput,
  InferWorkflowContextActivities,
  QueryDefinition,
  SignalDefinition,
  UpdateDefinition,
  WorkflowDefinition,
} from "@temporal-contract/core";

/**
 * Workflow context with typed activities (workflow + global) and workflow info
 * Note: activities is typed as 'any' to work around TypeScript generic type inference limitations with Zod tuples
 */
export interface WorkflowContext<
  TWorkflow extends WorkflowDefinition,
  TContract extends ContractDefinition,
> {
  activities: InferWorkflowContextActivities<TWorkflow, TContract>;
  info: WorkflowInfo;
}

/**
 * Workflow implementation function (receives context + typed args as tuple)
 * Note: We use 'any' for args to work around TypeScript limitations with generic Zod tuple inference
 * The actual type will be enforced at runtime by Zod validation
 */
export type WorkflowImplementation<
  TWorkflow extends WorkflowDefinition,
  TContract extends ContractDefinition,
> = (
  context: WorkflowContext<TWorkflow, TContract>,
  args: InferInput<TWorkflow>,
) => Promise<InferOutput<TWorkflow>>;

/**
 * Raw activity implementation function (receives typed args as tuple)
 * Note: We use 'any' for args/return to work around TypeScript limitations with generic Zod tuple inference
 * The actual types will be enforced at runtime by Zod validation
 */
export type RawActivityImplementation<TActivity extends ActivityDefinition> = (
  args: InferInput<TActivity>,
) => Promise<InferOutput<TActivity>>;

/**
 * Signal handler implementation
 */
export type SignalHandlerImplementation<TSignal extends SignalDefinition> = (
  args: InferInput<TSignal>,
) => void | Promise<void>;

/**
 * Query handler implementation
 */
export type QueryHandlerImplementation<TQuery extends QueryDefinition> = (
  args: InferInput<TQuery>,
) => InferOutput<TQuery>;

/**
 * Update handler implementation
 */
export type UpdateHandlerImplementation<TUpdate extends UpdateDefinition> = (
  args: InferInput<TUpdate>,
) => Promise<InferOutput<TUpdate>>;

/**
 * Map of all activity implementations for a contract (global + all workflow-specific)
 */
export type ActivityImplementations<T extends ContractDefinition> =
  // Global activities
  (T["activities"] extends Record<string, ActivityDefinition>
    ? {
        [K in keyof T["activities"]]: RawActivityImplementation<T["activities"][K]>;
      }
    : {}) &
    // All workflow-specific activities merged
    UnionToIntersection<
      {
        [K in keyof T["workflows"]]: T["workflows"][K]["activities"] extends Record<
          string,
          ActivityDefinition
        >
          ? {
              [A in keyof T["workflows"][K]["activities"]]: RawActivityImplementation<
                T["workflows"][K]["activities"][A]
              >;
            }
          : {};
      }[keyof T["workflows"]]
    >;

/**
 * Utility type to convert union to intersection
 */
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never;

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
  TContract extends ContractDefinition,
> {
  definition: TWorkflow;
  contract: TContract;
  implementation: WorkflowImplementation<TWorkflow, TContract>;
  /**
   * Default activity options
   */
  activityOptions?: ActivityOptions;
  /**
   * Signal handlers (if defined in workflow)
   */
  signals?: TWorkflow["signals"] extends Record<string, SignalDefinition>
    ? {
        [K in keyof TWorkflow["signals"]]: SignalHandlerImplementation<TWorkflow["signals"][K]>;
      }
    : never;
  /**
   * Query handlers (if defined in workflow)
   */
  queries?: TWorkflow["queries"] extends Record<string, QueryDefinition>
    ? {
        [K in keyof TWorkflow["queries"]]: QueryHandlerImplementation<TWorkflow["queries"][K]>;
      }
    : never;
  /**
   * Update handlers (if defined in workflow)
   */
  updates?: TWorkflow["updates"] extends Record<string, UpdateDefinition>
    ? {
        [K in keyof TWorkflow["updates"]]: UpdateHandlerImplementation<TWorkflow["updates"][K]>;
      }
    : never;
}

/**
 * Create a validated activities proxy that parses inputs and outputs
 *
 * This wrapper ensures data integrity across the network boundary between
 * workflow and activity execution.
 */
function createValidatedActivities<
  TWorkflow extends WorkflowDefinition,
  TContract extends ContractDefinition,
>(
  rawActivities: Record<string, (...args: any[]) => Promise<any>>,
  workflowActivitiesDefinition: Record<string, ActivityDefinition> | undefined,
  contractActivitiesDefinition: Record<string, ActivityDefinition> | undefined,
): InferWorkflowContextActivities<TWorkflow, TContract> {
  const validatedActivities: Record<string, (...args: any[]) => Promise<any>> = {};

  // Merge workflow activities and global contract activities
  const allActivitiesDefinition = {
    ...contractActivitiesDefinition,
    ...workflowActivitiesDefinition, // Workflow activities override global ones
  };

  for (const [activityName, activityDef] of Object.entries(allActivitiesDefinition)) {
    const rawActivity = rawActivities[activityName];

    if (!rawActivity) {
      throw new Error(`Activity implementation not found for: ${activityName}`);
    }

    validatedActivities[activityName] = async (...args: any[]) => {
      // Validate input before sending over network
      const validatedInput = activityDef.input.parse(args);

      // Call the actual activity (pass the single parameter directly)
      const result = await rawActivity(validatedInput);

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
  options: CreateActivitiesHandlerOptions<T>,
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

    wrappedActivities[activityName] = async (input: undefined) => {
      // Validate input
      const validatedInput = activityDef.input.parse(input);

      // Execute activity
      const result = await activityImpl(validatedInput);

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
  TContract extends ContractDefinition,
>(
  options: CreateWorkflowOptions<TWorkflow, TContract>,
): (args: InferInput<TWorkflow>) => Promise<InferOutput<TWorkflow>> {
  const { definition, contract, implementation, activityOptions, signals, queries, updates } =
    options;

  return async (args: any) => {
    // Temporal passes args as array, extract first element which is our single parameter
    const singleArg = Array.isArray(args) ? args[0] : args;

    // Validate workflow input
    const validatedInput = definition.input.parse(singleArg) as any;

    // Register signal handlers
    if (definition.signals && signals) {
      const signalDefs = definition.signals as Record<string, SignalDefinition>;
      const signalHandlers = signals as Record<string, any>;

      for (const [signalName, signalDef] of Object.entries(signalDefs)) {
        const handler = signalHandlers[signalName];
        if (handler) {
          const signal = defineSignal(signalName);
          setHandler(signal, async (...args: any[]) => {
            // Extract single parameter (Temporal passes as args array)
            const input = args.length === 1 ? args[0] : args;
            const validatedInput = signalDef.input.parse(input);
            await handler(validatedInput);
          });
        }
      }
    }

    // Register query handlers
    if (definition.queries && queries) {
      const queryDefs = definition.queries as Record<string, QueryDefinition>;
      const queryHandlers = queries as Record<string, any>;

      for (const [queryName, queryDef] of Object.entries(queryDefs)) {
        const handler = queryHandlers[queryName];
        if (handler) {
          const query = defineQuery(queryName);
          setHandler(query, (...args: any[]) => {
            // Extract single parameter (Temporal passes as args array)
            const input = args.length === 1 ? args[0] : args;
            const validatedInput = queryDef.input.parse(input);
            const result = handler(validatedInput);
            return queryDef.output.parse(result);
          });
        }
      }
    }

    // Register update handlers
    if (definition.updates && updates) {
      const updateDefs = definition.updates as Record<string, UpdateDefinition>;
      const updateHandlers = updates as Record<string, any>;

      for (const [updateName, updateDef] of Object.entries(updateDefs)) {
        const handler = updateHandlers[updateName];
        if (handler) {
          const update = defineUpdate(updateName);
          setHandler(update, async (...args: any[]) => {
            // Extract single parameter (Temporal passes as args array)
            const input = args.length === 1 ? args[0] : args;
            const validatedInput = updateDef.input.parse(input);
            const result = await handler(validatedInput);
            return updateDef.output.parse(result);
          });
        }
      }
    }

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
        contract.activities,
      );
    }

    // Create workflow context
    const context: WorkflowContext<TWorkflow, TContract> = {
      activities: contextActivities,
      info: workflowInfo(),
    };

    // Execute workflow (pass validated input as tuple)
    const result = await implementation(context, validatedInput);

    // Validate workflow output
    return definition.output.parse(result) as InferOutput<TWorkflow>;
  };
}
