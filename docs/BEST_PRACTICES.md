# Best Practices

This guide provides best practices for using temporal-contract in your projects.

## Contract Design

### 1. Keep Contracts in a Shared Package

```typescript
// ✅ Good - Separate package
// packages/shared/src/contracts/order.contract.ts
export const orderContract = contract({ ... });

// ❌ Bad - In worker or client code
// workers/src/contracts.ts
```

**Why?** The contract should be the source of truth shared between client and worker.

### 2. Use Descriptive Names

```typescript
// ✅ Good
const orderContract = contract({
  workflows: {
    processOrder: workflow({ ... }),
    cancelOrder: workflow({ ... }),
  },
});

// ❌ Bad
const contract1 = contract({
  workflows: {
    wf1: workflow({ ... }),
    wf2: workflow({ ... }),
  },
});
```

### 3. Define Strict Schemas

```typescript
// ✅ Good - Explicit and strict
input: z.object({
  orderId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.enum(['USD', 'EUR', 'GBP']),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
})

// ❌ Bad - Too permissive
input: z.object({
  orderId: z.string(),
  amount: z.number(),
  items: z.array(z.any()),
})
```

**Why?** Stricter schemas catch errors earlier and provide better documentation.

### 4. Version Your Contracts

```typescript
// ✅ Good
export const orderContractV1 = contract({ ... });
export const orderContractV2 = contract({ ... });

// Or use workflow versioning
processOrder: workflow({
  input: z.object({
    version: z.literal('v2'),
    // ... rest of schema
  }),
  // ...
})
```

## Workflow Implementation

### 1. Keep Workflows Deterministic

```typescript
// ✅ Good - Using Temporal's Date.now()
import { Date } from '@temporalio/workflow';

const now = Date.now();

// ❌ Bad - Using native Date
const now = Date.now(); // Non-deterministic!
```

### 2. Use Activities for Side Effects

```typescript
// ✅ Good - Database calls in activities
const saveOrder = createActivity({
  definition: contract.activities.saveOrder,
  implementation: async (input) => {
    await db.orders.create(input);
    return { success: true };
  },
});

// ❌ Bad - Database calls in workflow
const processOrder = createWorkflow({
  definition: contract.workflows.processOrder,
  implementation: async (input) => {
    // Don't do this!
    await db.orders.create(input);
  },
});
```

### 3. Handle Activity Failures

```typescript
// ✅ Good - Proper error handling
const processOrder = createWorkflow({
  definition: contract.workflows.processOrder,
  implementation: async (input, context) => {
    try {
      const payment = await context.activities.processPayment(input);
      if (!payment.success) {
        return { status: 'failed', reason: 'payment_failed' };
      }
      return { status: 'success' };
    } catch (error) {
      // Handle or let Temporal retry
      throw error;
    }
  },
  activityOptions: {
    startToCloseTimeout: '1 minute',
    retryPolicy: {
      maximumAttempts: 3,
      initialInterval: '1s',
      backoffCoefficient: 2,
    },
  },
});
```

### 4. Set Appropriate Timeouts

```typescript
// ✅ Good - Specific timeouts
activityOptions: {
  startToCloseTimeout: '5 minutes', // Max execution time
  scheduleToStartTimeout: '1 minute', // Max queue time
  scheduleToCloseTimeout: '10 minutes', // Total time
}

// ❌ Bad - No timeouts or too long
activityOptions: {
  startToCloseTimeout: '1 hour', // Too long!
}
```

## Activity Implementation

### 1. Keep Activities Idempotent

```typescript
// ✅ Good - Idempotent
const sendEmail = createActivity({
  definition: contract.activities.sendEmail,
  implementation: async (input) => {
    // Check if already sent
    const existing = await db.emails.findByDedupeKey(input.dedupeKey);
    if (existing) {
      return { messageId: existing.messageId };
    }
    
    const messageId = await emailService.send(input);
    await db.emails.create({ ...input, messageId });
    return { messageId };
  },
});

// ❌ Bad - Not idempotent
const sendEmail = createActivity({
  implementation: async (input) => {
    // Will send multiple times on retry!
    return await emailService.send(input);
  },
});
```

### 2. Use Heartbeats for Long Activities

```typescript
// ✅ Good - Heartbeats for long operations
import { heartbeat } from '@temporalio/activity';

const processLargeFile = createActivity({
  definition: contract.activities.processLargeFile,
  implementation: async (input) => {
    for (let i = 0; i < input.totalChunks; i++) {
      await processChunk(i);
      heartbeat(i); // Report progress
    }
    return { success: true };
  },
});
```

### 3. Log Appropriately

```typescript
// ✅ Good - Structured logging
const processPayment = createActivity({
  definition: contract.activities.processPayment,
  implementation: async (input) => {
    console.log('Processing payment', {
      customerId: input.customerId,
      amount: input.amount,
      // Don't log sensitive data!
    });
    
    const result = await paymentGateway.charge(input);
    
    console.log('Payment processed', {
      transactionId: result.transactionId,
      success: result.success,
    });
    
    return result;
  },
});
```

