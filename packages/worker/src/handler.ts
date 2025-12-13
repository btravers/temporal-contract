import { Future, Result } from "@swan-io/boxed";
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
  QueryDefinition,
  SignalDefinition,
  UpdateDefinition,
  WorkerInferInput,
  WorkerInferOutput,
  WorkerInferWorkflowContextActivities,
  WorkflowDefinition,
} from "@temporal-contract/contract";
import {
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
  ActivityError,
} from "./errors.js";

// Re-export ActivityError for convenience
export { ActivityError };

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
 * Activity implementation using Result pattern
 * Returns Future<Result<Output, ActivityError>> instead of throwing exceptions
 */
export type BoxedActivityImplementation<TActivity extends ActivityDefinition> = (
  args: WorkerInferInput<TActivity>,
) => Future<Result<WorkerInferOutput<TActivity>, ActivityError>>;

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
        [K in keyof T["activities"]]: BoxedActivityImplementation<T["activities"][K]>;
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
              [A in keyof T["workflows"][K]["activities"]]: BoxedActivityImplementation<
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
  workflowName: TWorkflowName;
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
      throw new Error(
        `Activity implementation not found for: "${activityName}". ` +
          `Available activities: ${Object.keys(rawActivities).length > 0 ? Object.keys(rawActivities).join(", ") : "none"}`,
      );
    }

    // Create the wrapped activity with validation
    // Type assertion to unknown is safe as we're building the object step by step
    const wrappedActivity = async (input: unknown) => {
      // Validate input before sending over network
      const inputResult = await activityDef.input["~standard"].validate(input);
      if (inputResult.issues) {
        throw new ActivityInputValidationError(activityName, inputResult.issues);
      }

      // Call the actual activity (pass the single parameter directly)
      const result = await rawActivity(inputResult.value);

      // Validate output after receiving from network
      const outputResult = await activityDef.output["~standard"].validate(result);
      if (outputResult.issues) {
        throw new ActivityOutputValidationError(activityName, outputResult.issues);
      }

      return outputResult.value;
    };

    // Assign to validatedActivities with proper type handling
    (validatedActivities as Record<string, unknown>)[activityName] = wrappedActivity;
  }

  return validatedActivities;
}

