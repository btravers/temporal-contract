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
  args: ['ORD-123', [{ productId: 'PROD-1', quantity: 2 }]],
});

// Result is fully typed!
console.log(result.status); // 'success' | 'failed'
console.log(result.totalAmount); // number
```

## Features

- ✅ Automatic input validation with Zod schemas
- ✅ Automatic output validation with Zod schemas
- ✅ Full TypeScript type inference
- ✅ Autocomplete for workflow names and inputs

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

#### `startWorkflow(name, options)`

Start a workflow and get a typed handle.

#### `getHandle(name, workflowId)`

Get a handle to an existing workflow.

## License

MIT
