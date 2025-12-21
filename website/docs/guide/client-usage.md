# Client Usage

Learn how to use the typed client to execute workflows with full type safety.

## Overview

The `@temporal-contract/client` package provides a type-safe wrapper around Temporal's client that enforces your contract definitions at compile time.

## Installation

```bash
pnpm add @temporal-contract/client @swan-io/boxed
```

## Basic Setup

```typescript
import { Connection, Client } from '@temporalio/client';
import { TypedClient } from '@temporal-contract/client';
import { myContract } from './contract';

// Connect to Temporal
const connection = await Connection.connect({
  address: 'localhost:7233',
});

// Create Temporal client and typed client
const temporalClient = new Client({ connection });
const client = TypedClient.create(myContract, temporalClient);
```

## Executing Workflows

### Basic Execution

Execute a workflow and wait for completion:

```typescript
const result = await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  args: {
    orderId: 'ORD-123',
    customerId: 'CUST-456',
  },
});

// Result is fully typed from your contract!
console.log(result.status); // TypeScript knows the shape
```

### Start Without Waiting

Start a workflow without waiting for completion:

```typescript
const handle = await client.startWorkflow('processOrder', {
  workflowId: 'order-123',
  args: {
    orderId: 'ORD-123',
    customerId: 'CUST-456',
  },
});

// Get workflow ID
console.log('Started workflow:', handle.workflowId);

// Wait for result later
const result = await handle.result();
```

## Type Safety

The typed client provides compile-time safety:

```typescript
// ✅ Correct - TypeScript validates args
await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  args: {
    orderId: 'ORD-123',
    customerId: 'CUST-456',
  },
});

// ❌ Error - Missing required field
await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  args: {
    orderId: 'ORD-123',
    // customerId is missing - TypeScript error!
  },
});

// ❌ Error - Wrong workflow name
await client.executeWorkflow('invalidWorkflow', {
  workflowId: 'order-123',
  args: { /* ... */ },
});
```

## Result/Future Pattern

The client uses `@swan-io/boxed` for explicit error handling:

```typescript
import { Result } from '@swan-io/boxed';

const result = await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  args: { orderId: 'ORD-123', customerId: 'CUST-456' },
});

// Handle result with pattern matching
result.match({
  Ok: (value) => {
    console.log('Order processed:', value.transactionId);
  },
  Error: (error) => {
    console.error('Order failed:', error);
  },
});
```

## Workflow Options

Pass standard Temporal workflow options:

```typescript
await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  args: { orderId: 'ORD-123', customerId: 'CUST-456' },
  
  // Standard Temporal options
  taskQueue: 'orders', // Override task queue
  workflowExecutionTimeout: '1 hour',
  workflowRunTimeout: '30 minutes',
  retry: {
    maximumAttempts: 3,
  },
  memo: {
    description: 'Customer order processing',
  },
  searchAttributes: {
    CustomerId: ['CUST-456'],
  },
});
```

## Getting Workflow Handle

Get a handle to an existing workflow:

```typescript
const handle = client.getHandle('order-123');

// Query the workflow
const status = await handle.query('getStatus');

// Signal the workflow
await handle.signal('cancelOrder', { reason: 'Customer request' });

// Get the result
const result = await handle.result();
```

## Multiple Workflows

The same client can execute any workflow in the contract:

```typescript
const orderResult = await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  args: { orderId: 'ORD-123', customerId: 'CUST-456' },
});

const refundResult = await client.executeWorkflow('processRefund', {
  workflowId: 'refund-123',
  args: { orderId: 'ORD-123', reason: 'Damaged item' },
});
```

## Error Handling

### Workflow Execution Errors

```typescript
const result = await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  args: { orderId: 'ORD-123', customerId: 'CUST-456' },
});

result.match({
  Ok: (value) => console.log('Success:', value),
  Error: (error) => console.error('Workflow returned error:', error),
});
```

### Workflow Failures

