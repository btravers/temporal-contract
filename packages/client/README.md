# @temporal-contract/client

> Type-safe client for consuming Temporal workflows

## Installation

```bash
pnpm add @temporal-contract/client @temporal-contract/contract @temporalio/client zod
```

## Quick Start

```typescript
import { Connection } from '@temporalio/client';
import { TypedClient } from '@temporal-contract/client';
import { myContract } from './contract';

// Connect to Temporal
const connection = await Connection.connect({ address: 'localhost:7233' });

// Create typed client
const client = TypedClient.create(myContract, {
  connection,
  namespace: 'default',
});

// Execute workflow (fully typed!)
const result = await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  args: { orderId: 'ORD-123', customerId: 'CUST-456' },
});

console.log(result.status);  // 'success' | 'failed' — typed!
```

## API

### `TypedClient.create(contract, options)`

Creates a type-safe Temporal client.

**Returns:** Type-safe client with these methods:

#### `executeWorkflow(name, options)`

Execute and wait for result:

```typescript
const result = await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  args: { orderId: 'ORD-123', customerId: 'CUST-456' },
});
```

#### `startWorkflow(name, options)` / `getHandle(name, workflowId)`

Get a typed workflow handle for signals/queries/updates:

```typescript
const handle = await client.startWorkflow('processOrder', {
  workflowId: 'order-456',
  args: { orderId: 'ORD-456' },
});

// Type-safe queries, signals, updates
await handle.queries.getStatus();
await handle.signals.cancel({ reason: 'Customer request' });
await handle.updates.changeAmount({ newAmount: 150 });
```

## Error Handling

Custom error classes with contextual information:

```typescript
import { WorkflowValidationError, WorkflowNotFoundError } from '@temporal-contract/client';

try {
  await client.executeWorkflow('processOrder', { args: invalidData });
} catch (error) {
  if (error instanceof WorkflowValidationError) {
    console.error('Validation:', error.zodError.errors);
  } else if (error instanceof WorkflowNotFoundError) {
    console.error('Available:', error.availableWorkflows);
  }
}
```

---

## Learn More

- [Main README](../../README.md) — Quick start guide
- [Worker Implementation](../../docs/CONTRACT_HANDLER.md) — Implementing workers

## License

MIT