/**
 * Create a typed activities handler with automatic validation and Result pattern
 *
 * This wraps all activity implementations with:
 * - Validation at network boundaries
 * - Result<T, ActivityError> pattern for explicit error handling
 * - Automatic conversion from Result to Promise (throwing on Error)
 *
 * TypeScript ensures ALL activities (global + workflow-specific) are implemented.
 *
 * Use this to create the activities object for the Temporal Worker.
 *
 * @example
 * ```ts
 * import { declareActivitiesHandler, ActivityError } from '@temporal-contract/worker/activity';
 * import { Result, Future } from '@swan-io/boxed';
 * import myContract from './contract';
 *
 * export const activitiesHandler = declareActivitiesHandler({
 *   contract: myContract,
 *   activities: {
 *     // Activity returns Result instead of throwing
 *     // All technical exceptions must be wrapped in ActivityError for retry policies
 *     sendEmail: (args) => {
 *       return Future.make(async resolve => {
 *         try {
 *           await emailService.send(args);
 *           resolve(Result.Ok({ sent: true }));
 *         } catch (error) {
 *           // Wrap technical errors in ActivityError to enable retries
 *           resolve(Result.Error(
 *             new ActivityError(
 *               'EMAIL_SEND_FAILED',
 *               'Failed to send email',
 *               error // Original error as cause for debugging
 *             )
 *           ));
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
export function declareActivitiesHandler<T extends ContractDefinition>(
  options: DeclareActivitiesHandlerOptions<T>,
): ActivitiesHandler<T> {
  const { contract, activities } = options;

  // Wrap activities with validation and Result unwrapping
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

    wrappedActivities[activityName] = async (...args: unknown[]) => {
      // Extract single parameter (Temporal passes as args array)
      const input = args.length === 1 ? args[0] : args;

      // Validate input
      const inputResult = await activityDef.input["~standard"].validate(input);
      if (inputResult.issues) {
        throw new ActivityInputValidationError(activityName, inputResult.issues);
      }

      // Execute boxed activity (pass single parameter, returns Future<Result<T, E>>)
      const futureResult = (
        activityImpl as (args: unknown) => Future<Result<unknown, ActivityError>>
      )(inputResult.value);

      // Unwrap Future and Result
      const result = await futureResult.toPromise();

      // Handle the result - validation must be done before match to avoid async callbacks
      if (result.isOk()) {
        // Validate output on success
        const outputResult = await activityDef.output["~standard"].validate(result.value);
        if (outputResult.issues) {
          throw new ActivityOutputValidationError(activityName, outputResult.issues);
        }
        return outputResult.value;
      } else {
        // Convert Result.Error to thrown ActivityError for Temporal
        throw result.error;
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
 *   workflowName: 'processOrder',
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
  const { workflowName, contract, implementation, activityOptions, signals, queries, updates } =
    options;

  // Get the workflow definition from the contract
  const definition = contract.workflows[
    workflowName as string
  ] as TContract["workflows"][TWorkflowName];

  return async (args) => {
    // Temporal passes args as array, extract first element which is our single parameter
    const singleArg = Array.isArray(args) ? args[0] : args;

    // Validate workflow input
    const inputResult = await definition.input["~standard"].validate(singleArg);
    if (inputResult.issues) {
      throw new WorkflowInputValidationError(String(workflowName), inputResult.issues);
    }
    const validatedInput = inputResult.value as WorkerInferInput<
      TContract["workflows"][TWorkflowName]
    >;

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
            const inputResult = await signalDef.input["~standard"].validate(input);
            if (inputResult.issues) {
              throw new SignalInputValidationError(signalName, inputResult.issues);
            }
            await (handler as SignalHandlerImplementation<SignalDefinition>)(inputResult.value);
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
            // Note: Query handlers must be synchronous, so we need to handle validation synchronously
            // Standard Schema validate can return sync or async results
            const inputResult = queryDef.input["~standard"].validate(input);

            // Handle both sync and async validation results
            if (inputResult instanceof Promise) {
              throw new Error(
                `Query "${queryName}" validation must be synchronous. Use a schema library that supports synchronous validation for queries.`,
              );
            }

            if (inputResult.issues) {
              throw new QueryInputValidationError(queryName, inputResult.issues);
            }

            const result = (handler as QueryHandlerImplementation<QueryDefinition>)(
              inputResult.value,
            );

            const outputResult = queryDef.output["~standard"].validate(result);
            if (outputResult instanceof Promise) {
              throw new Error(
                `Query "${queryName}" output validation must be synchronous. Use a schema library that supports synchronous validation for queries.`,
              );
            }

            if (outputResult.issues) {
              throw new QueryOutputValidationError(queryName, outputResult.issues);
            }

            return outputResult.value;
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
            const inputResult = await updateDef.input["~standard"].validate(input);
            if (inputResult.issues) {
              throw new UpdateInputValidationError(updateName, inputResult.issues);
            }

            const result = await (handler as UpdateHandlerImplementation<UpdateDefinition>)(
              inputResult.value,
            );

            const outputResult = await updateDef.output["~standard"].validate(result);
            if (outputResult.issues) {
              throw new UpdateOutputValidationError(updateName, outputResult.issues);
            }

            return outputResult.value;
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
    const outputResult = await definition.output["~standard"].validate(result);
    if (outputResult.issues) {
      throw new WorkflowOutputValidationError(String(workflowName), outputResult.issues);
    }

    return outputResult.value as WorkerInferOutput<TContract["workflows"][TWorkflowName]>;
  };
}
