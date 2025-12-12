import { Client, WorkflowHandle } from "@temporalio/client";
import type { ClientOptions, WorkflowStartOptions, WorkflowOptions } from "@temporalio/client";
import type {
  ClientInferInput,
  ClientInferOutput,
  ClientInferWorkflowQueries,
  ClientInferWorkflowSignals,
  ClientInferWorkflowUpdates,
  ContractDefinition,
  WorkflowDefinition,
  QueryDefinition,
  SignalDefinition,
  UpdateDefinition,
} from "@temporal-contract/contract";
import { Future, Result } from "@swan-io/boxed";
import {
  WorkflowNotFoundError,
  WorkflowValidationError,
  QueryValidationError,
  SignalValidationError,
  UpdateValidationError,
  TypedClientBoxedError,
} from "./errors.js";

/**
 * Extended options for starting workflows with Temporal-specific features
 * Combines required workflowId with optional Temporal workflow options
 */
export type TypedWorkflowStartOptions = Pick<
  WorkflowStartOptions,
  | "workflowId"
  | "workflowIdReusePolicy"
  | "workflowExecutionTimeout"
  | "workflowRunTimeout"
  | "workflowTaskTimeout"
  | "retry"
  | "memo"
  | "searchAttributes"
  | "cronSchedule"
> &
  Pick<WorkflowOptions, "workflowId">;

/**
 * Typed workflow handle with validated results using Result/Future pattern
 */
export interface TypedWorkflowHandleBoxed<TWorkflow extends WorkflowDefinition> {
  workflowId: string;

  /**
   * Type-safe queries based on workflow definition with Result pattern
   */
  queries: {
    [K in keyof ClientInferWorkflowQueries<TWorkflow>]: (
      args: Parameters<ClientInferWorkflowQueries<TWorkflow>[K]>[0],
    ) => Future<
      Result<Awaited<ReturnType<ClientInferWorkflowQueries<TWorkflow>[K]>>, TypedClientBoxedError>
    >;
  };

  /**
   * Type-safe signals based on workflow definition with Result pattern
   */
  signals: {
    [K in keyof ClientInferWorkflowSignals<TWorkflow>]: (
      args: Parameters<ClientInferWorkflowSignals<TWorkflow>[K]>[0],
    ) => Future<Result<void, TypedClientBoxedError>>;
  };

  /**
   * Type-safe updates based on workflow definition with Result pattern
   */
  updates: {
    [K in keyof ClientInferWorkflowUpdates<TWorkflow>]: (
      args: Parameters<ClientInferWorkflowUpdates<TWorkflow>[K]>[0],
    ) => Future<
      Result<Awaited<ReturnType<ClientInferWorkflowUpdates<TWorkflow>[K]>>, TypedClientBoxedError>
    >;
  };

  /**
   * Get workflow result with Result pattern
   */
  result: () => Future<Result<ClientInferOutput<TWorkflow>, TypedClientBoxedError>>;

  /**
   * Terminate workflow with Result pattern
   */
  terminate: (reason?: string) => Future<Result<void, TypedClientBoxedError>>;

  /**
   * Cancel workflow with Result pattern
   */
  cancel: () => Future<Result<void, TypedClientBoxedError>>;

  /**
   * Get workflow execution description including status and metadata
   */
  describe: () => Future<
    Result<Awaited<ReturnType<WorkflowHandle["describe"]>>, TypedClientBoxedError>
  >;

  /**
   * Fetch the workflow execution history
   */
  fetchHistory: () => ReturnType<WorkflowHandle["fetchHistory"]>;
}

/**
 * Typed Temporal client with boxed Result/Future pattern based on a contract
 *
 * Provides type-safe methods to start and execute workflows
 * defined in the contract, with explicit error handling using Result pattern.
 */
export class TypedClientBoxed<TContract extends ContractDefinition> {
  private constructor(
    private readonly contract: TContract,
    private readonly client: Client,
  ) {}

  /**
   * Create a typed Temporal client with boxed pattern from a contract
   *
   * @example
   * ```ts
   * const connection = await Connection.connect();
   * const client = TypedClientBoxed.create(myContract, {
   *   connection,
   *   namespace: 'default',
   * });
   *
   * const result = await client.executeWorkflow('processOrder', {
   *   workflowId: 'order-123',
   *   args: { ... },
   * }).toPromise();
   *
   * result.match({
   *   Ok: (output) => console.log('Success:', output),
   *   Error: (error) => console.error('Failed:', error),
   * });
   * ```
   */
  static create<TContract extends ContractDefinition>(
    contract: TContract,
    options: ClientOptions,
  ): TypedClientBoxed<TContract> {
    const client = new Client(options);
    return new TypedClientBoxed(contract, client);
  }

