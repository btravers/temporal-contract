import { Connection, Client } from '@temporalio/client';
/**
 * Typed Temporal client based on a contract
 *
 * Provides type-safe methods to start and execute workflows
 * defined in the contract.
 */
export class TypedClient {
    contract;
    client;
    constructor(contract, client) {
        this.contract = contract;
        this.client = client;
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
    async startWorkflow(workflowName, options) {
        const definition = this.contract.workflows[workflowName];
        // Validate input with Zod schema (tuple)
        const validatedInput = definition.input.parse(options.args);
        // Start workflow
        const handle = await this.client.workflow.start(workflowName, {
            workflowId: options.workflowId,
            taskQueue: this.contract.taskQueue,
            args: validatedInput,
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
    async executeWorkflow(workflowName, options) {
        const definition = this.contract.workflows[workflowName];
        // Validate input with Zod schema (tuple)
        const validatedInput = definition.input.parse(options.args);
        // Execute workflow
        const result = await this.client.workflow.execute(workflowName, {
            workflowId: options.workflowId,
            taskQueue: this.contract.taskQueue,
            args: validatedInput,
        });
        // Validate output with Zod schema
        return definition.output.parse(result);
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
    async getHandle(workflowName, workflowId) {
        const definition = this.contract.workflows[workflowName];
        const handle = this.client.workflow.getHandle(workflowId);
        return this.createTypedHandle(handle, definition);
    }
    createTypedHandle(handle, definition) {
        return {
            workflowId: handle.workflowId,
            result: async () => {
                const result = await handle.result();
                // Validate output with Zod schema
                return definition.output.parse(result);
            },
            query: (queryType, ...args) => handle.query(queryType, ...args),
            signal: (signalName, ...args) => handle.signal(signalName, ...args),
            terminate: async (reason) => {
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
export async function createClient(contract, options = {}) {
    const connection = options.connection || (await Connection.connect());
    const client = new Client({
        connection,
        namespace: options.namespace,
    });
    return new TypedClient(contract, client);
}
