# temporal-contract

> Type-safe contract system for Temporal.io workflows and activities

**temporal-contract** brings the type safety and developer experience of modern API contract libraries like [oRPC](https://orpc.unnoq.com/) and [ts-rest](https://ts-rest.com/) to [Temporal.io](https://temporal.io/) workflows and activities.

## Architecture

This project is organized as a monorepo with the following packages:

- **`@temporal-contract/core`** - Core types and utilities
- **`@temporal-contract/contract`** - Contract builder for defining workflows and activities
- **`@temporal-contract/worker`** - Utilities for implementing workflows and activities
- **`@temporal-contract/client`** - Client for consuming workflows

## Features

✅ **End-to-end type safety** - Full TypeScript inference from contract to client and server  
✅ **Zod validation** - Runtime validation of inputs and outputs using Zod schemas  
✅ **Workflow & Activity contracts** - Define typed contracts for both workflows and activities  
✅ **Autocomplete everywhere** - IntelliSense for workflow names, inputs, and outputs  
✅ **Shared contract** - Single source of truth shared between client and server  
✅ **Zero runtime overhead** - Type information is removed at runtime

## Installation

```bash
# Install the packages you need
pnpm add @temporal-contract/contract @temporal-contract/worker @temporal-contract/client zod @temporalio/client @temporalio/worker @temporalio/workflow

# Or using npm
npm install @temporal-contract/contract @temporal-contract/worker @temporal-contract/client zod @temporalio/client @temporalio/worker @temporalio/workflow
```

## Quick Start

### 1. Define your contract

Create a shared contract that defines your workflows and activities with Zod schemas:

```typescript
// contract.ts
import { z } from 'zod';
import { contract, workflow, activity } from 'temporal-contract';

export const myContract = contract({
  workflows: {
    processOrder: workflow({
      input: z.object({
        orderId: z.string(),
        items: z.array(z.object({
          productId: z.string(),
          quantity: z.number().positive(),
        })),
        customerId: z.string(),
      }),
      output: z.object({
        orderId: z.string(),
        status: z.enum(['success', 'failed']),
        totalAmount: z.number(),
        trackingNumber: z.string().optional(),
      }),
      activities: {
        validateInventory: activity({
          input: z.object({
            items: z.array(z.object({
              productId: z.string(),
              quantity: z.number(),
            })),
          }),
          output: z.object({
            available: z.boolean(),
          }),
        }),
        processPayment: activity({
          input: z.object({
            customerId: z.string(),
            amount: z.number(),
          }),
          output: z.object({
            transactionId: z.string(),
            success: z.boolean(),
          }),
        }),
      },
    }),
  },
});
```

### 2. Implement workflows and activities (server)

```typescript
// server.ts
import { createWorkflow, createActivity } from '@temporal-contract/worker';
import { myContract } from './contract';

// Implement activities with full type safety
const validateInventory = createActivity({
  definition: myContract.workflows.processOrder.activities!.validateInventory,
  implementation: async (input) => {
    // input is fully typed!
    console.log('Validating:', input.items);
    return { available: true };
  },
});

const processPayment = createActivity({
  definition: myContract.workflows.processOrder.activities!.processPayment,
  implementation: async (input) => {
    return {
      transactionId: `txn_${Math.random()}`,
      success: true,
    };
  },
});

// Implement workflow with typed activities
export const processOrder = createWorkflow({
  definition: myContract.workflows.processOrder,
  implementation: async (input, context) => {
    // input is typed based on the contract
    // context.activities are fully typed too!
    
    const inventory = await context.activities.validateInventory({
      items: input.items,
    });

    if (!inventory.available) {
      return {
        orderId: input.orderId,
        status: 'failed',
        totalAmount: 0,
      };
    }

    const payment = await context.activities.processPayment({
      customerId: input.customerId,
      amount: 100,
    });

    return {
      orderId: input.orderId,
      status: payment.success ? 'success' : 'failed',
      totalAmount: 100,
      trackingNumber: 'TRK123',
    };
  },
});

export const workflows = { processOrder };
export const activities = { validateInventory, processPayment };
```

### 3. Call workflows from the client

```typescript
// client.ts
import { createClient } from '@temporal-contract/client';
import { myContract } from './contract';

async function main() {
  // Create a typed client
  const client = await createClient(myContract);

  // Execute workflow with full type safety
  const result = await client.executeWorkflow('processOrder', {
    workflowId: 'order-123',
    taskQueue: 'orders',
    input: {
      orderId: 'ORD-123',
      customerId: 'CUST-456',
      items: [
        { productId: 'PROD-1', quantity: 2 },
      ],
    },
  });

  // Result is fully typed!
  console.log(result.status); // 'success' | 'failed'
  console.log(result.totalAmount); // number
  console.log(result.trackingNumber); // string | undefined
}
```

## API Reference

### `contract(definition)`

Creates a contract definition with workflows and optional global activities.

```typescript
const myContract = contract({
  workflows: {
    workflowName: workflow({ ... }),
  },
  activities: {
    globalActivity: activity({ ... }),
  },
});
```

### `workflow(config)`

Defines a workflow with input/output schemas and optional activities.

```typescript
workflow({
  input: z.object({ ... }),
  output: z.object({ ... }),
  activities: {
    activityName: activity({ ... }),
  },
})
```

### `activity(config)`

Defines an activity with input/output schemas.

```typescript
activity({
  input: z.object({ ... }),
  output: z.object({ ... }),
})
```

### `createWorkflow(options)`

Creates a typed workflow implementation.

```typescript
const myWorkflow = createWorkflow({
  definition: myContract.workflows.myWorkflow,
  implementation: async (input, context) => {
    // Access typed activities via context.activities
    const result = await context.activities.myActivity(input);
    return result;
  },
});
```

### `createActivity(options)`

Creates a typed activity implementation.

```typescript
const myActivity = createActivity({
  definition: myContract.activities.myActivity,
  implementation: async (input) => {
    return { /* output */ };
  },
});
```

### `createClient(contract, options?)`

Creates a typed Temporal client.

```typescript
const client = await createClient(myContract, {
  connection: await Connection.connect(),
  namespace: 'default',
});
```

### Client Methods

#### `executeWorkflow(name, options)`

Execute a workflow and wait for the result.

```typescript
const result = await client.executeWorkflow('workflowName', {
  workflowId: 'unique-id',
  taskQueue: 'my-queue',
  input: { /* typed input */ },
});
```

#### `startWorkflow(name, options)`

Start a workflow and get a handle.

```typescript
const handle = await client.startWorkflow('workflowName', {
  workflowId: 'unique-id',
  taskQueue: 'my-queue',
  input: { /* typed input */ },
});

const result = await handle.result();
```

#### `getHandle(name, workflowId)`

Get a handle to an existing workflow.

```typescript
const handle = await client.getHandle('workflowName', 'workflow-id');
const result = await handle.result();
```

## Why temporal-contract?

### Problem

Working with Temporal in TypeScript often lacks type safety:

```typescript
// ❌ No type checking
const result = await client.workflow.execute('processOrder', {
  workflowId: 'order-123',
  taskQueue: 'orders',
  args: [{ orderId: 'ORD-123' }], // What fields are required?
});

// ❌ Result type is unknown
console.log(result.status); // No autocomplete, runtime errors possible
```

### Solution

With temporal-contract, you get full type safety:

```typescript
// ✅ Full type checking and autocomplete
const result = await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  taskQueue: 'orders',
  input: {
    orderId: 'ORD-123',
    customerId: 'CUST-456',
    items: [{ productId: 'PROD-1', quantity: 2 }],
  },
});

// ✅ Result is fully typed
console.log(result.status); // TypeScript knows it's 'success' | 'failed'
```

## Development

This project uses:
- **pnpm** - Fast, disk space efficient package manager
- **Turborepo** - High-performance build system for monorepos
- **TypeScript** - Type-safe JavaScript

### Getting Started

Quick setup:
```bash
# Clone the repository
git clone https://github.com/yourusername/temporal-contract.git
cd temporal-contract

# Run setup script
./setup.sh
```

Or manually:
```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run examples
cd examples
pnpm client
```

### Project Structure

```
temporal-contract/
├── packages/
│   ├── core/           # Core types and utilities
│   ├── contract/       # Contract builder
│   ├── worker/         # Worker implementation utilities
│   └── client/         # Client for consuming workflows
├── examples/           # Example usage
├── pnpm-workspace.yaml # pnpm workspace configuration
├── turbo.json         # Turborepo configuration
└── package.json       # Root package.json
```

## Comparison with similar libraries

| Feature | temporal-contract | oRPC | ts-rest |
|---------|------------------|------|---------|
| Type safety | ✅ | ✅ | ✅ |
| Zod validation | ✅ | ✅ | ✅ |
| Target | Temporal.io | RPC | REST APIs |
| Workflows | ✅ | ❌ | ❌ |
| Activities | ✅ | ❌ | ❌ |

## Examples

Check out the [examples](./examples) directory for complete working examples:

- [Basic usage](./examples/contract.ts) - Contract definition
- [Server implementation](./examples/server.ts) - Workflows and activities
- [Client usage](./examples/client.ts) - Calling workflows
- [Worker setup](./examples/worker.ts) - Setting up a Temporal worker

See the [examples README](./examples/README.md) for instructions on running them.

## Documentation

- [Architecture](./docs/ARCHITECTURE.md) - Project architecture and design
- [Structure](./docs/STRUCTURE.md) - Detailed file structure
- [Data Flow](./docs/DATA_FLOW.md) - How data flows through the system
- [Best Practices](./docs/BEST_PRACTICES.md) - Best practices and guidelines
- [FAQ](./docs/FAQ.md) - Frequently asked questions
- [Contributing](./docs/CONTRIBUTING.md) - Contribution guidelines
- [Roadmap](./docs/ROADMAP.md) - Future plans and features
- [Changelog](./docs/CHANGELOG.md) - Version history
- [Publishing](./docs/PUBLISHING.md) - How to publish packages
- [PNPM Catalog](./docs/CATALOG.md) - Dependency management with PNPM catalog

## License

MIT - See [LICENSE](./LICENSE) file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Related Projects

- [Temporal.io](https://temporal.io/) - The workflow engine
- [oRPC](https://orpc.unnoq.com/) - Type-safe RPC
- [ts-rest](https://ts-rest.com/) - Type-safe REST APIs
- [Zod](https://zod.dev/) - TypeScript-first schema validation