  /**
   * Start a workflow and return a typed handle with Future pattern
   *
   * @example
   * ```ts
   * const handleResult = await client.startWorkflow('processOrder', {
   *   workflowId: 'order-123',
   *   args: { orderId: 'ORD-123' },
   *   workflowExecutionTimeout: '1 day',
   *   retry: { maximumAttempts: 3 },
   * }).toPromise();
   *
   * handleResult.match({
   *   Ok: async (handle) => {
   *     const result = await handle.result().toPromise();
   *     // ... handle result
   *   },
   *   Error: (error) => console.error('Failed to start:', error),
   * });
   * ```
   */
  startWorkflow<TWorkflowName extends keyof TContract["workflows"]>(
    workflowName: TWorkflowName,
    {
      args,
      ...temporalOptions
    }: TypedWorkflowStartOptions & {
      args: ClientInferInput<TContract["workflows"][TWorkflowName]>;
    },
  ): Future<
    Result<TypedWorkflowHandleBoxed<TContract["workflows"][TWorkflowName]>, TypedClientBoxedError>
  > {
    return Future.make(async (resolve) => {
      const definition = this.contract.workflows[workflowName as string];

      if (!definition) {
        resolve(
          Result.Error(
            new WorkflowNotFoundError(
              String(workflowName),
              Object.keys(this.contract.workflows) as string[],
            ),
          ),
        );
        return;
      }

      // Validate input with Standard Schema
      const inputResult = await definition.input["~standard"].validate(args);
      if (inputResult.issues) {
        resolve(
          Result.Error(
            new WorkflowValidationError(String(workflowName), "input", inputResult.issues),
          ),
        );
        return;
      }
      const validatedInput = inputResult.value as ClientInferInput<
        TContract["workflows"][TWorkflowName]
      >;

      // Start workflow (Temporal expects args as array, so wrap single parameter)
      try {
        const handle = await this.client.workflow.start(workflowName as string, {
          ...temporalOptions,
          taskQueue: this.contract.taskQueue,
          args: [validatedInput],
        });

        const typedHandle = this.createTypedHandle(handle, definition) as TypedWorkflowHandleBoxed<
          TContract["workflows"][TWorkflowName]
        >;
        resolve(Result.Ok(typedHandle));
      } catch (error) {
        resolve(
          Result.Error(
            new TypedClientBoxedError(
              `Failed to start workflow: ${error instanceof Error ? error.message : String(error)}`,
            ),
          ),
        );
      }
    });
  }

  /**
   * Execute a workflow (start and wait for result) with Future/Result pattern
   *
   * @example
   * ```ts
   * const result = await client.executeWorkflow('processOrder', {
   *   workflowId: 'order-123',
   *   args: { orderId: 'ORD-123' },
   *   workflowExecutionTimeout: '1 day',
   *   retry: { maximumAttempts: 3 },
   * }).toPromise();
   *
   * result.match({
   *   Ok: (output) => console.log('Order processed:', output.status),
   *   Error: (error) => console.error('Processing failed:', error),
   * });
   * ```
   */
  executeWorkflow<TWorkflowName extends keyof TContract["workflows"]>(
    workflowName: TWorkflowName,
    {
      args,
      ...temporalOptions
    }: TypedWorkflowStartOptions & {
      args: ClientInferInput<TContract["workflows"][TWorkflowName]>;
    },
  ): Future<
    Result<ClientInferOutput<TContract["workflows"][TWorkflowName]>, TypedClientBoxedError>
  > {
    return Future.make(async (resolve) => {
      const definition = this.contract.workflows[workflowName as string];

      if (!definition) {
        resolve(
          Result.Error(
            new WorkflowNotFoundError(
              String(workflowName),
              Object.keys(this.contract.workflows) as string[],
            ),
          ),
        );
        return;
      }

      // Validate input with Standard Schema
      const inputResult = await definition.input["~standard"].validate(args);
      if (inputResult.issues) {
        resolve(
          Result.Error(
            new WorkflowValidationError(String(workflowName), "input", inputResult.issues),
          ),
        );
        return;
      }
      const validatedInput = inputResult.value as ClientInferInput<
        TContract["workflows"][TWorkflowName]
      >;

      // Execute workflow (Temporal expects args as array, so wrap single parameter)
      try {
        const result = await this.client.workflow.execute(workflowName as string, {
          ...temporalOptions,
          taskQueue: this.contract.taskQueue,
          args: [validatedInput],
        });

        // Validate output with Standard Schema
        const outputResult = await definition.output["~standard"].validate(result);
        if (outputResult.issues) {
          resolve(
            Result.Error(
              new WorkflowValidationError(String(workflowName), "output", outputResult.issues),
            ),
          );
          return;
        }

        resolve(
          Result.Ok(outputResult.value as ClientInferOutput<TContract["workflows"][TWorkflowName]>),
        );
      } catch (error) {
        resolve(
          Result.Error(
            new TypedClientBoxedError(
              `Failed to execute workflow: ${error instanceof Error ? error.message : String(error)}`,
            ),
          ),
        );
      }
    });
  }

