import { Future, Result } from "@swan-io/boxed";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import {
  ActivityOptions,
  WorkflowInfo,
  defineQuery,
  defineSignal,
  defineUpdate,
  proxyActivities,
  setHandler,
  workflowInfo,
  startChild,
  executeChild,
} from "@temporalio/workflow";
import type { ChildWorkflowHandle, ChildWorkflowOptions } from "@temporalio/workflow";
import type {
  ActivityDefinition,
  ContractDefinition,
  QueryDefinition,
  SignalDefinition,
  UpdateDefinition,
  WorkflowDefinition,
} from "@temporal-contract/contract";
import type {
  WorkerInferInput,
  WorkerInferOutput,
  WorkerInferWorkflowContextActivities,
} from "./types.js";
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
  ChildWorkflowNotFoundError,
  ChildWorkflowError,
} from "./errors.js";

// Re-export ActivityError for convenience
export { ActivityError };

/**
 * Typed handle for a child workflow with Future/Result pattern
 */
export interface TypedChildWorkflowHandle<TWorkflow extends WorkflowDefinition> {
  /**
   * Get child workflow result with Result pattern
   */
  result: () => Future<Result<WorkerInferOutput<TWorkflow>, ChildWorkflowError>>;

  /**
   * Child workflow ID
   */
  workflowId: string;
}

/**
 * Options for starting a child workflow
 */
export type TypedChildWorkflowOptions = Pick<
  ChildWorkflowOptions,
  | "workflowId"
  | "workflowIdReusePolicy"
  | "parentClosePolicy"
  | "workflowExecutionTimeout"
  | "workflowRunTimeout"
  | "workflowTaskTimeout"
  | "retry"
  | "memo"
  | "searchAttributes"
  | "cronSchedule"
  | "cancellationType"
