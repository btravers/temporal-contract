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
import { ZodError } from "zod";
import type {
  ActivityDefinition,
  ContractDefinition,
  QueryDefinition,
  SignalDefinition,
  UpdateDefinition,
  WorkerInferInput,
  WorkerInferOutput,
  WorkerInferWorkflowContextActivities,
  WorkflowDefinition,
} from "@temporal-contract/contract";
import {
  ActivityImplementationNotFoundError,
  ActivityDefinitionNotFoundError,
  ActivityInputValidationError,
  ActivityOutputValidationError,
  WorkflowInputValidationError,
  WorkflowOutputValidationError,
  SignalInputValidationError,
  QueryInputValidationError,
  QueryOutputValidationError,
  UpdateInputValidationError,
  UpdateOutputValidationError,
} from "./errors.js";

/**
 * Workflow context with typed activities (workflow + global) and workflow info
 * Note: activities is typed as 'any' to work around TypeScript generic type inference limitations with Zod tuples
 */
export interface WorkflowContext<
  TContract extends ContractDefinition,
  TWorkflowName extends keyof TContract["workflows"],
> {
  activities: WorkerInferWorkflowContextActivities<TContract, TWorkflowName>;
  info: WorkflowInfo;
}

/**
 * Workflow implementation function (receives context + typed args as tuple)
 * Note: We use 'any' for args to work around TypeScript limitations with generic Zod tuple inference
 * The actual type will be enforced at runtime by Zod validation
 */
export type WorkflowImplementation<
  TContract extends ContractDefinition,
  TWorkflowName extends keyof TContract["workflows"],
> = (
  context: WorkflowContext<TContract, TWorkflowName>,
  args: WorkerInferInput<TContract["workflows"][TWorkflowName]>,
) => Promise<WorkerInferOutput<TContract["workflows"][TWorkflowName]>>;

/**
 * Raw activity implementation function (receives typed args as tuple)
 * Note: We use 'any' for args/return to work around TypeScript limitations with generic Zod tuple inference
 * The actual types will be enforced at runtime by Zod validation
 */
export type RawActivityImplementation<TActivity extends ActivityDefinition> = (
  args: WorkerInferInput<TActivity>,
) => Promise<WorkerInferOutput<TActivity>>;

/**
 * Signal handler implementation
 */
export type SignalHandlerImplementation<TSignal extends SignalDefinition> = (
  args: WorkerInferInput<TSignal>,
) => void | Promise<void>;

/**
 * Query handler implementation
 */
export type QueryHandlerImplementation<TQuery extends QueryDefinition> = (
  args: WorkerInferInput<TQuery>,
) => WorkerInferOutput<TQuery>;

/**
 * Update handler implementation
 */
export type UpdateHandlerImplementation<TUpdate extends UpdateDefinition> = (
  args: WorkerInferInput<TUpdate>,
) => Promise<WorkerInferOutput<TUpdate>>;

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
type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

/**
 * Options for creating activities handler
 */
export interface DeclareActivitiesHandlerOptions<T extends ContractDefinition> {
  contract: T;
  activities: ActivityImplementations<T>;
}

/**
 * Activities handler ready for Temporal Worker
 */
export interface ActivitiesHandler<T extends ContractDefinition> {
  contract: T;
  activities: Record<string, (...args: unknown[]) => Promise<unknown>>;
}

/**
 * Options for declaring a workflow implementation
 */
export interface DeclareWorkflowOptions<
  TContract extends ContractDefinition,
  TWorkflowName extends keyof TContract["workflows"],