  /**
   * Get a handle to an existing workflow with Future/Result pattern
   *
   * @example
   * ```ts
   * const handleResult = await client.getHandle('processOrder', 'order-123').toPromise();
   * handleResult.match({
   *   Ok: async (handle) => {
   *     const result = await handle.result().toPromise();
   *     // ... handle result
   *   },
   *   Error: (error) => console.error('Failed to get handle:', error),
   * });
   * ```
   */
  getHandle<TWorkflowName extends keyof TContract["workflows"]>(
    workflowName: TWorkflowName,
    workflowId: string,
  ): Future<
    Result<TypedWorkflowHandleBoxed<TContract["workflows"][TWorkflowName]>, TypedClientBoxedError>
  > {
    return Future.make((resolve) => {
      const definition = this.contract.workflows[workflowName as string];

      if (!definition) {
        resolve(
          Result.Error(
            new WorkflowNotFoundError(
              String(workflowName),
              Object.keys(this.contract.workflows) as string[],
            ),
          ),
        );
        return;
      }

      try {
        const handle = this.client.workflow.getHandle(workflowId);
        const typedHandle = this.createTypedHandle(handle, definition) as TypedWorkflowHandleBoxed<
          TContract["workflows"][TWorkflowName]
        >;
        resolve(Result.Ok(typedHandle));
      } catch (error) {
        resolve(
          Result.Error(
            new TypedClientBoxedError(
              `Failed to get workflow handle: ${error instanceof Error ? error.message : String(error)}`,
            ),
          ),
        );
      }
    });
  }

