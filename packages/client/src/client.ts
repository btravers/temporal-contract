import type { ClientOptions, WorkflowHandle } from "@temporalio/client";
import type {
  ClientInferInput,
  ClientInferOutput,
  ClientInferWorkflowQueries,
  ClientInferWorkflowSignals,
  ClientInferWorkflowUpdates,
  ContractDefinition,
  WorkflowDefinition,
} from "@temporal-contract/contract";
import {
  TypedClientBoxed,
  type TypedWorkflowStartOptions,
  type TypedWorkflowHandleBoxed,
  type TypedClientBoxedError,
  type Future,
  type Result,
} from "@temporal-contract/client-boxed";

// Re-export TypedWorkflowStartOptions for convenience
export type { TypedWorkflowStartOptions };

/**
 * Typed workflow handle with validated results, queries, signals and updates
 */
export interface TypedWorkflowHandle<TWorkflow extends WorkflowDefinition> {
  workflowId: string;

  /**
   * Type-safe queries based on workflow definition
   */
  queries: ClientInferWorkflowQueries<TWorkflow>;

  /**
   * Type-safe signals based on workflow definition
   */
  signals: ClientInferWorkflowSignals<TWorkflow>;

  /**
   * Type-safe updates based on workflow definition
   */
  updates: ClientInferWorkflowUpdates<TWorkflow>;

  result: () => Promise<ClientInferOutput<TWorkflow>>;
  terminate: (reason?: string) => Promise<void>;
  cancel: () => Promise<void>;

  /**
   * Get workflow execution description including status and metadata
   *
   * @example
   * ```ts
   * const handle = await client.getHandle('processOrder', 'order-123');
   * const description = await handle.describe();
   * console.log(description.workflowExecutionInfo.status); // RUNNING, COMPLETED, etc.
   * ```
   */
  describe: () => ReturnType<WorkflowHandle["describe"]>;

  /**
   * Fetch the workflow execution history
   *
   * @example
   * ```ts
   * const handle = await client.getHandle('processOrder', 'order-123');
   * const history = handle.fetchHistory();
   * for await (const event of history) {
   *   console.log(event);
   * }
   * ```
   */
  fetchHistory: () => ReturnType<WorkflowHandle["fetchHistory"]>;
}

/**
 * Typed Temporal client based on a contract
 *
 * Provides type-safe methods to start and execute workflows
 * defined in the contract. This client wraps TypedClientBoxed
 * and provides a Promise-based API for easier use.
 */
export class TypedClient<TContract extends ContractDefinition> {
  private readonly boxedClient: TypedClientBoxed<TContract>;

  private constructor(boxedClient: TypedClientBoxed<TContract>) {
    this.boxedClient = boxedClient;
  }

  /**
   * Create a typed Temporal client from a contract
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
   *   args: [...],
   * });
   * ```
   */
  static create<TContract extends ContractDefinition>(
    contract: TContract,
    options: ClientOptions,
  ): TypedClient<TContract> {
    const boxedClient = TypedClientBoxed.create(contract, options);
    return new TypedClient(boxedClient);
  }

  /**
   * Start a workflow and return a typed handle
   *
   * @example
   * ```ts
   * const handle = await client.startWorkflow('processOrder', {
   *   workflowId: 'order-123',
   *   args: ['ORD-123', 'CUST-456', [{ productId: 'PROD-1', quantity: 2 }]],
   *   workflowExecutionTimeout: '1 day',
   *   retry: { maximumAttempts: 3 },
   * });
   *
   * const result = await handle.result();
   * ```
   */
  async startWorkflow<TWorkflowName extends keyof TContract["workflows"]>(
    workflowName: TWorkflowName,
    options: TypedWorkflowStartOptions & {
      args: ClientInferInput<TContract["workflows"][TWorkflowName]>;
    },
  ): Promise<TypedWorkflowHandle<TContract["workflows"][TWorkflowName]>> {
    const boxedHandle = await this.boxedClient
      .startWorkflow(workflowName, options)
      .resultToPromise();
    return this.wrapBoxedHandle(boxedHandle);
  }

