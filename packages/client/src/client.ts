import { Client, WorkflowHandle } from "@temporalio/client";
import type { ClientOptions } from "@temporalio/client";
import type {
  ContractDefinition,
  InferOutput,
  WorkflowDefinition,
} from "@temporal-contract/core";

/**
 * Typed workflow handle with validated results
 */
export interface TypedWorkflowHandle<TWorkflow extends WorkflowDefinition> {
  workflowId: string;
  result: () => Promise<InferOutput<TWorkflow>>;
  query: <TQuery>(queryType: string, ...args: unknown[]) => Promise<TQuery>;
  signal: (signalName: string, ...args: unknown[]) => Promise<void>;
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
      args: any; // Use 'any' due to TypeScript generic limitations with Zod tuple inference
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

    return this.createTypedHandle(handle, definition);
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
      args: any; // Use 'any' due to TypeScript generic limitations with Zod tuple inference
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
    return this.createTypedHandle(handle, definition);
  }

  private createTypedHandle<TWorkflow extends WorkflowDefinition>(
    handle: WorkflowHandle,
    definition: TWorkflow,
  ): TypedWorkflowHandle<TWorkflow> {
    return {
      workflowId: handle.workflowId,
      result: async () => {
        const result = await handle.result();
        // Validate output with Zod schema
        return definition.output.parse(result) as InferOutput<TWorkflow>;
      },
      query: (queryType: string, ...args: unknown[]) => handle.query(queryType, ...args),
      signal: (signalName: string, ...args: unknown[]) => handle.signal(signalName, ...args),
      terminate: async (reason?: string) => {
        await handle.terminate(reason);
      },
      cancel: async () => {
        await handle.cancel();
      },
    };
  }
}