```typescript
import { WorkflowFailedError } from '@temporalio/client';

try {
  await client.executeWorkflow('processOrder', {
    workflowId: 'order-123',
    args: { orderId: 'ORD-123', customerId: 'CUST-456' },
  });
} catch (error) {
  if (error instanceof WorkflowFailedError) {
    console.error('Workflow failed:', error.message);
    console.error('Cause:', error.cause);
  }
}
```

## Connection Management

### Single Connection

Reuse connections across clients:

```typescript
const connection = await Connection.connect({
  address: 'localhost:7233',
});

const temporalClient = new Client({ connection });

const orderClient = TypedClient.create(orderContract, temporalClient);
const inventoryClient = TypedClient.create(inventoryContract, temporalClient);

// Both clients share the same connection and Temporal client instance
```

### Connection Pooling

For high-throughput applications:

```typescript
const connection = await Connection.connect({
  address: 'localhost:7233',
  // Connection pool settings
  maxConcurrentWorkflowTaskPollers: 10,
  maxConcurrentActivityTaskPollers: 20,
});
```

### Closing Connections

```typescript
// Close connection when done
await connection.close();
```

## Working with Multiple Contracts

Different clients for different contracts:

```typescript
import { orderContract } from './contracts/order';
import { paymentContract } from './contracts/payment';
import { inventoryContract } from './contracts/inventory';

const temporalClient = new Client({ connection });

const orderClient = TypedClient.create(orderContract, temporalClient);
const paymentClient = TypedClient.create(paymentContract, temporalClient);
const inventoryClient = TypedClient.create(inventoryContract, temporalClient);

// Each client is typed to its contract
await orderClient.executeWorkflow('processOrder', { /* ... */ });
await paymentClient.executeWorkflow('processPayment', { /* ... */ });
await inventoryClient.executeWorkflow('updateStock', { /* ... */ });
```

## Testing

Mock the client for testing:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { Result } from '@swan-io/boxed';

describe('OrderService', () => {
  it('should process order', async () => {
    const mockClient = {
      executeWorkflow: vi.fn().mockResolvedValue(
        Result.Ok({ status: 'success', transactionId: 'tx-123' })
      ),
    };

    const service = new OrderService(mockClient);
    const result = await service.createOrder({
      orderId: 'ORD-123',
      customerId: 'CUST-456',
    });

    expect(mockClient.executeWorkflow).toHaveBeenCalledWith(
      'processOrder',
      expect.objectContaining({
        args: { orderId: 'ORD-123', customerId: 'CUST-456' },
      })
    );
  });
});
```

## Best Practices

### 1. Reuse Connections

```typescript
// ✅ Good - single connection
const connection = await Connection.connect({ address: 'localhost:7233' });
const temporalClient = new Client({ connection });
const client = TypedClient.create(contract, temporalClient);

// ❌ Avoid - creating connections repeatedly
for (const order of orders) {
  const connection = await Connection.connect({ address: 'localhost:7233' });
  const temporalClient = new Client({ connection });
  const client = TypedClient.create(contract, temporalClient);
  await client.executeWorkflow(/* ... */);
}
```

### 2. Use Meaningful Workflow IDs

```typescript
// ✅ Good - descriptive and unique
workflowId: `order-${orderId}-${Date.now()}`

// ❌ Avoid - random or non-descriptive
workflowId: Math.random().toString()
```

### 3. Handle Both Success and Error Cases

```typescript
// ✅ Good - handle all cases
const result = await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  args: { orderId: 'ORD-123', customerId: 'CUST-456' },
});

result.match({
  Ok: (value) => {
    // Handle success
    updateDatabase(value);
  },
  Error: (error) => {
    // Handle error
    logError(error);
    notifySupport(error);
  },
});
```

## See Also

- [Defining Contracts](/guide/defining-contracts) - Creating your contract definitions
- [Worker Usage](/guide/worker-usage) - Implementing workflows and activities
- [Result Pattern](/guide/result-pattern) - Understanding Result/Future error handling
- [API Reference](/api/client) - Complete client API documentation