## Client Usage

### 1. Use Unique Workflow IDs

```typescript
// ✅ Good - Unique and meaningful
const workflowId = `order-${orderId}-${Date.now()}`;

// ❌ Bad - Can cause conflicts
const workflowId = 'order-123';
```

### 2. Handle Workflow Errors

```typescript
// ✅ Good - Proper error handling
try {
  const result = await client.executeWorkflow('processOrder', {
    workflowId: `order-${orderId}`,
    taskQueue: 'orders',
    input: orderData,
  });
  
  if (result.status === 'failed') {
    // Handle business failure
    console.error('Order processing failed', result);
  }
} catch (error) {
  // Handle technical failure
  if (error instanceof WorkflowFailedError) {
    console.error('Workflow failed', error);
  }
}
```

### 3. Use Appropriate Task Queues

```typescript
// ✅ Good - Specific task queues
await client.executeWorkflow('processOrder', {
  taskQueue: 'orders-high-priority',
  // ...
});

await client.executeWorkflow('generateReport', {
  taskQueue: 'reports-low-priority',
  // ...
});

// ❌ Bad - Single task queue for everything
await client.executeWorkflow('anything', {
  taskQueue: 'default',
  // ...
});
```

## Testing

### 1. Test Contracts Separately

```typescript
// ✅ Good - Test schema validation
describe('orderContract', () => {
  it('validates valid input', () => {
    const input = {
      orderId: 'ORD-123',
      items: [{ productId: 'PROD-1', quantity: 1 }],
    };
    
    expect(() => 
      orderContract.workflows.processOrder.input.parse(input)
    ).not.toThrow();
  });
  
  it('rejects invalid input', () => {
    const input = { orderId: 'ORD-123' }; // Missing items
    
    expect(() =>
      orderContract.workflows.processOrder.input.parse(input)
    ).toThrow();
  });
});
```

### 2. Use Mocks for Testing

```typescript
// ✅ Good - Mock client for unit tests
const mockClient = {
  executeWorkflow: jest.fn().mockResolvedValue({
    status: 'success',
    totalAmount: 100,
  }),
};

// Test your application code
const result = await processOrderRequest(mockClient, orderData);
expect(result.success).toBe(true);
```

## Performance

### 1. Batch Activities When Possible

```typescript
// ✅ Good - Batch operations
const items = await context.activities.batchProcessItems({
  items: input.items,
});

// ❌ Bad - Loop with activities
for (const item of input.items) {
  await context.activities.processItem(item); // Slow!
}
```

### 2. Use Parallel Execution

```typescript
// ✅ Good - Parallel activities
const [payment, inventory, shipping] = await Promise.all([
  context.activities.processPayment(input),
  context.activities.checkInventory(input),
  context.activities.calculateShipping(input),
]);

// ❌ Bad - Sequential when not needed
const payment = await context.activities.processPayment(input);
const inventory = await context.activities.checkInventory(input);
const shipping = await context.activities.calculateShipping(input);
```

## Security

### 1. Don't Log Sensitive Data

```typescript
// ✅ Good - Redacted logging
console.log('Processing payment', {
  customerId: input.customerId,
  amount: input.amount,
  cardLast4: input.cardNumber.slice(-4),
});

// ❌ Bad - Logging sensitive data
console.log('Processing payment', input); // Contains full card number!
```

### 2. Validate All Inputs

```typescript
// ✅ Good - Contract handles validation
const processOrder = createWorkflow({
  definition: contract.workflows.processOrder,
  // Input is already validated by Zod
  implementation: async (input) => { ... },
});

// No need for manual validation!
```

## Documentation

### 1. Document Your Contracts

```typescript
// ✅ Good - Well documented
/**
 * Order processing contract
 * 
 * Handles the complete order lifecycle from validation to fulfillment.
 */
export const orderContract = contract({
  workflows: {
    /**
     * Process a new order
     * 
     * @workflow
     * Steps:
     * 1. Validate inventory
     * 2. Process payment
     * 3. Ship order
     * 4. Send confirmation
     */
    processOrder: workflow({ ... }),
  },
});
```

### 2. Keep Examples Updated

```typescript
// ✅ Good - Include usage examples
/**
 * @example
 * ```typescript
 * const result = await client.executeWorkflow('processOrder', {
 *   workflowId: 'order-123',
 *   taskQueue: 'orders',
 *   input: {
 *     orderId: 'ORD-123',
 *     items: [{ productId: 'PROD-1', quantity: 2 }],
 *   },
 * });
 * ```
 */
```

## Summary

- ✅ Design contracts as the single source of truth
- ✅ Keep workflows deterministic
- ✅ Use activities for side effects
- ✅ Make activities idempotent
- ✅ Set appropriate timeouts and retries
- ✅ Handle errors gracefully
- ✅ Test thoroughly
- ✅ Document well
- ✅ Never log sensitive data
