# Multiple Arguments with Tuples

Since Temporal workflows and activities can accept multiple arguments, `temporal-contract` uses Zod tuples to define input schemas instead of single object schemas.

## Network Serialization & Validation

An important feature of `temporal-contract` is that **all data exchanged between workflows and activities is validated** using Zod schemas. This is critical because Temporal serializes data when:
- Sending workflow inputs from the client
- Calling activities from workflows (network communication)
- Returning results from activities to workflows
- Returning workflow results to the client

The validation happens at these points:
1. **Client → Workflow**: Input validated before sending
2. **Workflow → Activity**: Input validated before serialization, output validated after deserialization
3. **Activity implementation**: Input validated on receive, output validated before returning
4. **Workflow → Client**: Output validated before returning

This ensures type safety and data integrity across all network boundaries.

## Basic Example

### Defining a Contract with Multiple Arguments

```typescript
import { z } from 'zod';
import { workflow, activity, contract } from '@temporal-contract/contract';

const myContract = contract({
  taskQueue: 'my-service',
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

When implementing workflows, the arguments are destructured automatically. Activity calls are automatically wrapped with validation:

```typescript
import { createWorkflow } from '@temporal-contract/worker';

const processOrder = createWorkflow({
  definition: myContract.workflows.processOrder,
  // Arguments are spread as individual parameters
  implementation: async (context, orderId, customerId, items) => {
    // orderId: string
    // customerId: string
    // items: Array<{ productId: string; quantity: number }>
    
    // When you call an activity, the input is validated BEFORE serialization
    // and the output is validated AFTER deserialization
    for (const item of items) {
      const inventory = await context.activities.validateInventory(
        item.productId,
        item.quantity
      );
      // ↑ Input: tuple validated with z.tuple([z.string(), z.number()])
      // ↓ Output: object validated with the activity's output schema
      
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

**Key point**: The validation wrapper intercepts activity calls to ensure data integrity across the network boundary between workflow and activity execution.

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
3. **Network Validation**: Zod validates each argument at runtime before serialization and after deserialization
4. **Data Integrity**: Protects against corrupted or malformed data across network boundaries
5. **Clarity**: Clear distinction between multiple arguments vs a single object argument
6. **Flexibility**: Mix primitive types, objects, arrays, etc.
7. **Error Detection**: Catches serialization issues early with clear error messages

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

## Key Points

- **Task Queue**: Defined once at the contract level, shared by all workflows
- **Tuple Arguments**: Use `z.tuple([...])` to support multiple arguments
- **Type Safety**: Full TypeScript inference for all arguments
- **Validation**: Automatic Zod validation at every network boundary
