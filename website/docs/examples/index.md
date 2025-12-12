# Examples

Learn by example! Explore complete working examples that demonstrate temporal-contract in action.

## Available Examples

### [Basic Order Processing](/examples/basic-order-processing)

A complete e-commerce order processing workflow using standard Promise-based approach.

**Features:**
- Order validation
- Payment processing
- Inventory management
- Email notifications
- Clean Architecture structure

**Best for:** Understanding the fundamentals and standard workflow patterns.

### [Boxed Order Processing](/examples/boxed-order-processing)

The same order processing workflow using the Result/Future pattern for explicit error handling.

**Features:**
- Type-safe error handling with `Result<T, E>`
- Non-throwing async operations with `Future<T, E>`
- Explicit error propagation
- Railway-oriented programming

**Best for:** Projects requiring explicit error handling without exceptions.

## Quick Comparison

| Feature | Basic | Boxed |
|---------|-------|-------|
| Error Handling | Exceptions | Result pattern |
| Learning Curve | ✅ Easy | ⚠️ Moderate |
| Type Safety | ✅ Yes | ✅ Yes + Errors |
| Use Case | Standard workflows | Complex error flows |
## Running the Examples

All examples are located in the [`samples/`](https://github.com/btravers/temporal-contract/tree/main/samples) directory of the repository.

### Prerequisites

1. Clone the repository:
   ```bash
   git clone https://github.com/btravers/temporal-contract.git
   cd temporal-contract
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Build the packages:
   ```bash
   pnpm build
   ```

4. Start Temporal server:
   ```bash
   temporal server start-dev
   ```

### Running an Example

Each example has its own directory with a README:

```bash
# Navigate to an example
cd samples/order-processing-worker

# Start the worker
pnpm dev:worker

# In another terminal, run the client
cd samples/order-processing-client
pnpm dev
```

## Example Structure

Each example follows this structure:

```
example-name/
├── src/
│   ├── contracts/
│   │   └── order.contract.ts      # Contract definition
│   ├── activities/
│   │   ├── payment.activities.ts  # Payment activities
│   │   └── email.activities.ts    # Email activities
│   ├── workflows/
│   │   └── order.workflow.ts      # Workflow implementation
│   ├── infrastructure/
│   │   ├── payment.service.ts     # External services
│   │   └── email.service.ts
│   ├── client.ts                  # Example client
│   └── worker.ts                  # Worker setup
├── package.json
├── tsconfig.json
└── README.md
```

## Code Snippets

### Contract Definition

All examples start with a contract:

```typescript
import { defineContract } from '@temporal-contract/contract';
import { z } from 'zod';

export const orderContract = defineContract({
  taskQueue: 'orders',
  
  activities: {
    sendEmail: {
      input: z.object({ 
        to: z.string().email(), 
        subject: z.string(), 
        body: z.string() 
      }),
      output: z.object({ sent: z.boolean() })
    }
  },
  
  workflows: {
    processOrder: {
      input: z.object({ 
        orderId: z.string(),
        customerId: z.string(),
        items: z.array(z.object({
          sku: z.string(),
          quantity: z.number().positive()
        }))
      }),
      output: z.object({ 
        success: z.boolean(),
        transactionId: z.string().optional()
      }),
      
      activities: {
        validateInventory: {
          input: z.object({ items: z.array(z.any()) }),
          output: z.object({ available: z.boolean() })
        },
        processPayment: {
          input: z.object({ 
            customerId: z.string(),
            amount: z.number() 
          }),
          output: z.object({ 
            transactionId: z.string(),
            success: z.boolean() 
          })
        }
      }
    }
  }
});
```

### Activity Implementation

Clean, typed activity implementations:

```typescript
import { declareActivitiesHandler } from '@temporal-contract/worker/activity';
import { orderContract } from '../contracts/order.contract';
import { emailService } from '../infrastructure/email.service';
import { paymentService } from '../infrastructure/payment.service';

export const activities = declareActivitiesHandler({
  contract: orderContract,
  activities: {
    sendEmail: async ({ to, subject, body }) => {
      await emailService.send({ to, subject, body });
      return { sent: true };
    },
    
    validateInventory: async ({ items }) => {
      const available = await inventoryService.checkAvailability(items);
      return { available };
    },
    
    processPayment: async ({ customerId, amount }) => {
      const result = await paymentService.charge(customerId, amount);
      return {
        transactionId: result.id,
        success: result.status === 'success'
      };
    }
  }
});
```

### Workflow Implementation

Type-safe workflow with full autocomplete:

```typescript
import { declareWorkflow } from '@temporal-contract/worker/workflow';
import { orderContract } from '../contracts/order.contract';

export const processOrder = declareWorkflow({
  workflowName: 'processOrder',
  contract: orderContract,
  implementation: async (context, { orderId, customerId, items }) => {
    // Validate inventory
    const inventory = await context.activities.validateInventory({ items });
    
    if (!inventory.available) {
      await context.activities.sendEmail({
        to: customerId,
        subject: 'Order Failed',
        body: 'Items not available'
      });
      return { success: false };
    }
    
    // Calculate total
    const total = items.reduce((sum, item) => sum + item.quantity * 100, 0);
    
    // Process payment
    const payment = await context.activities.processPayment({
      customerId,
      amount: total
    });
    
    if (!payment.success) {
      await context.activities.sendEmail({
        to: customerId,
        subject: 'Payment Failed',
        body: 'Unable to process payment'
      });
      return { success: false };
    }
    
    // Send confirmation
    await context.activities.sendEmail({
      to: customerId,
      subject: 'Order Confirmed',
      body: `Order ${orderId} confirmed. Transaction: ${payment.transactionId}`
    });
    
    return {
      success: true,
      transactionId: payment.transactionId
    };
  }
});
```

## Learn More

- 📚 Read the [Getting Started Guide](/guide/getting-started)
- 🔍 Understand [Core Concepts](/guide/core-concepts)
- 📖 Browse the [API Reference](/api/)

## Contributing Examples

Have an interesting use case? We welcome example contributions! See our [Contributing Guide](https://github.com/btravers/temporal-contract/blob/main/CONTRIBUTING.md).
