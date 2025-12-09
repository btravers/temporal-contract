import { Client, WorkflowHandle } from "@temporalio/client";
import type { ClientOptions, WorkflowStartOptions, WorkflowOptions } from "@temporalio/client";
import { ZodError } from "zod";
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
import {
  WorkflowNotFoundError,
  WorkflowValidationError,
  QueryValidationError,
  SignalValidationError,
  UpdateValidationError,
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
 * defined in the contract.
 */
export class TypedClient<TContract extends ContractDefinition> {
  private constructor(
    private readonly contract: TContract,
    private readonly client: Client,
  ) {}

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
    const client = new Client(options);
    return new TypedClient(contract, client);
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
    {
      args,
      ...temporalOptions
    }: TypedWorkflowStartOptions & {
      args: ClientInferInput<TContract["workflows"][TWorkflowName]>;
    },
  ): Promise<TypedWorkflowHandle<TContract["workflows"][TWorkflowName]>> {
    const definition = this.contract.workflows[workflowName as string];

    if (!definition) {
      throw new WorkflowNotFoundError(String(workflowName));
    }

    // Validate input with Zod schema (tuple)
    let validatedInput: ClientInferInput<TContract["workflows"][TWorkflowName]>;
    try {
      validatedInput = definition.input.parse(args) as ClientInferInput<
        TContract["workflows"][TWorkflowName]
      >;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new WorkflowValidationError(String(workflowName), "input", error);
      }
      throw error;
    }

    // Start workflow (Temporal expects args as array, so wrap single parameter)
    const handle = await this.client.workflow.start(workflowName as string, {
      ...temporalOptions,
      taskQueue: this.contract.taskQueue,
      args: [validatedInput],
    });

    return this.createTypedHandle(handle, definition) as TypedWorkflowHandle<
      TContract["workflows"][TWorkflowName]
    >;
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
    {
      args,
      ...temporalOptions
    }: TypedWorkflowStartOptions & {
      args: ClientInferInput<TContract["workflows"][TWorkflowName]>;
    },
  ): Promise<ClientInferOutput<TContract["workflows"][TWorkflowName]>> {
    const definition = this.contract.workflows[workflowName as string];

    if (!definition) {
      throw new WorkflowNotFoundError(String(workflowName));
    }

    // Validate input with Zod schema
    let validatedInput: ClientInferInput<TContract["workflows"][TWorkflowName]>;
    try {
      validatedInput = definition.input.parse(args) as ClientInferInput<
        TContract["workflows"][TWorkflowName]
      >;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new WorkflowValidationError(String(workflowName), "input", error);
      }
      throw error;
    }

    // Execute workflow (Temporal expects args as array, so wrap single parameter)
    const result = await this.client.workflow.execute(workflowName as string, {
      ...temporalOptions,
      taskQueue: this.contract.taskQueue,
      args: [validatedInput],
    });

    // Validate output with Zod schema
    try {
      return definition.output.parse(result) as ClientInferOutput<
        TContract["workflows"][TWorkflowName]
      >;
    } catch (error) {
      if (error instanceof ZodError) {
        throw new WorkflowValidationError(String(workflowName), "output", error);
      }
      throw error;
    }
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
    const definition = this.contract.workflows[workflowName as string];

    if (!definition) {
      throw new WorkflowNotFoundError(String(workflowName));
    }

    const handle = this.client.workflow.getHandle(workflowId);
    return this.createTypedHandle(handle, definition) as TypedWorkflowHandle<
      TContract["workflows"][TWorkflowName]
    >;
  }

  private createTypedHandle<TWorkflow extends WorkflowDefinition>(
    handle: WorkflowHandle,
    definition: TWorkflow,
  ): TypedWorkflowHandle<TWorkflow> {
    // Create typed queries proxy
    const queries = {} as ClientInferWorkflowQueries<TWorkflow>;
    for (const [queryName, queryDef] of Object.entries(definition.queries ?? {}) as Array<
      [string, QueryDefinition]
    >) {
      (queries as Record<string, unknown>)[queryName] = async (
        args: ClientInferInput<typeof queryDef>,
      ) => {
        let validatedInput: ClientInferInput<typeof queryDef>;
        try {
          validatedInput = queryDef.input.parse(args) as ClientInferInput<typeof queryDef>;
        } catch (error) {
          if (error instanceof ZodError) {
            throw new QueryValidationError(queryName, "input", error);
          }
          throw error;
        }

        const result = await handle.query(queryName as string, validatedInput);

        try {
          return queryDef.output.parse(result);
        } catch (error) {
          if (error instanceof ZodError) {
            throw new QueryValidationError(queryName, "output", error);
          }
          throw error;
        }
      };
    }

    // Create typed signals proxy
    const signals = {} as ClientInferWorkflowSignals<TWorkflow>;
    for (const [signalName, signalDef] of Object.entries(definition.signals ?? {}) as Array<
      [string, SignalDefinition]
    >) {
      (signals as Record<string, unknown>)[signalName] = async (
        args: ClientInferInput<typeof signalDef>,
      ) => {
        let validatedInput: ClientInferInput<typeof signalDef>;
        try {
          validatedInput = signalDef.input.parse(args) as ClientInferInput<typeof signalDef>;
        } catch (error) {
          if (error instanceof ZodError) {
            throw new SignalValidationError(signalName, error);
          }
          throw error;
        }
        await handle.signal(signalName as string, validatedInput);
      };
    }

    // Create typed updates proxy
    const updates = {} as ClientInferWorkflowUpdates<TWorkflow>;
    for (const [updateName, updateDef] of Object.entries(definition.updates ?? {}) as Array<
      [string, UpdateDefinition]
    >) {
      (updates as Record<string, unknown>)[updateName] = async (
        args: ClientInferInput<typeof updateDef>,
      ) => {
        let validatedInput: ClientInferInput<typeof updateDef>;
        try {
          validatedInput = updateDef.input.parse(args) as ClientInferInput<typeof updateDef>;
        } catch (error) {
          if (error instanceof ZodError) {
            throw new UpdateValidationError(updateName, "input", error);
          }
          throw error;
        }

        const result = await handle.executeUpdate(updateName as string, { args: [validatedInput] });

        try {
          return updateDef.output.parse(result);
        } catch (error) {
          if (error instanceof ZodError) {
            throw new UpdateValidationError(updateName, "output", error);
          }
          throw error;
        }
      };
    }

    const typedHandle: TypedWorkflowHandle<TWorkflow> = {
      workflowId: handle.workflowId,
      queries,
      signals,
      updates,
      result: async () => {
        const result = await handle.result();
        // Validate output with Zod schema
        try {
          return definition.output.parse(result) as ClientInferOutput<TWorkflow>;
        } catch (error) {
          if (error instanceof ZodError) {
            throw new WorkflowValidationError(handle.workflowId, "output", error);
          }
          throw error;
        }
      },
      terminate: async (reason?: string) => {
        await handle.terminate(reason);
      },
      cancel: async () => {
        await handle.cancel();
      },
      describe: () => handle.describe(),
      fetchHistory: () => handle.fetchHistory(),
    };

    return typedHandle;
  }
}
