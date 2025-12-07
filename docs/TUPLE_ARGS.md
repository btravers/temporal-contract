# Multiple Arguments with Tuples

Since Temporal workflows and activities can accept multiple arguments, `temporal-contract` uses Zod tuples to define input schemas instead of single object schemas.

## Basic Example

### Defining a Contract with Multiple Arguments

```typescript
import { z } from 'zod';
import { workflow, activity, contract } from '@temporal-contract/contract';

const myContract = contract({
  workflows: {
    processOrder: workflow({
      // Use z.tuple() to define multiple arguments
      input: z.tuple([
        z.string(),                    // orderId
        z.string(),                    // customerId
        z.array(z.object({            // items
          productId: z.string(),
          quantity: z.number(),
        })),
      ]),
      output: z.object({
        orderId: z.string(),
        status: z.string(),
        totalAmount: z.number(),
      }),
      taskQueue: 'orders',
      activities: {
        validateInventory: activity({
          input: z.tuple([
            z.string(),                // productId
            z.number(),                // quantity
          ]),
          output: z.object({
            available: z.boolean(),
            reservationId: z.string().optional(),
          }),
        }),
      },
    }),
  },
});
```

## Implementing Workflows

When implementing workflows, the arguments are destructured automatically:

```typescript
import { createWorkflow } from '@temporal-contract/worker';

const processOrder = createWorkflow({
  definition: myContract.workflows.processOrder,
  // Arguments are spread as individual parameters
  implementation: async (context, orderId, customerId, items) => {
    // orderId: string
    // customerId: string
    // items: Array<{ productId: string; quantity: number }>
    
    // Call activities with multiple arguments
    for (const item of items) {
      const inventory = await context.activities.validateInventory(
        item.productId,
        item.quantity
      );
      
      if (!inventory.available) {
        throw new Error(`Product ${item.productId} not available`);
      }
    }
    
    return {
      orderId,
      status: 'completed',
      totalAmount: 100,
    };
  },
  activityOptions: {
    startToCloseTimeout: '1 minute',
  },
});
```

## Implementing Activities

Activities also receive arguments as individual parameters:

```typescript
import { createActivity } from '@temporal-contract/worker';

const validateInventory = createActivity({
  definition: myContract.workflows.processOrder.activities!.validateInventory,
  // Arguments are spread as individual parameters
  implementation: async (productId, quantity) => {
    // productId: string
    // quantity: number
    
    const inventory = await inventoryService.check(productId);
    
    if (inventory.stock >= quantity) {
      const reservationId = await inventoryService.reserve(productId, quantity);
      return { available: true, reservationId };
    }
    
    return { available: false };
  },
});
```

## Using the Client

When calling workflows from the client, pass arguments as an array:

```typescript
import { createClient } from '@temporal-contract/client';

const client = await createClient(myContract);

const result = await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  // Pass arguments as an array that matches the tuple
  args: [
    'ORD-123',                              // orderId
    'CUST-456',                             // customerId
    [                                       // items
      { productId: 'PROD-1', quantity: 2 },
      { productId: 'PROD-2', quantity: 1 },
    ],
  ],
});

console.log(result.status); // 'completed'
```

## Single Argument Pattern

If you only have one argument, you still need to use a tuple with a single element:

```typescript
const simpleWorkflow = workflow({
  input: z.tuple([
    z.object({
      name: z.string(),
    }),
  ]),
  output: z.object({
    greeting: z.string(),
  }),
  taskQueue: 'simple',
});

// Implementation
const simple = createWorkflow({
  definition: simpleWorkflow,
  implementation: async (context, input) => {
    // input: { name: string }
    return { greeting: `Hello, ${input.name}!` };
  },
});

// Usage
await client.executeWorkflow('simple', {
  workflowId: 'test',
  args: [{ name: 'World' }], // Array with single element
});
```

## Benefits

1. **Type Safety**: TypeScript infers the exact types for each argument
2. **Temporal Compatibility**: Matches Temporal's native multi-argument support
3. **Validation**: Zod validates each argument at runtime
4. **Clarity**: Clear distinction between multiple arguments vs a single object argument
5. **Flexibility**: Mix primitive types, objects, arrays, etc.

## Migration from Single Objects

If you're migrating from a single object pattern:

**Before:**
```typescript
input: z.object({ orderId: z.string(), customerId: z.string() })
implementation: async (input) => {
  const { orderId, customerId } = input;
}
```

**After:**
```typescript
input: z.tuple([z.string(), z.string()])
implementation: async (orderId, customerId) => {
  // Direct access to arguments
}
```

Or keep the object pattern as a single tuple element:
```typescript
input: z.tuple([z.object({ orderId: z.string(), customerId: z.string() })])
implementation: async (input) => {
  const { orderId, customerId } = input;
}
```