>;

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

  /**
   * Start a child workflow and return a typed handle with Future/Result pattern
   *
   * Supports both same-contract and cross-contract child workflows:
   * - Same contract: Pass workflowName from current contract
   * - Cross-contract: Pass contract and workflowName to invoke workflows from other workers
   *
   * @example
   * ```ts
   * // Same contract child workflow
   * const childResult = await context.startChildWorkflow(myContract, 'processPayment', {
   *   workflowId: 'payment-123',
   *   args: { amount: 100 }
   * });
   *
   * // Cross-contract child workflow (from another worker)
   * const otherResult = await context.startChildWorkflow(otherContract, 'sendNotification', {
   *   workflowId: 'notification-123',
   *   args: { message: 'Hello' }
   * });
   *
   * childResult.match({
   *   Ok: async (handle) => {
   *     const result = await handle.result();
   *     // ... handle result
   *   },
   *   Error: (error) => console.error('Failed to start:', error),
   * });
   * ```
   */
  startChildWorkflow: <
    TChildContract extends ContractDefinition,
    TChildWorkflowName extends keyof TChildContract["workflows"],
  >(
    contract: TChildContract,
    workflowName: TChildWorkflowName,
    options: TypedChildWorkflowOptions & {
      args: WorkerInferInput<TChildContract["workflows"][TChildWorkflowName]>;
    },
  ) => Future<
    Result<
      TypedChildWorkflowHandle<TChildContract["workflows"][TChildWorkflowName]>,
      ChildWorkflowError
    >
  >;

  /**
   * Execute a child workflow (start and wait for result) with Future/Result pattern
   *
   * Supports both same-contract and cross-contract child workflows:
   * - Same contract: Pass workflowName from current contract
   * - Cross-contract: Pass contract and workflowName to invoke workflows from other workers
   *
   * @example
   * ```ts
   * // Same contract child workflow
   * const result = await context.executeChildWorkflow(myContract, 'processPayment', {
   *   workflowId: 'payment-123',
   *   args: { amount: 100 }
   * });
   *
   * // Cross-contract child workflow (from another worker)
   * const otherResult = await context.executeChildWorkflow(otherContract, 'sendNotification', {
   *   workflowId: 'notification-123',
   *   args: { message: 'Hello' }
   * });
   *
   * result.match({
   *   Ok: (output) => console.log('Payment processed:', output),
   *   Error: (error) => console.error('Processing failed:', error),
   * });
   * ```
   */
  executeChildWorkflow: <
    TChildContract extends ContractDefinition,
    TChildWorkflowName extends keyof TChildContract["workflows"],
  >(
    contract: TChildContract,
    workflowName: TChildWorkflowName,
    options: TypedChildWorkflowOptions & {
      args: WorkerInferInput<TChildContract["workflows"][TChildWorkflowName]>;
    },
  ) => Future<
    Result<WorkerInferOutput<TChildContract["workflows"][TChildWorkflowName]>, ChildWorkflowError>
  >;
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

      // Unwrap Future and Result (Future is awaitable)
      const result = await futureResult;

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

    // Helper to validate child workflow output
    async function validateChildWorkflowOutput<TChildWorkflow extends WorkflowDefinition>(
      childDefinition: TChildWorkflow,
      result: unknown,
      childWorkflowName: string,
    ): Promise<Result<WorkerInferOutput<TChildWorkflow>, ChildWorkflowError>> {
      const outputResult = await childDefinition.output["~standard"].validate(result);
      if (outputResult.issues) {
        return Result.Error(
          new ChildWorkflowError(
            `Child workflow "${childWorkflowName}" output validation failed: ${outputResult.issues.map((i: StandardSchemaV1.Issue) => i.message).join("; ")}`,
          ),
        );
      }
      return Result.Ok(outputResult.value as WorkerInferOutput<TChildWorkflow>);
    }

    // Helper to get and validate child workflow definition and input
    async function getAndValidateChildWorkflow<
      TChildContract extends ContractDefinition,
      TChildWorkflowName extends keyof TChildContract["workflows"],
    >(
      childContract: TChildContract,
      childWorkflowName: TChildWorkflowName,
      args: unknown,
    ): Promise<
      Result<
        {
          definition: TChildContract["workflows"][TChildWorkflowName];
          validatedInput: WorkerInferInput<TChildContract["workflows"][TChildWorkflowName]>;
          taskQueue: string;
        },
        ChildWorkflowError
      >
    > {
      const childDefinition = childContract.workflows[childWorkflowName as string];

      if (!childDefinition) {
        return Result.Error(
          new ChildWorkflowNotFoundError(
            String(childWorkflowName),
            Object.keys(childContract.workflows) as string[],
          ),
        );
      }

      const inputResult = await childDefinition.input["~standard"].validate(args);
      if (inputResult.issues) {
        return Result.Error(
          new ChildWorkflowError(
            `Child workflow "${String(childWorkflowName)}" input validation failed: ${inputResult.issues.map((i: StandardSchemaV1.Issue) => i.message).join("; ")}`,
          ),
        );
      }

      const validatedInput = inputResult.value as WorkerInferInput<
        TChildContract["workflows"][TChildWorkflowName]
      >;

      return Result.Ok({
        definition: childDefinition as TChildContract["workflows"][TChildWorkflowName],
        validatedInput,
        taskQueue: childContract.taskQueue,
      });
    }

    // Helper function to create a typed child workflow handle
    function createTypedChildHandle<TChildWorkflow extends WorkflowDefinition>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handle: ChildWorkflowHandle<any>,
      childDefinition: TChildWorkflow,
      childWorkflowName: string,
    ): TypedChildWorkflowHandle<TChildWorkflow> {
      return {
        workflowId: handle.workflowId,
        result: (): Future<Result<WorkerInferOutput<TChildWorkflow>, ChildWorkflowError>> => {
          return Future.make((resolve) => {
            (async () => {
              try {
                const result = await handle.result();
                const validationResult = await validateChildWorkflowOutput(
                  childDefinition,
                  result,
                  childWorkflowName,
                );
                resolve(validationResult);
              } catch (error) {
                resolve(
                  Result.Error(
                    new ChildWorkflowError(
                      `Child workflow execution failed: ${error instanceof Error ? error.message : String(error)}`,
                      error,
                    ),
                  ),
                );
              }
            })();
          });
        },
      };
    }

    // Helper function to start a child workflow
    function createStartChildWorkflow<
      TChildContract extends ContractDefinition,
      TChildWorkflowName extends keyof TChildContract["workflows"],
    >(
      childContract: TChildContract,
      childWorkflowName: TChildWorkflowName,
      options: TypedChildWorkflowOptions & {
        args: WorkerInferInput<TChildContract["workflows"][TChildWorkflowName]>;
      },
    ): Future<
      Result<
        TypedChildWorkflowHandle<TChildContract["workflows"][TChildWorkflowName]>,
        ChildWorkflowError
      >
    > {
      return Future.make((resolve) => {
        (async () => {
          // Validate input and get definition
          const validationResult = await getAndValidateChildWorkflow(
            childContract,
            childWorkflowName,
            options.args,
          );

          if (validationResult.isError()) {
            resolve(Result.Error(validationResult.error));
            return;
          }

          const { definition: childDefinition, validatedInput, taskQueue } = validationResult.value;

          try {
            // Start child workflow (Temporal expects args as array)
            const { args: _args, ...temporalOptions } = options;
            const handle = await startChild(childWorkflowName as string, {
              ...temporalOptions,
              taskQueue,
              args: [validatedInput],
            });

            const typedHandle = createTypedChildHandle(
              handle,
              childDefinition,
              String(childWorkflowName),
            ) as TypedChildWorkflowHandle<TChildContract["workflows"][TChildWorkflowName]>;

            resolve(Result.Ok(typedHandle));
          } catch (error) {
            resolve(
              Result.Error(
                new ChildWorkflowError(
                  `Failed to start child workflow: ${error instanceof Error ? error.message : String(error)}`,
                  error,
                ),
              ),
            );
          }
        })();
      });
    }

    // Helper function to execute a child workflow
    function createExecuteChildWorkflow<
      TChildContract extends ContractDefinition,
      TChildWorkflowName extends keyof TChildContract["workflows"],
    >(
      childContract: TChildContract,
      childWorkflowName: TChildWorkflowName,
      options: TypedChildWorkflowOptions & {
        args: WorkerInferInput<TChildContract["workflows"][TChildWorkflowName]>;
      },
    ): Future<
      Result<WorkerInferOutput<TChildContract["workflows"][TChildWorkflowName]>, ChildWorkflowError>
    > {
      return Future.make((resolve) => {
        (async () => {
          // Validate input and get definition
          const validationResult = await getAndValidateChildWorkflow(
            childContract,
            childWorkflowName,
            options.args,
          );

          if (validationResult.isError()) {
            resolve(Result.Error(validationResult.error));
            return;
          }

          const { definition: childDefinition, validatedInput, taskQueue } = validationResult.value;

          try {
            // Execute child workflow (Temporal expects args as array)
            const { args: _args, ...temporalOptions } = options;
            const result = await executeChild(childWorkflowName as string, {
              ...temporalOptions,
              taskQueue,
              args: [validatedInput],
            });

            // Validate output with Standard Schema
            const outputValidationResult = await validateChildWorkflowOutput(
              childDefinition,
              result,
              String(childWorkflowName),
            );

            if (outputValidationResult.isError()) {
              resolve(Result.Error(outputValidationResult.error));
              return;
            }

            resolve(
              Result.Ok(
                outputValidationResult.value as WorkerInferOutput<
                  TChildContract["workflows"][TChildWorkflowName]
                >,
              ),
            );
          } catch (error) {
            resolve(
              Result.Error(
                new ChildWorkflowError(
                  `Failed to execute child workflow: ${error instanceof Error ? error.message : String(error)}`,
                  error,
                ),
              ),
            );
          }
        })();
      });
    }

    // Create workflow context
    const context: WorkflowContext<TContract, TWorkflowName> = {
      activities: contextActivities as WorkerInferWorkflowContextActivities<
        TContract,
        TWorkflowName
      >,
      info: workflowInfo(),
      startChildWorkflow: createStartChildWorkflow,
      executeChildWorkflow: createExecuteChildWorkflow,
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