  /**
   * Execute a workflow (start and wait for result)
   *
   * @example
   * ```ts
   * const result = await client.executeWorkflow('processOrder', {
   *   workflowId: 'order-123',
   *   args: ['ORD-123', 'CUST-456', [{ productId: 'PROD-1', quantity: 2 }]],
   *   workflowExecutionTimeout: '1 day',
   *   retry: { maximumAttempts: 3 },
   * });
   *
   * console.log(result.status); // fully typed!
   * ```
   */
  async executeWorkflow<TWorkflowName extends keyof TContract["workflows"]>(
    workflowName: TWorkflowName,
    options: TypedWorkflowStartOptions & {
      args: ClientInferInput<TContract["workflows"][TWorkflowName]>;
    },
  ): Promise<ClientInferOutput<TContract["workflows"][TWorkflowName]>> {
    return this.boxedClient.executeWorkflow(workflowName, options).resultToPromise();
  }

  /**
   * Get a handle to an existing workflow
   *
   * @example
   * ```ts
   * const handle = await client.getHandle('processOrder', 'order-123');
   * const result = await handle.result();
   * ```
   */
  async getHandle<TWorkflowName extends keyof TContract["workflows"]>(
    workflowName: TWorkflowName,
    workflowId: string,
  ): Promise<TypedWorkflowHandle<TContract["workflows"][TWorkflowName]>> {
    const boxedHandle = await this.boxedClient
      .getHandle(workflowName, workflowId)
      .resultToPromise();
    return this.wrapBoxedHandle(boxedHandle);
  }

  private wrapBoxedHandle<TWorkflow extends WorkflowDefinition>(
    boxedHandle: TypedWorkflowHandleBoxed<TWorkflow>,
  ): TypedWorkflowHandle<TWorkflow> {
    // Create typed queries proxy
    const queries = {} as ClientInferWorkflowQueries<TWorkflow>;
    for (const [queryName, queryFn] of Object.entries(boxedHandle.queries)) {
      (queries as Record<string, unknown>)[queryName] = (args: unknown) => {
        return (queryFn as (...args: unknown[]) => Future<Result<unknown, TypedClientBoxedError>>)(
          args,
        ).resultToPromise();
      };
    }

    // Create typed signals proxy
    const signals = {} as ClientInferWorkflowSignals<TWorkflow>;
    for (const [signalName, signalFn] of Object.entries(boxedHandle.signals)) {
      (signals as Record<string, unknown>)[signalName] = (args: unknown) => {
        return (signalFn as (...args: unknown[]) => Future<Result<void, TypedClientBoxedError>>)(
          args,
        ).resultToPromise();
      };
    }

    // Create typed updates proxy
    const updates = {} as ClientInferWorkflowUpdates<TWorkflow>;
    for (const [updateName, updateFn] of Object.entries(boxedHandle.updates)) {
      (updates as Record<string, unknown>)[updateName] = (args: unknown) => {
        return (updateFn as (...args: unknown[]) => Future<Result<unknown, TypedClientBoxedError>>)(
          args,
        ).resultToPromise();
      };
    }

    const typedHandle: TypedWorkflowHandle<TWorkflow> = {
      workflowId: boxedHandle.workflowId,
      queries,
      signals,
      updates,
      result: () => {
        return boxedHandle.result().resultToPromise();
      },
      terminate: (reason?: string) => {
        return boxedHandle.terminate(reason).resultToPromise();
      },
      cancel: () => {
        return boxedHandle.cancel().resultToPromise();
      },
      describe: () => {
        return boxedHandle.describe().resultToPromise();
      },
      fetchHistory: () => boxedHandle.fetchHistory(),
    };

    return typedHandle;
  }
}
