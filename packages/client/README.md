# @temporal-contract/client

Client utilities for consuming temporal-contract workflows.

## Installation

```bash
pnpm add @temporal-contract/client @temporal-contract/contract @temporalio/client zod
```

## Usage

```typescript
import { createClient } from '@temporal-contract/client';
import { myContract } from './contract';

// Create a typed client
const client = await createClient(myContract, {
  connection: await Connection.connect(),
  namespace: 'default',
});

// Execute a workflow with full type safety
const result = await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  taskQueue: 'orders',
  input: {
    orderId: 'ORD-123',
    items: [{ productId: 'PROD-1', quantity: 2 }],
  },
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

### `createClient(contract, options?)`

Creates a typed Temporal client from a contract.

### Client Methods

#### `executeWorkflow(name, options)`

Execute a workflow and wait for the result.

#### `startWorkflow(name, options)`

Start a workflow and get a typed handle.

#### `getHandle(name, workflowId)`

Get a handle to an existing workflow.

## License

MIT
