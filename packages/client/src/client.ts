import { Client, WorkflowHandle } from "@temporalio/client";
import { Entries } from "type-fest";
import type { ClientOptions } from "@temporalio/client";
import type {
  ContractDefinition,
  InferInput,
  InferOutput,
  InferWorkflowQueries,
  InferWorkflowSignals,
  InferWorkflowUpdates,
  WorkflowDefinition,
} from "@temporal-contract/core";

declare global {
  interface ObjectConstructor {
    entries<T extends object>(o: T): Entries<T>;
  }
}

/**
 * Typed workflow handle with validated results, queries, signals and updates
 */
export interface TypedWorkflowHandle<TWorkflow extends WorkflowDefinition> {
  workflowId: string;

  /**
   * Type-safe queries based on workflow definition
   */
  queries: InferWorkflowQueries<TWorkflow>;

  /**
   * Type-safe signals based on workflow definition
   */
  signals: InferWorkflowSignals<TWorkflow>;

  /**
   * Type-safe updates based on workflow definition
   */
  updates: InferWorkflowUpdates<TWorkflow>;

  result: () => Promise<InferOutput<TWorkflow>>;
  terminate: (reason?: string) => Promise<void>;
  cancel: () => Promise<void>;
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
   * });
   *
   * const result = await handle.result();
   * ```
   */
  async startWorkflow<TWorkflowName extends keyof TContract["workflows"] & string>(
    workflowName: TWorkflowName,
    options: {
      workflowId: string;
      args: InferInput<TContract["workflows"][TWorkflowName]>;
    },
  ): Promise<TypedWorkflowHandle<TContract["workflows"][TWorkflowName]>> {
    const definition = this.contract.workflows[workflowName];

    if (!definition) {
      throw new Error(`Workflow definition not found for: ${workflowName}`);
    }

    // Validate input with Zod schema (tuple)
    const validatedInput = definition.input.parse(options.args);

    // Start workflow (Temporal expects args as array, so wrap single parameter)
    const handle = await this.client.workflow.start(workflowName, {
      workflowId: options.workflowId,
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
   * });
   *
   * console.log(result.status); // fully typed!
   * ```
   */
  async executeWorkflow<TWorkflowName extends keyof TContract["workflows"] & string>(
    workflowName: TWorkflowName,
    options: {
      workflowId: string;
      args: InferInput<TContract["workflows"][TWorkflowName]>;
    },
  ): Promise<InferOutput<TContract["workflows"][TWorkflowName]>> {
    const definition = this.contract.workflows[workflowName];

    if (!definition) {
      throw new Error(`Workflow definition not found for: ${workflowName}`);
    }

    // Validate input with Zod schema
    const validatedInput = definition.input.parse(options.args);

    // Execute workflow (Temporal expects args as array, so wrap single parameter)
    const result = await this.client.workflow.execute(workflowName, {
      workflowId: options.workflowId,
      taskQueue: this.contract.taskQueue,
      args: [validatedInput],
    });

    // Validate output with Zod schema
    return definition.output.parse(result) as InferOutput<TContract["workflows"][TWorkflowName]>;
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
  async getHandle<TWorkflowName extends keyof TContract["workflows"] & string>(
    workflowName: TWorkflowName,
    workflowId: string,
  ): Promise<TypedWorkflowHandle<TContract["workflows"][TWorkflowName]>> {
    const definition = this.contract.workflows[workflowName];

    if (!definition) {
      throw new Error(`Workflow definition not found for: ${workflowName}`);
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
    const queries = {} as InferWorkflowQueries<TWorkflow>;
    if (definition.queries) {
      for (const [queryName, queryDef] of Object.entries(definition.queries)) {
        // @ts-expect-error fixme later
        queries[queryName] = async (args: InferInput<typeof queryDef>) => {
          const validatedInput = queryDef.input.parse(args);
          const result = await handle.query(queryName, validatedInput);
          return queryDef.output.parse(result);
        };
      }
    }

    // Create typed signals proxy
    const signals = {} as InferWorkflowSignals<TWorkflow>;
    if (definition.signals) {
      for (const [signalName, signalDef] of Object.entries(definition.signals)) {
        // @ts-expect-error fixme later
        signals[signalName] = async (args: InferInput<typeof signalDef>) => {
          const validatedInput = signalDef.input.parse(args);
          await handle.signal(signalName, validatedInput);
        };
      }
    }

    // Create typed updates proxy
    const updates = {} as InferWorkflowUpdates<TWorkflow>;
    if (definition.updates) {
      for (const [updateName, updateDef] of Object.entries(definition.updates)) {
        // @ts-expect-error fixme later
        updates[updateName] = async (args: InferInput<typeof updateDef>) => {
          const validatedInput = updateDef.input.parse(args);
          const result = await handle.executeUpdate(updateName, { args: [validatedInput] });
          return updateDef.output.parse(result);
        };
      }
    }

    return {
      workflowId: handle.workflowId,
      queries,
      signals,
      updates,
      result: async () => {
        const result = await handle.result();
        // Validate output with Zod schema
        return definition.output.parse(result) as InferOutput<TWorkflow>;
      },
      terminate: async (reason?: string) => {
        await handle.terminate(reason);
      },
      cancel: async () => {
        await handle.cancel();
      },
    };
  }
}
