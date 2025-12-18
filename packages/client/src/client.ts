import { Client, WorkflowHandle } from "@temporalio/client";
import type { WorkflowStartOptions } from "@temporalio/client";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type {
  ContractDefinition,
  WorkflowDefinition,
  QueryDefinition,
  SignalDefinition,
  UpdateDefinition,
} from "@temporal-contract/contract";
import type {
  ClientInferInput,
  ClientInferOutput,
  ClientInferWorkflowQueries,
  ClientInferWorkflowSignals,
  ClientInferWorkflowUpdates,
} from "./types.js";
import { Future, Result } from "@temporal-contract/boxed";
import {
  WorkflowNotFoundError,
  WorkflowValidationError,
  QueryValidationError,
  SignalValidationError,
  UpdateValidationError,
  RuntimeClientError,
} from "./errors.js";

// Union of all errors returned by the typed client
export type ClientErrorUnion =
  | WorkflowNotFoundError
  | WorkflowValidationError
  | QueryValidationError
  | SignalValidationError
  | UpdateValidationError
  | RuntimeClientError;

export type TypedWorkflowStartOptions<
  TContract extends ContractDefinition,
  TWorkflowName extends keyof TContract["workflows"],
> = Omit<WorkflowStartOptions, "taskQueue" | "args"> & {
  args: ClientInferInput<TContract["workflows"][TWorkflowName]>;
};

/**
 * Typed workflow handle with validated results using Result/Future pattern
 */
export interface TypedWorkflowHandle<TWorkflow extends WorkflowDefinition> {
  workflowId: string;

  /**
   * Type-safe queries based on workflow definition with Result pattern
   * Each query returns Future<Result<T, Error>> instead of Promise<T>
   */
  queries: {
    [K in keyof ClientInferWorkflowQueries<TWorkflow>]: ClientInferWorkflowQueries<TWorkflow>[K] extends (
      ...args: infer Args
    ) => Future<Result<infer R, Error>>
      ? (...args: Args) => Future<Result<R, ClientErrorUnion>>
      : never;
  };

  /**
   * Type-safe signals based on workflow definition with Result pattern
   * Each signal returns Future<Result<void, Error>> instead of Promise<void>
   */
  signals: {
    [K in keyof ClientInferWorkflowSignals<TWorkflow>]: ClientInferWorkflowSignals<TWorkflow>[K] extends (
      ...args: infer Args
    ) => Future<Result<void, Error>>
      ? (...args: Args) => Future<Result<void, ClientErrorUnion>>
      : never;
  };

  /**
   * Type-safe updates based on workflow definition with Result pattern
   * Each update returns Future<Result<T, Error>> instead of Promise<T>
   */
  updates: {
    [K in keyof ClientInferWorkflowUpdates<TWorkflow>]: ClientInferWorkflowUpdates<TWorkflow>[K] extends (
      ...args: infer Args
    ) => Future<Result<infer R, Error>>
      ? (...args: Args) => Future<Result<R, ClientErrorUnion>>
      : never;
  };

  /**
   * Get workflow result with Result pattern
   */
  result: () => Future<Result<ClientInferOutput<TWorkflow>, ClientErrorUnion>>;

  /**
   * Terminate workflow with Result pattern
   */
  terminate: (reason?: string) => Future<Result<void, ClientErrorUnion>>;

  /**
   * Cancel workflow with Result pattern
   */
  cancel: () => Future<Result<void, ClientErrorUnion>>;

  /**
   * Get workflow execution description including status and metadata
   */
  describe: () => Future<Result<Awaited<ReturnType<WorkflowHandle["describe"]>>, ClientErrorUnion>>;

  /**
   * Fetch the workflow execution history
   */
  fetchHistory: () => Future<
    Result<Awaited<ReturnType<WorkflowHandle["fetchHistory"]>>, RuntimeClientError>
  >;
}

/**
 * Typed Temporal client with Result/Future pattern based on a contract
 *
 * Provides type-safe methods to start and execute workflows
 * defined in the contract, with explicit error handling using Result pattern.
 */