> {
  definition: TContract["workflows"][TWorkflowName];
  contract: TContract;
  implementation: WorkflowImplementation<TContract, TWorkflowName>;
  /**
   * Default activity options applied to all activities in this workflow.
   * These will be merged with the default startToCloseTimeout of 60 seconds.
   * For more control, you can override specific Temporal ActivityOptions like:
   * - startToCloseTimeout: Maximum time for activity execution
   * - scheduleToCloseTimeout: End-to-end timeout including queuing
   * - scheduleToStartTimeout: Maximum time activity can wait in queue
   * - heartbeatTimeout: Time between heartbeats before considering activity dead
   * - retry: Retry policy for failed activities
   *
   * @example
   * ```ts
   * activityOptions: {
   *   startToCloseTimeout: '5m',
   *   retry: { maximumAttempts: 3 }
   * }
   * ```
   */
  activityOptions?: ActivityOptions;
  /**
   * Signal handlers (if defined in workflow)
   */
  signals?: TContract["workflows"][TWorkflowName]["signals"] extends Record<
    string,
    SignalDefinition
  >
    ? {
        [K in keyof TContract["workflows"][TWorkflowName]["signals"]]: SignalHandlerImplementation<
          TContract["workflows"][TWorkflowName]["signals"][K]
        >;
      }
    : never;
  /**
   * Query handlers (if defined in workflow)
   */
  queries?: TContract["workflows"][TWorkflowName]["queries"] extends Record<string, QueryDefinition>
    ? {
        [K in keyof TContract["workflows"][TWorkflowName]["queries"]]: QueryHandlerImplementation<
          TContract["workflows"][TWorkflowName]["queries"][K]
        >;
      }
    : never;
  /**
   * Update handlers (if defined in workflow)
   */
  updates?: TContract["workflows"][TWorkflowName]["updates"] extends Record<
    string,
    UpdateDefinition
  >
    ? {
        [K in keyof TContract["workflows"][TWorkflowName]["updates"]]: UpdateHandlerImplementation<
          TContract["workflows"][TWorkflowName]["updates"][K]
        >;
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
  TContract extends ContractDefinition,
  TWorkflowName extends keyof TContract["workflows"],
>(
  rawActivities: Record<string, (...args: unknown[]) => Promise<unknown>>,
  workflowActivitiesDefinition: Record<string, ActivityDefinition> | undefined,
  contractActivitiesDefinition: Record<string, ActivityDefinition> | undefined,
): WorkerInferWorkflowContextActivities<TContract, TWorkflowName> {
  const validatedActivities = {} as WorkerInferWorkflowContextActivities<TContract, TWorkflowName>;

  // Merge workflow activities and global contract activities
  const allActivitiesDefinition = {
    ...contractActivitiesDefinition,
    ...workflowActivitiesDefinition, // Workflow activities override global ones
  };

  for (const [activityName, activityDef] of Object.entries(allActivitiesDefinition)) {
    const rawActivity = rawActivities[activityName];

    if (!rawActivity) {
      throw new ActivityImplementationNotFoundError(activityName, Object.keys(rawActivities));
    }

    // @ts-expect-error fixme later
    validatedActivities[activityName] = async (...args: unknown[]) => {
      // Validate input before sending over network
      let validatedInput: unknown;
      try {
        validatedInput = activityDef.input.parse(args);
      } catch (error) {
        if (error instanceof ZodError) {
          throw new ActivityInputValidationError(activityName, error);
        }
        throw error;
      }

      // Call the actual activity (pass the single parameter directly)
      const result = await rawActivity(validatedInput);

      // Validate output after receiving from network
      try {
        return activityDef.output.parse(result);
      } catch (error) {
        if (error instanceof ZodError) {
          throw new ActivityOutputValidationError(activityName, error);
        }
        throw error;
      }
    };
  }

  return validatedActivities;
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
 * import { declareActivitiesHandler } from '@temporal-contract/worker';
 * import myContract from './contract';
 *
 * export const activitiesHandler = declareActivitiesHandler({
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
export function declareActivitiesHandler<T extends ContractDefinition>(
  options: DeclareActivitiesHandlerOptions<T>,
): ActivitiesHandler<T> {
  const { contract, activities } = options;

  // Wrap activities with validation
  const wrappedActivities: Record<string, (...args: unknown[]) => Promise<unknown>> = {};

  // Collect all available activity definitions
  const allDefinitions: string[] = [];
  if (contract.activities) {
    allDefinitions.push(...Object.keys(contract.activities));
  }
  for (const workflow of Object.values(contract.workflows) as WorkflowDefinition[]) {
    if (workflow.activities) {
      allDefinitions.push(...Object.keys(workflow.activities));
    }
  }

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
      throw new ActivityDefinitionNotFoundError(activityName, allDefinitions);
    }

    wrappedActivities[activityName] = async (input: unknown) => {
      // Validate input
      let validatedInput: unknown;
      try {
        validatedInput = activityDef.input.parse(input);
      } catch (error) {
        if (error instanceof ZodError) {
          throw new ActivityInputValidationError(activityName, error);
        }
        throw error;
      }

      // Execute activity
      const result = await activityImpl(validatedInput);

      // Validate output
      try {
        return activityDef.output.parse(result);
      } catch (error) {
        if (error instanceof ZodError) {
          throw new ActivityOutputValidationError(activityName, error);
        }
        throw error;
      }
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
 * import { declareWorkflow } from '@temporal-contract/worker';
 * import myContract from '../contract';
 *
 * export const processOrder = declareWorkflow({
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
export function declareWorkflow<
  TContract extends ContractDefinition,
  TWorkflowName extends keyof TContract["workflows"],
>(
  options: DeclareWorkflowOptions<TContract, TWorkflowName>,
): (
  args: WorkerInferInput<TContract["workflows"][TWorkflowName]>,
) => Promise<WorkerInferOutput<TContract["workflows"][TWorkflowName]>> {
  const { definition, contract, implementation, activityOptions, signals, queries, updates } =
    options;

  return async (args) => {
    // Temporal passes args as array, extract first element which is our single parameter
    const singleArg = Array.isArray(args) ? args[0] : args;

    // Validate workflow input
    let validatedInput: WorkerInferInput<TContract["workflows"][TWorkflowName]>;
    try {
      validatedInput = definition.input.parse(singleArg) as WorkerInferInput<
        TContract["workflows"][TWorkflowName]
      >;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new WorkflowInputValidationError(String(options.definition), error);
      }
      throw error;
    }

    // Register signal handlers
    if (definition.signals && signals) {
      const signalDefs = definition.signals as Record<string, SignalDefinition>;
      const signalHandlers = signals as Record<string, unknown>;

      for (const [signalName, signalDef] of Object.entries(signalDefs)) {
        const handler = signalHandlers[signalName];
        if (handler) {
          const signal = defineSignal(signalName);
          setHandler(signal, async (...args: unknown[]) => {
            // Extract single parameter (Temporal passes as args array)
            const input = args.length === 1 ? args[0] : args;
            let validatedInput: unknown;
            try {
              validatedInput = signalDef.input.parse(input);
            } catch (error) {
              if (error instanceof ZodError) {
                throw new SignalInputValidationError(signalName, error);
              }
              throw error;
            }
            await (handler as SignalHandlerImplementation<SignalDefinition>)(validatedInput);
          });
        }
      }
    }

    // Register query handlers
    if (definition.queries && queries) {
      const queryDefs = definition.queries as Record<string, QueryDefinition>;
      const queryHandlers = queries as Record<string, unknown>;

      for (const [queryName, queryDef] of Object.entries(queryDefs)) {
        const handler = queryHandlers[queryName];
        if (handler) {
          const query = defineQuery(queryName);
          setHandler(query, (...args: unknown[]) => {
            // Extract single parameter (Temporal passes as args array)
            const input = args.length === 1 ? args[0] : args;
            let validatedInput: unknown;
            try {
              validatedInput = queryDef.input.parse(input);
            } catch (error) {
              if (error instanceof ZodError) {
                throw new QueryInputValidationError(queryName, error);
              }
              throw error;
            }
            const result = (handler as QueryHandlerImplementation<QueryDefinition>)(validatedInput);
            try {
              return queryDef.output.parse(result);
            } catch (error) {
              if (error instanceof ZodError) {
                throw new QueryOutputValidationError(queryName, error);
              }
              throw error;
            }
          });
        }
      }
    }

    // Register update handlers
    if (definition.updates && updates) {
      const updateDefs = definition.updates as Record<string, UpdateDefinition>;
      const updateHandlers = updates as Record<string, unknown>;

      for (const [updateName, updateDef] of Object.entries(updateDefs)) {
        const handler = updateHandlers[updateName];
        if (handler) {
          const update = defineUpdate(updateName);
          setHandler(update, async (...args: unknown[]) => {
            // Extract single parameter (Temporal passes as args array)
            const input = args.length === 1 ? args[0] : args;
            let validatedInput: unknown;
            try {
              validatedInput = updateDef.input.parse(input);
            } catch (error) {
              if (error instanceof ZodError) {
                throw new UpdateInputValidationError(updateName, error);
              }
              throw error;
            }
            const result = await (handler as UpdateHandlerImplementation<UpdateDefinition>)(
              validatedInput,
            );
            try {
              return updateDef.output.parse(result);
            } catch (error) {
              if (error instanceof ZodError) {
                throw new UpdateOutputValidationError(updateName, error);
              }
              throw error;
            }
          });
        }
      }
    }

    // Create activities proxy if activities are defined
    let contextActivities: unknown = {};

    if (definition.activities || contract.activities) {
      const rawActivities = proxyActivities<
        Record<string, (...args: unknown[]) => Promise<unknown>>
      >({
        // Default to 1 minute if no timeout specified
        startToCloseTimeout: activityOptions?.startToCloseTimeout ?? 60_000,
        ...activityOptions,
      });

      contextActivities = createValidatedActivities(
        rawActivities,
        definition.activities,
        contract.activities,
      );
    }

    // Create workflow context
    const context: WorkflowContext<TContract, TWorkflowName> = {
      activities: contextActivities as WorkerInferWorkflowContextActivities<
        TContract,
        TWorkflowName
      >,
      info: workflowInfo(),
    };

    // Execute workflow (pass validated input as tuple)
    const result = await implementation(context, validatedInput);

    // Validate workflow output
    try {
      return definition.output.parse(result) as WorkerInferOutput<
        TContract["workflows"][TWorkflowName]
      >;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new WorkflowOutputValidationError(String(options.definition), error);
      }
      throw error;
    }
  };
}
