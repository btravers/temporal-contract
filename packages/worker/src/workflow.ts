// Entry point for workflows
import {
  ActivityDefinition,
  ContractDefinition,
  QueryDefinition,
  SignalDefinition,
  UpdateDefinition,
  WorkflowDefinition,
} from "@temporal-contract/contract";
import {
  ActivityInputValidationError,
  ActivityOutputValidationError,
  ChildWorkflowError,
  ChildWorkflowNotFoundError,
  QueryInputValidationError,
  QueryOutputValidationError,
  SignalInputValidationError,
  UpdateInputValidationError,
  UpdateOutputValidationError,
  WorkflowInputValidationError,
  WorkflowOutputValidationError,
} from "./errors.js";
import {
  ClientInferInput,
  ClientInferOutput,
  WorkerInferInput,
  WorkerInferOutput,
} from "./types.js";
import { Future, Result } from "@temporal-contract/boxed";
import {
  ActivityOptions,
  ChildWorkflowHandle,
  ChildWorkflowOptions,
  defineQuery,
  defineSignal,
  defineUpdate,
  executeChild,
  proxyActivities,
  setHandler,
  startChild,
  WorkflowInfo,
  workflowInfo,
} from "@temporalio/workflow";
import { StandardSchemaV1 } from "@standard-schema/spec";