  private createTypedHandle<TWorkflow extends WorkflowDefinition>(
    handle: WorkflowHandle,
    definition: TWorkflow,
  ): TypedWorkflowHandleBoxed<TWorkflow> {
    // Create typed queries proxy with Future/Result
    const queries = {} as TypedWorkflowHandleBoxed<TWorkflow>["queries"];
    for (const [queryName, queryDef] of Object.entries(definition.queries ?? {}) as Array<
      [string, QueryDefinition]
    >) {
      (queries as Record<string, unknown>)[queryName] = (
        args: ClientInferInput<typeof queryDef>,
      ): Future<Result<unknown, TypedClientBoxedError>> => {
        return Future.make(async (resolve) => {
          const inputResult = await queryDef.input["~standard"].validate(args);
          if (inputResult.issues) {
            resolve(Result.Error(new QueryValidationError(queryName, "input", inputResult.issues)));
            return;
          }

          try {
            const result = await handle.query(queryName as string, inputResult.value);

            const outputResult = await queryDef.output["~standard"].validate(result);
            if (outputResult.issues) {
              resolve(
                Result.Error(new QueryValidationError(queryName, "output", outputResult.issues)),
              );
              return;
            }

            resolve(Result.Ok(outputResult.value));
          } catch (error) {
            resolve(
              Result.Error(
                new TypedClientBoxedError(
                  `Query failed: ${error instanceof Error ? error.message : String(error)}`,
                ),
              ),
            );
          }
        });
      };
    }

    // Create typed signals proxy with Future/Result
    const signals = {} as TypedWorkflowHandleBoxed<TWorkflow>["signals"];
    for (const [signalName, signalDef] of Object.entries(definition.signals ?? {}) as Array<
      [string, SignalDefinition]
    >) {
      (signals as Record<string, unknown>)[signalName] = (
        args: ClientInferInput<typeof signalDef>,
      ): Future<Result<void, TypedClientBoxedError>> => {
        return Future.make(async (resolve) => {
          const inputResult = await signalDef.input["~standard"].validate(args);
          if (inputResult.issues) {
            resolve(Result.Error(new SignalValidationError(signalName, inputResult.issues)));
            return;
          }

          try {
            await handle.signal(signalName as string, inputResult.value);
            resolve(Result.Ok(undefined));
          } catch (error) {
            resolve(
              Result.Error(
                new TypedClientBoxedError(
                  `Signal failed: ${error instanceof Error ? error.message : String(error)}`,
                ),
              ),
            );
          }
        });
      };
    }

    // Create typed updates proxy with Future/Result
    const updates = {} as TypedWorkflowHandleBoxed<TWorkflow>["updates"];
    for (const [updateName, updateDef] of Object.entries(definition.updates ?? {}) as Array<
      [string, UpdateDefinition]
    >) {
      (updates as Record<string, unknown>)[updateName] = (
        args: ClientInferInput<typeof updateDef>,
      ): Future<Result<unknown, TypedClientBoxedError>> => {
        return Future.make(async (resolve) => {
          const inputResult = await updateDef.input["~standard"].validate(args);
          if (inputResult.issues) {
            resolve(
              Result.Error(new UpdateValidationError(updateName, "input", inputResult.issues)),
            );
            return;
          }

          try {
            const result = await handle.executeUpdate(updateName as string, {
              args: [inputResult.value],
            });

            const outputResult = await updateDef.output["~standard"].validate(result);
            if (outputResult.issues) {
              resolve(
                Result.Error(new UpdateValidationError(updateName, "output", outputResult.issues)),
              );
              return;
            }

            resolve(Result.Ok(outputResult.value));
          } catch (error) {
            resolve(
              Result.Error(
                new TypedClientBoxedError(
                  `Update failed: ${error instanceof Error ? error.message : String(error)}`,
                ),
              ),
            );
          }
        });
      };
    }

    const typedHandle: TypedWorkflowHandleBoxed<TWorkflow> = {
      workflowId: handle.workflowId,
      queries,
      signals,
      updates,
      result: (): Future<Result<ClientInferOutput<TWorkflow>, TypedClientBoxedError>> => {
        return Future.make(async (resolve) => {
          try {
            const result = await handle.result();
            // Validate output with Standard Schema
            const outputResult = await definition.output["~standard"].validate(result);
            if (outputResult.issues) {
              resolve(
                Result.Error(
                  new WorkflowValidationError(handle.workflowId, "output", outputResult.issues),
                ),
              );
              return;
            }
            resolve(Result.Ok(outputResult.value as ClientInferOutput<TWorkflow>));
          } catch (error) {
            resolve(
              Result.Error(
                new TypedClientBoxedError(
                  `Workflow execution failed: ${error instanceof Error ? error.message : String(error)}`,
                ),
              ),
            );
          }
        });
      },
      terminate: (reason?: string): Future<Result<void, TypedClientBoxedError>> => {
        return Future.make(async (resolve) => {
          try {
            await handle.terminate(reason);
            resolve(Result.Ok(undefined));
          } catch (error) {
            resolve(
              Result.Error(
                new TypedClientBoxedError(
                  `Terminate failed: ${error instanceof Error ? error.message : String(error)}`,
                ),
              ),
            );
          }
        });
      },
      cancel: (): Future<Result<void, TypedClientBoxedError>> => {
        return Future.make(async (resolve) => {
          try {
            await handle.cancel();
            resolve(Result.Ok(undefined));
          } catch (error) {
            resolve(
              Result.Error(
                new TypedClientBoxedError(
                  `Cancel failed: ${error instanceof Error ? error.message : String(error)}`,
                ),
              ),
            );
          }
        });
      },
      describe: (): Future<
        Result<Awaited<ReturnType<WorkflowHandle["describe"]>>, TypedClientBoxedError>
      > => {
        return Future.make(async (resolve) => {
          try {
            const description = await handle.describe();
            resolve(Result.Ok(description));
          } catch (error) {
            resolve(
              Result.Error(
                new TypedClientBoxedError(
                  `Describe failed: ${error instanceof Error ? error.message : String(error)}`,
                ),
              ),
            );
          }
        });
      },
      fetchHistory: () => handle.fetchHistory(),
    };

    return typedHandle;
  }
}