export class TypedClient<TContract extends ContractDefinition> {
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
   * const client = TypedClient.create(myContract, {
   *   connection,
   *   namespace: 'default',
   * });
   *
   * const result = await client.executeWorkflow('processOrder', {
   *   workflowId: 'order-123',
   *   args: { ... },
   * });
   *
   * result.match({
   *   Ok: (output) => console.log('Success:', output),
   *   Error: (error) => console.error('Failed:', error),
   * });
   * ```
   */
  static create<TContract extends ContractDefinition>(
    contract: TContract,
    client: Client,
  ): TypedClient<TContract> {
    return new TypedClient(contract, client);
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
   * });
   *
   * handleResult.match({
   *   Ok: async (handle) => {
   *     const result = await handle.result();
   *     // ... handle result
   *   },
   *   Error: (error) => console.error('Failed to start:', error),
   * });
   * ```
   */
  startWorkflow<TWorkflowName extends keyof TContract["workflows"]>(
    workflowName: TWorkflowName,
    { args, ...temporalOptions }: TypedWorkflowStartOptions<TContract, TWorkflowName>,
  ): Future<
    Result<
      TypedWorkflowHandle<TContract["workflows"][TWorkflowName]>,
      WorkflowNotFoundError | WorkflowValidationError | RuntimeClientError
    >
  > {
    return Future.make((resolve) => {
      (async () => {
        const definition = this.contract.workflows[workflowName as string];

        if (!definition) {
          resolve(Result.Error(createWorkflowNotFoundError(workflowName, this.contract)));
          return;
        }

        const inputResult = await definition.input["~standard"].validate(args);
        if (inputResult.issues) {
          resolve(
            Result.Error(createWorkflowValidationError(workflowName, "input", inputResult.issues)),
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
          const typedHandle = this.createTypedHandle(handle, definition) as TypedWorkflowHandle<
            TContract["workflows"][TWorkflowName]
          >;
          resolve(Result.Ok(typedHandle));
        } catch (error) {
          resolve(Result.Error(createRuntimeClientError("startWorkflow", error)));
        }
      })();
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
   * });
   *
   * result.match({
   *   Ok: (output) => console.log('Order processed:', output.status),
   *   Error: (error) => console.error('Processing failed:', error),
   * });
   * ```
   */
  executeWorkflow<TWorkflowName extends keyof TContract["workflows"]>(
    workflowName: TWorkflowName,
    { args, ...temporalOptions }: TypedWorkflowStartOptions<TContract, TWorkflowName>,
  ): Future<
    Result<
      ClientInferOutput<TContract["workflows"][TWorkflowName]>,
      WorkflowNotFoundError | WorkflowValidationError | RuntimeClientError
    >
  > {
    return Future.make((resolve) => {
      (async () => {
        const definition = this.contract.workflows[workflowName as string];

        if (!definition) {
          resolve(Result.Error(createWorkflowNotFoundError(workflowName, this.contract)));
          return;
        }

        const inputResult = await definition.input["~standard"].validate(args);
        if (inputResult.issues) {
          resolve(
            Result.Error(createWorkflowValidationError(workflowName, "input", inputResult.issues)),
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
                createWorkflowValidationError(workflowName, "output", outputResult.issues),
              ),
            );
            return;
          }

          resolve(
            Result.Ok(
              outputResult.value as ClientInferOutput<TContract["workflows"][TWorkflowName]>,
            ),
          );
        } catch (error) {
          resolve(Result.Error(createRuntimeClientError("executeWorkflow", error)));
        }
      })();
    });
  }

  /**
   * Get a handle to an existing workflow with Future/Result pattern
   *
   * @example
   * ```ts
   * const handleResult = await client.getHandle('processOrder', 'order-123');
   * handleResult.match({
   *   Ok: async (handle) => {
   *     const result = await handle.result();
   *     // ... handle result
   *   },
   *   Error: (error) => console.error('Failed to get handle:', error),
   * });
   * ```
   */
  getHandle<TWorkflowName extends keyof TContract["workflows"]>(
    workflowName: TWorkflowName,
    workflowId: string,
  ): Future<Result<TypedWorkflowHandle<TContract["workflows"][TWorkflowName]>, ClientErrorUnion>> {
    return Future.make((resolve) => {
      const definition = this.contract.workflows[workflowName as string];

      if (!definition) {
        resolve(Result.Error(createWorkflowNotFoundError(workflowName, this.contract)));
        return;
      }

      try {
        const handle = this.client.workflow.getHandle(workflowId);
        const typedHandle = this.createTypedHandle(handle, definition) as TypedWorkflowHandle<
          TContract["workflows"][TWorkflowName]
        >;
        resolve(Result.Ok(typedHandle));
      } catch (error) {
        resolve(Result.Error(createRuntimeClientError("getHandle", error)));
      }
    });
  }

  private createTypedHandle<TWorkflow extends WorkflowDefinition>(
    workflowHandle: WorkflowHandle,
    definition: TWorkflow,
  ): TypedWorkflowHandle<TWorkflow> {
    // Create typed queries proxy with Future/Result
    const queries = {} as TypedWorkflowHandle<TWorkflow>["queries"];
    for (const [queryName, queryDef] of Object.entries(definition.queries ?? {}) as Array<
      [string, QueryDefinition]
    >) {
      (queries as Record<string, unknown>)[queryName] = (
        args: ClientInferInput<typeof queryDef>,
      ): Future<Result<unknown, ClientErrorUnion>> => {
        return Future.make((resolve) => {
          (async () => {
            const inputResult = await queryDef.input["~standard"].validate(args);
            if (inputResult.issues) {
              resolve(
                Result.Error(new QueryValidationError(queryName, "input", inputResult.issues)),
              );
              return;
            }

            try {
              const result = await workflowHandle.query(queryName as string, inputResult.value);

              const outputResult = await queryDef.output["~standard"].validate(result);
              if (outputResult.issues) {
                resolve(
                  Result.Error(new QueryValidationError(queryName, "output", outputResult.issues)),
                );
                return;
              }

              resolve(Result.Ok(outputResult.value));
            } catch (error) {
              resolve(Result.Error(createRuntimeClientError("query", error)));
            }
          })();
        });
      };
    }

    // Create typed signals proxy with Future/Result
    const signals = {} as TypedWorkflowHandle<TWorkflow>["signals"];
    for (const [signalName, signalDef] of Object.entries(definition.signals ?? {}) as Array<
      [string, SignalDefinition]
    >) {
      (signals as Record<string, unknown>)[signalName] = (
        args: ClientInferInput<typeof signalDef>,
      ): Future<Result<void, ClientErrorUnion>> => {
        return Future.make((resolve) => {
          (async () => {
            const inputResult = await signalDef.input["~standard"].validate(args);
            if (inputResult.issues) {
              resolve(Result.Error(new SignalValidationError(signalName, inputResult.issues)));
              return;
            }

            try {
              await workflowHandle.signal(signalName as string, inputResult.value);
              resolve(Result.Ok(undefined));
            } catch (error) {
              resolve(Result.Error(createRuntimeClientError("signal", error)));
            }
          })();
        });
      };
    }

    // Create typed updates proxy with Future/Result
    const updates = {} as TypedWorkflowHandle<TWorkflow>["updates"];
    for (const [updateName, updateDef] of Object.entries(definition.updates ?? {}) as Array<
      [string, UpdateDefinition]
    >) {
      (updates as Record<string, unknown>)[updateName] = (
        args: ClientInferInput<typeof updateDef>,
      ): Future<Result<unknown, ClientErrorUnion>> => {
        return Future.make((resolve) => {
          (async () => {
            const inputResult = await updateDef.input["~standard"].validate(args);
            if (inputResult.issues) {
              resolve(
                Result.Error(new UpdateValidationError(updateName, "input", inputResult.issues)),
              );
              return;
            }

            try {
              const result = await workflowHandle.executeUpdate(updateName as string, {
                args: [inputResult.value],
              });

              const outputResult = await updateDef.output["~standard"].validate(result);
              if (outputResult.issues) {
                resolve(
                  Result.Error(
                    new UpdateValidationError(updateName, "output", outputResult.issues),
                  ),
                );
                return;
              }

              resolve(Result.Ok(outputResult.value));
            } catch (error) {
              resolve(Result.Error(createRuntimeClientError("update", error)));
            }
          })();
        });
      };
    }

    return {
      workflowId: workflowHandle.workflowId,
      queries,
      signals,
      updates,
      result: (): Future<Result<ClientInferOutput<TWorkflow>, ClientErrorUnion>> => {
        return Future.make((resolve) => {
          (async () => {
            try {
              const result = await workflowHandle.result();
              const outputResult = await definition.output["~standard"].validate(result);
              if (outputResult.issues) {
                resolve(
                  Result.Error(
                    new WorkflowValidationError(
                      workflowHandle.workflowId,
                      "output",
                      outputResult.issues,
                    ),
                  ),
                );
                return;
              }
              resolve(Result.Ok(outputResult.value as ClientInferOutput<TWorkflow>));
            } catch (error) {
              resolve(Result.Error(createRuntimeClientError("result", error)));
            }
          })();
        });
      },
      terminate: (reason?: string): Future<Result<void, RuntimeClientError>> => {
        return Future.fromPromise(workflowHandle.terminate(reason))
          .mapError((error) => createRuntimeClientError("terminate", error))
          .mapOk(() => undefined);
      },
      cancel: (): Future<Result<void, RuntimeClientError>> => {
        return Future.fromPromise(workflowHandle.cancel())
          .mapError((error) => createRuntimeClientError("cancel", error))
          .mapOk(() => undefined);
      },
      describe: (): Future<
        Result<Awaited<ReturnType<WorkflowHandle["describe"]>>, RuntimeClientError>
      > => {
        return Future.fromPromise(workflowHandle.describe()).mapError((error) =>
          createRuntimeClientError("describe", error),
        );
      },
      fetchHistory: (): Future<
        Result<Awaited<ReturnType<WorkflowHandle["fetchHistory"]>>, RuntimeClientError>
      > => {
        return Future.fromPromise(workflowHandle.fetchHistory()).mapError((error) =>
          createRuntimeClientError("fetchHistory", error),
        );
      },
    };
  }
}

function createRuntimeClientError(operation: string, error: unknown): RuntimeClientError {
  return new RuntimeClientError(operation, error);
}

function createWorkflowNotFoundError(
  workflowName: string | number | symbol,
  contract: ContractDefinition,
): WorkflowNotFoundError {
  return new WorkflowNotFoundError(String(workflowName), Object.keys(contract.workflows));
}

function createWorkflowValidationError(
  workflowName: string | number | symbol,
  direction: "input" | "output",
  issues: ReadonlyArray<StandardSchemaV1.Issue>,
): WorkflowValidationError {
  return new WorkflowValidationError(String(workflowName), direction, issues);
}