export {
  ActivityInputValidationError,
  ActivityOutputValidationError,
  ChildWorkflowError,
  ChildWorkflowNotFoundError,
  QueryInputValidationError,
  QueryOutputValidationError,
  SignalInputValidationError,
  UpdateInputValidationError,
  UpdateOutputValidationError,
  WorkflowInputValidationError,
  WorkflowOutputValidationError,
} from "./errors.js";

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
>({
  workflowName,
  contract,
  implementation,
  activityOptions,
}: DeclareWorkflowOptions<TContract, TWorkflowName>): (
  ...args: unknown[]
) => Promise<WorkerInferOutput<TContract["workflows"][TWorkflowName]>> {
  // Get the workflow definition from the contract
  const definition = contract.workflows[
    workflowName as string
  ] as TContract["workflows"][TWorkflowName];

  return async (...args: unknown[]) => {
    // Extract single parameter (Temporal passes arguments as array)
    const input = args.length === 1 ? args[0] : args;

    // Validate workflow input
    const inputResult = await definition.input["~standard"].validate(input);
    if (inputResult.issues) {
      throw new WorkflowInputValidationError(String(workflowName), inputResult.issues);
    }
    const validatedInput = inputResult.value as WorkerInferInput<
      TContract["workflows"][TWorkflowName]
    >;

    // Create activities proxy with validation if activities are defined
    let contextActivities: unknown = {};

    if (definition.activities || contract.activities) {
      const rawActivities =
        proxyActivities<Record<string, (...args: unknown[]) => Promise<unknown>>>(activityOptions);

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
    ): Promise<Result<ClientInferOutput<TChildWorkflow>, ChildWorkflowError>> {
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
        result: (): Future<Result<ClientInferOutput<TChildWorkflow>, ChildWorkflowError>> => {
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
      options: TypedChildWorkflowOptions<TChildContract, TChildWorkflowName>,
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
      options: TypedChildWorkflowOptions<TChildContract, TChildWorkflowName>,
    ): Future<
      Result<ClientInferOutput<TChildContract["workflows"][TChildWorkflowName]>, ChildWorkflowError>
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
                outputValidationResult.value as ClientInferOutput<
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

    // Context methods for defining signals, queries, and updates
    function createDefineSignal<
      TSignalName extends keyof TContract["workflows"][TWorkflowName]["signals"],
    >(
      signalName: TSignalName,
      handler: SignalHandlerImplementation<
        TContract["workflows"][TWorkflowName]["signals"][TSignalName] extends SignalDefinition
          ? TContract["workflows"][TWorkflowName]["signals"][TSignalName]
          : never
      >,
    ): void {
      if (!definition.signals) {
        throw new Error(
          `Signal "${String(signalName)}" cannot be defined: workflow "${String(workflowName)}" has no signals in its contract`,
        );
      }

      const signalDef = (definition.signals as Record<string, SignalDefinition>)[
        signalName as string
      ];
      if (!signalDef) {
        throw new Error(
          `Signal "${String(signalName)}" not found in workflow "${String(workflowName)}" contract`,
        );
      }

      const signal = defineSignal(signalName as string);
      setHandler(signal, async (...args: unknown[]) => {
        // Extract single parameter (Temporal passes as args array)
        const input = args.length === 1 ? args[0] : args;
        const inputResult = await signalDef.input["~standard"].validate(input);
        if (inputResult.issues) {
          throw new SignalInputValidationError(signalName as string, inputResult.issues);
        }
        await (handler as SignalHandlerImplementation<SignalDefinition>)(inputResult.value);
      });
    }

    function createDefineQuery<
      TQueryName extends keyof TContract["workflows"][TWorkflowName]["queries"],
    >(
      queryName: TQueryName,
      handler: QueryHandlerImplementation<
        TContract["workflows"][TWorkflowName]["queries"][TQueryName] extends QueryDefinition
          ? TContract["workflows"][TWorkflowName]["queries"][TQueryName]
          : never
      >,
    ): void {
      if (!definition.queries) {
        throw new Error(
          `Query "${String(queryName)}" cannot be defined: workflow "${String(workflowName)}" has no queries in its contract`,
        );
      }

      const queryDef = (definition.queries as Record<string, QueryDefinition>)[queryName as string];
      if (!queryDef) {
        throw new Error(
          `Query "${String(queryName)}" not found in workflow "${String(workflowName)}" contract`,
        );
      }

      const query = defineQuery(queryName as string);
      setHandler(query, (...args: unknown[]) => {
        // Extract single parameter (Temporal passes as args array)
        const input = args.length === 1 ? args[0] : args;
        // Note: Query handlers must be synchronous, so we need to handle validation synchronously
        const inputResult = queryDef.input["~standard"].validate(input);

        // Handle both sync and async validation results
        if (inputResult instanceof Promise) {
          throw new Error(
            `Query "${String(queryName)}" validation must be synchronous. Use a schema library that supports synchronous validation for queries.`,
          );
        }

        if (inputResult.issues) {
          throw new QueryInputValidationError(queryName as string, inputResult.issues);
        }

        const result = handler(inputResult.value);

        const outputResult = queryDef.output["~standard"].validate(result);
        if (outputResult instanceof Promise) {
          throw new Error(
            `Query "${String(queryName)}" output validation must be synchronous. Use a schema library that supports synchronous validation for queries.`,
          );
        }

        if (outputResult.issues) {
          throw new QueryOutputValidationError(queryName as string, outputResult.issues);
        }

        return outputResult.value;
      });
    }

    function createDefineUpdate<
      TUpdateName extends keyof TContract["workflows"][TWorkflowName]["updates"],
    >(
      updateName: TUpdateName,
      handler: UpdateHandlerImplementation<
        TContract["workflows"][TWorkflowName]["updates"][TUpdateName] extends UpdateDefinition
          ? TContract["workflows"][TWorkflowName]["updates"][TUpdateName]
          : never
      >,
    ): void {
      if (!definition.updates) {
        throw new Error(
          `Update "${String(updateName)}" cannot be defined: workflow "${String(workflowName)}" has no updates in its contract`,
        );
      }

      const updateDef = (definition.updates as Record<string, UpdateDefinition>)[
        updateName as string
      ];
      if (!updateDef) {
        throw new Error(
          `Update "${String(updateName)}" not found in workflow "${String(workflowName)}" contract`,
        );
      }

      const update = defineUpdate(updateName as string);
      setHandler(update, async (...args: unknown[]) => {
        // Extract single parameter (Temporal passes as args array)
        const input = args.length === 1 ? args[0] : args;
        const inputResult = await updateDef.input["~standard"].validate(input);
        if (inputResult.issues) {
          throw new UpdateInputValidationError(updateName as string, inputResult.issues);
        }

        const result = await handler(inputResult.value);

        const outputResult = await updateDef.output["~standard"].validate(result);
        if (outputResult.issues) {
          throw new UpdateOutputValidationError(updateName as string, outputResult.issues);
        }

        return outputResult.value;
      });
    }

    // Create workflow context
    const context: WorkflowContext<TContract, TWorkflowName> = {
      activities: contextActivities as WorkflowInferWorkflowContextActivities<
        TContract,
        TWorkflowName
      >,
      info: workflowInfo(),
      startChildWorkflow: createStartChildWorkflow,
      executeChildWorkflow: createExecuteChildWorkflow,
      defineSignal: createDefineSignal as WorkflowContext<TContract, TWorkflowName>["defineSignal"],
      defineQuery: createDefineQuery as WorkflowContext<TContract, TWorkflowName>["defineQuery"],
      defineUpdate: createDefineUpdate as WorkflowContext<TContract, TWorkflowName>["defineUpdate"],
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

/**
 * Signal handler implementation
 *
 * Processes signal input and can optionally perform asynchronous operations.
 * Should not return a value (signals are fire-and-forget).
 */
type SignalHandlerImplementation<TSignal extends SignalDefinition> = (
  args: WorkerInferInput<TSignal>,
) => void | Promise<void>;

/**
 * Query handler implementation
 *
 * Processes query input and returns a synchronous response.
 * Must be synchronous to satisfy Temporal's query constraints.
 */
type QueryHandlerImplementation<TQuery extends QueryDefinition> = (
  args: WorkerInferInput<TQuery>,
) => WorkerInferOutput<TQuery>;

/**
 * Update handler implementation
 *
 * Processes update input and returns a validated response after modifying workflow state.
 * Can perform asynchronous operations.
 */
type UpdateHandlerImplementation<TUpdate extends UpdateDefinition> = (
  args: WorkerInferInput<TUpdate>,
) => Promise<WorkerInferOutput<TUpdate>>;

/**
 * Options for declaring a workflow implementation
 */
interface DeclareWorkflowOptions<
  TContract extends ContractDefinition,
  TWorkflowName extends keyof TContract["workflows"],
> {
  workflowName: TWorkflowName;
  contract: TContract;
  implementation: WorkflowImplementation<TContract, TWorkflowName>;
  /**
   * Default activity options applied to all activities in this workflow.
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
  activityOptions: ActivityOptions;
}

/**
 * Workflow implementation function
 *
 * Receives a workflow context (with typed activities and utilities) and validated input arguments.
 * Returns the workflow output which will be validated against the contract schema.
 */
type WorkflowImplementation<
  TContract extends ContractDefinition,
  TWorkflowName extends keyof TContract["workflows"],
> = (
  context: WorkflowContext<TContract, TWorkflowName>,
  args: WorkerInferInput<TContract["workflows"][TWorkflowName]>,
) => Promise<WorkerInferOutput<TContract["workflows"][TWorkflowName]>>;

/**
 * Workflow execution context providing typed activities, workflow info, and interaction handlers
 *
 * Provides access to:
 * - Typed activities (both workflow-specific and global)
 * - Workflow metadata and execution info
 * - Signal, query, and update handler registration
 * - Child workflow execution capabilities
 */
interface WorkflowContext<
  TContract extends ContractDefinition,
  TWorkflowName extends keyof TContract["workflows"],
> {
  activities: WorkflowInferWorkflowContextActivities<TContract, TWorkflowName>;
  info: WorkflowInfo;

  /**
   * Define a signal handler within the workflow implementation
   * Allows the signal handler to access workflow state
   *
   * @example
   * ```ts
   * implementation: async (context, args) => {
   *   let currentValue = args.initialValue;
   *
   *   context.defineSignal('increment', async (signalArgs) => {
   *     currentValue += signalArgs.amount;
   *   });
   *
   *   // ... rest of workflow
   * }
   * ```
   */
  defineSignal: <K extends keyof TContract["workflows"][TWorkflowName]["signals"]>(
    signalName: K,
    handler: SignalHandlerImplementation<
      TContract["workflows"][TWorkflowName]["signals"][K] extends SignalDefinition
        ? TContract["workflows"][TWorkflowName]["signals"][K]
        : never
    >,
  ) => void;

  /**
   * Define a query handler within the workflow implementation
   * Allows the query handler to access workflow state
   *
   * @example
   * ```ts
   * implementation: async (context, args) => {
   *   let currentValue = args.initialValue;
   *
   *   context.defineQuery('getCurrentValue', () => {
   *     return { value: currentValue };
   *   });
   *
   *   // ... rest of workflow
   * }
   * ```
   */
  defineQuery: <K extends keyof TContract["workflows"][TWorkflowName]["queries"]>(
    queryName: K,
    handler: QueryHandlerImplementation<
      TContract["workflows"][TWorkflowName]["queries"][K] extends QueryDefinition
        ? TContract["workflows"][TWorkflowName]["queries"][K]
        : never
    >,
  ) => void;

  /**
   * Define an update handler within the workflow implementation
   * Allows the update handler to access and modify workflow state
   *
   * @example
   * ```ts
   * implementation: async (context, args) => {
   *   let currentValue = args.initialValue;
   *
   *   context.defineUpdate('multiply', async (updateArgs) => {
   *     currentValue *= updateArgs.factor;
   *     return { newValue: currentValue };
   *   });
   *
   *   // ... rest of workflow
   * }
   * ```
   */
  defineUpdate: <K extends keyof TContract["workflows"][TWorkflowName]["updates"]>(
    updateName: K,
    handler: UpdateHandlerImplementation<
      TContract["workflows"][TWorkflowName]["updates"][K] extends UpdateDefinition
        ? TContract["workflows"][TWorkflowName]["updates"][K]
        : never
    >,
  ) => void;

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
    options: TypedChildWorkflowOptions<TChildContract, TChildWorkflowName>,
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
    options: TypedChildWorkflowOptions<TChildContract, TChildWorkflowName>,
  ) => Future<
    Result<ClientInferOutput<TChildContract["workflows"][TChildWorkflowName]>, ChildWorkflowError>
  >;
}

/**
 * Options for starting a child workflow
 */
type TypedChildWorkflowOptions<
  TChildContract extends ContractDefinition,
  TChildWorkflowName extends keyof TChildContract["workflows"],
> = Omit<ChildWorkflowOptions, "taskQueue" | "args"> & {
  args: ClientInferInput<TChildContract["workflows"][TChildWorkflowName]>;
};

/**
 * Typed handle for a child workflow with Future/Result pattern
 */
interface TypedChildWorkflowHandle<TWorkflow extends WorkflowDefinition> {
  /**
   * Get child workflow result with Result pattern
   */
  result: () => Future<Result<ClientInferOutput<TWorkflow>, ChildWorkflowError>>;

  /**
   * Child workflow ID
   */
  workflowId: string;
}

/**
 * Activity function signature from workflow execution perspective
 *
 * Workflows call activities with validated input (z.input parsed) and receive validated output (z.output)
 */
type WorkflowInferActivity<TActivity extends ActivityDefinition> = (
  args: ClientInferInput<TActivity>,
) => Promise<ClientInferOutput<TActivity>>;

/**
 * All global activities from a contract (workflow execution perspective)
 */
type WorkflowInferActivities<TContract extends ContractDefinition> =
  TContract["activities"] extends Record<string, ActivityDefinition>
    ? {
        [K in keyof TContract["activities"]]: WorkflowInferActivity<TContract["activities"][K]>;
      }
    : {};

/**
 * Workflow-specific activities (workflow execution perspective)
 */
type WorkflowInferWorkflowActivities<T extends WorkflowDefinition> =
  T["activities"] extends Record<string, ActivityDefinition>
    ? {
        [K in keyof T["activities"]]: WorkflowInferActivity<T["activities"][K]>;
      }
    : {};

/**
 * All activities available in a workflow context (workflow execution perspective)
 *
 * Combines workflow-specific activities with global contract activities
 */
type WorkflowInferWorkflowContextActivities<
  TContract extends ContractDefinition,
  TWorkflowName extends keyof TContract["workflows"],
> = WorkflowInferWorkflowActivities<TContract["workflows"][TWorkflowName]> &
  WorkflowInferActivities<TContract>;

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
): WorkflowInferWorkflowContextActivities<TContract, TWorkflowName> {
  const validatedActivities = {} as WorkflowInferWorkflowContextActivities<
    TContract,
    TWorkflowName
  >;

  // Merge workflow-specific and global contract activities
  // Workflow-specific activities take precedence over global ones
  const allActivitiesDefinition = {
    ...contractActivitiesDefinition,
    ...workflowActivitiesDefinition,
  };

  for (const [activityName, activityDef] of Object.entries(allActivitiesDefinition)) {
    const rawActivity = rawActivities[activityName];

    if (!rawActivity) {
      throw new Error(
        `Activity implementation not found for: "${activityName}". ` +
          `Available activities: ${Object.keys(rawActivities).length > 0 ? Object.keys(rawActivities).join(", ") : "none"}`,
      );
    }

    // Wrap activity with input/output validation
    // Register the wrapped activity
    (validatedActivities as Record<string, unknown>)[activityName] = async (input: unknown) => {
      // Validate input before sending over the network
      const inputResult = await activityDef.input["~standard"].validate(input);
      if (inputResult.issues) {
        throw new ActivityInputValidationError(activityName, inputResult.issues);
      }

      // Call the actual activity with validated input
      const result = await rawActivity(inputResult.value);

      // Validate output after receiving from the network
      const outputResult = await activityDef.output["~standard"].validate(result);
      if (outputResult.issues) {
        throw new ActivityOutputValidationError(activityName, outputResult.issues);
      }

      return outputResult.value;
    };
  }

  return validatedActivities;
}
