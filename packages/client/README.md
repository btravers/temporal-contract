# @temporal-contract/client

Client utilities for consuming temporal-contract workflows.

## Installation

```bash
pnpm add @temporal-contract/client @temporal-contract/contract @temporalio/client zod
```

## Usage

```typescript
import { Connection } from '@temporalio/client';
import { TypedClient } from '@temporal-contract/client';
import { myContract } from './contract';

// Connect to Temporal
const connection = await Connection.connect({
  address: 'localhost:7233',
});

// Create a typed client
const client = TypedClient.create(myContract, {
  connection,
  namespace: 'default',
});

// Execute a workflow with full type safety
const result = await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  args: {
    orderId: 'ORD-123',
    items: [{ productId: 'PROD-1', quantity: 2 }]
  },
});

// Result is fully typed!
console.log(result.status); // 'success' | 'failed'
console.log(result.totalAmount); // number

// Get a workflow handle with typed queries, signals, and updates
const handle = await client.startWorkflow('processOrder', {
  workflowId: 'order-456',
  args: {
    orderId: 'ORD-456',
    items: [{ productId: 'PROD-2', quantity: 1 }]
  },
});

// Use typed queries (if defined in the workflow)
const status = await handle.queries.getStatus();

// Use typed signals (if defined in the workflow)
await handle.signals.addItem({ productId: 'PROD-3', quantity: 1 });

// Use typed updates (if defined in the workflow)
const updatedTotal = await handle.updates.updateDiscount({ percentage: 10 });
```

## Features

- ✅ Automatic input validation with Zod schemas
- ✅ Automatic output validation with Zod schemas
- ✅ Full TypeScript type inference
- ✅ Autocomplete for workflow names and inputs
- ✅ Type-safe queries, signals, and updates
- ✅ Single parameter pattern for workflows and activities

## API

### `TypedClient.create(contract, options)`

Creates a typed Temporal client from a contract.

**Parameters:**

- `contract` - The contract definition
- `options` - Native Temporal `ClientOptions` (connection, namespace, dataConverter, etc.)

**Returns:** `TypedClient<T>`

### Client Methods

#### `executeWorkflow(name, options)`

Execute a workflow and wait for the result.

**Parameters:**

- `name` - The workflow name (type-checked against contract)
- `options.workflowId` - Unique workflow ID
- `options.args` - Workflow input (validated with Zod schema)

**Returns:** `Promise<InferOutput<Workflow>>`

#### `startWorkflow(name, options)`

Start a workflow and get a typed handle.

**Parameters:**

- `name` - The workflow name (type-checked against contract)
- `options.workflowId` - Unique workflow ID
- `options.args` - Workflow input (validated with Zod schema)

**Returns:** `Promise<TypedWorkflowHandle<Workflow>>`

#### `getHandle(name, workflowId)`

Get a handle to an existing workflow.

**Parameters:**

- `name` - The workflow name (type-checked against contract)
- `workflowId` - The workflow ID

**Returns:** `Promise<TypedWorkflowHandle<Workflow>>`

### TypedWorkflowHandle

A typed workflow handle provides:

- `workflowId: string` - The workflow ID
- `result(): Promise<Output>` - Wait for the workflow result (validated)
- `describe(): Promise<WorkflowExecutionDescription>` - Get workflow execution description
- `fetchHistory(): Promise<History>` - Get workflow execution history
- `queries: { [name: string]: (args) => Promise<Output> }` - Type-safe queries
- `signals: { [name: string]: (args) => Promise<void> }` - Type-safe signals
- `updates: { [name: string]: (args) => Promise<Output> }` - Type-safe updates
- `terminate(reason?: string): Promise<void>` - Terminate the workflow
- `cancel(): Promise<void>` - Cancel the workflow

All queries, signals, and updates are validated with their Zod schemas.

## Error Handling

The client package provides custom error classes for better error handling:

### Error Classes

- **`ClientError`** - Base error class for all client errors
- **`WorkflowNotFoundError`** - Thrown when a workflow is not found in the contract
- **`WorkflowValidationError`** - Thrown when workflow input/output validation fails
- **`QueryValidationError`** - Thrown when query input/output validation fails
- **`SignalValidationError`** - Thrown when signal input validation fails
- **`UpdateValidationError`** - Thrown when update input/output validation fails

### Example

```typescript
import {
  WorkflowValidationError,
  WorkflowNotFoundError
} from '@temporal-contract/client';

try {
  const result = await client.executeWorkflow('processOrder', {
    workflowId: 'order-123',
    args: { orderId: 'ORD-123', items: [] }
  });
} catch (error) {
  if (error instanceof WorkflowValidationError) {
    console.error('Validation failed:', error.zodError.errors);
  } else if (error instanceof WorkflowNotFoundError) {
    console.error('Workflow not found:', error.workflowName);
    console.error('Available workflows:', error.availableWorkflows);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## License

MIT
