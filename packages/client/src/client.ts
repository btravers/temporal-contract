import { Connection, Client, WorkflowHandle } from '@temporalio/client';
import type {
  ContractDefinition,
  WorkflowDefinition,
  InferInput,
  InferOutput,
} from '@temporal-contract/core';

/**
 * Options for creating a typed Temporal client
 */
export interface CreateClientOptions {
  connection?: Connection;
  namespace?: string;
}

/**
 * Typed workflow handle with validated results
 */
export interface TypedWorkflowHandle<T extends WorkflowDefinition> {
  workflowId: string;
  result: () => Promise<InferOutput<T>>;
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
export class TypedClient<T extends ContractDefinition> {
  constructor(private readonly contract: T, private readonly client: Client) {
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
  async startWorkflow<K extends keyof T['workflows'] & string>(
    workflowName: K,
    options: {
      workflowId: string;
      args: InferInput<T['workflows'][K]>;
    }
  ): Promise<TypedWorkflowHandle<T['workflows'][K]>> {
    const definition = this.contract.workflows[workflowName];
    
    if (!definition) {
      throw new Error(`Workflow definition not found for: ${workflowName}`);
    }
    
    // Validate input with Zod schema (tuple)
    const validatedInput = definition.input.parse(options.args) as any;

    // Start workflow
    const handle = await this.client.workflow.start(workflowName as string, {
      workflowId: options.workflowId,
      taskQueue: this.contract.taskQueue,
      args: validatedInput,
    });

    return this.createTypedHandle(handle, definition) as TypedWorkflowHandle<T['workflows'][K]>;
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
  async executeWorkflow<K extends keyof T['workflows'] & string>(
    workflowName: K,
    options: {
      workflowId: string;
      args: InferInput<T['workflows'][K]>;
    }
  ): Promise<InferOutput<T['workflows'][K]>> {
    const definition = this.contract.workflows[workflowName];
    
    if (!definition) {
      throw new Error(`Workflow definition not found for: ${workflowName}`);
    }
    
    // Validate input with Zod schema (tuple)
    const validatedInput = definition.input.parse(options.args) as any;

    // Execute workflow
    const result = await this.client.workflow.execute(workflowName as string, {
      workflowId: options.workflowId,
      taskQueue: this.contract.taskQueue,
      args: validatedInput,
    });

    // Validate output with Zod schema
    return definition.output.parse(result) as InferOutput<T['workflows'][K]>;
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
  async getHandle<K extends keyof T['workflows'] & string>(
    workflowName: K,
    workflowId: string
  ): Promise<TypedWorkflowHandle<T['workflows'][K]>> {
    const definition = this.contract.workflows[workflowName];
    
    if (!definition) {
      throw new Error(`Workflow definition not found for: ${workflowName}`);
    }
    
    const handle = this.client.workflow.getHandle(workflowId);
    return this.createTypedHandle(handle, definition) as TypedWorkflowHandle<T['workflows'][K]>;
  }

  private createTypedHandle<D extends WorkflowDefinition>(
    handle: WorkflowHandle,
    definition: D
  ): TypedWorkflowHandle<D> {
    return {
      workflowId: handle.workflowId,
      result: async () => {
        const result = await handle.result();
        // Validate output with Zod schema
        return definition.output.parse(result) as InferOutput<D>;
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

/**
 * Create a typed Temporal client from a contract
 * 
 * @example
 * ```ts
 * const client = await createClient(myContract, {
 *   connection: await Connection.connect(),
 *   namespace: 'default',
 * });
 * 
 * const result = await client.executeWorkflow('processOrder', {
 *   workflowId: 'order-123',
 *   input: { ... },
 * });
 * ```
 */
export async function createClient<T extends ContractDefinition>(
  contract: T,
  options: CreateClientOptions = {}
): Promise<TypedClient<T>> {
  const connection = options.connection || (await Connection.connect());
  
  const clientOptions: { connection: Connection; namespace?: string } = { connection };
  if (options.namespace !== undefined) {
    clientOptions.namespace = options.namespace;
  }
  
  const client = new Client(clientOptions);

  return new TypedClient(contract, client);
}
