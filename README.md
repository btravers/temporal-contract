# temporal-contract

> Type-safe contract system for Temporal.io workflows and activities

**temporal-contract** brings complete type safety and developer experience to [Temporal.io](https://temporal.io/) workflows and activities, with automatic validation and compile-time checks.

## Packages

- **`@temporal-contract/core`** - Core types and utilities
- **`@temporal-contract/contract`** - Contract builder for defining workflows and activities
- **`@temporal-contract/worker`** - Type-safe worker implementation with automatic validation
- **`@temporal-contract/client`** - Type-safe client for consuming workflows

## Features

✅ **Complete type safety** - Full TypeScript inference from contract to implementation  
✅ **Compile-time validation** - Errors if workflows/activities are missing or incorrectly typed  
✅ **Automatic runtime validation** - Zod validation at all network boundaries  
✅ **Tuple-based arguments** - Support for multiple arguments (matching Temporal's native API)  
✅ **Global activities** - Share activities across all workflows in a contract  
✅ **Contract-level task queue** - Configure once, use everywhere  
✅ **Workflow context** - Type-safe access to activities and workflow info

## Installation

```bash
pnpm add @temporal-contract/contract @temporal-contract/worker @temporal-contract/client
pnpm add zod @temporalio/client @temporalio/worker @temporalio/workflow
```

## Quick Start

### 1. Define your contract

```typescript
// contract.ts
import { z } from 'zod';
import { activity, workflow, contract } from '@temporal-contract/contract';

export default contract({
  taskQueue: 'my-service',
  
  // Global activities (available in all workflows)
  activities: {
    sendEmail: activity({
      input: z.tuple([z.string(), z.string(), z.string()]), // to, subject, body
      output: z.object({ sent: z.boolean() }),
    }),
  },
  
  workflows: {
    processOrder: workflow({
      input: z.tuple([z.string(), z.string()]), // orderId, customerId
      output: z.object({
        orderId: z.string(),
        status: z.enum(['success', 'failed']),
        transactionId: z.string(),
      }),
      
      // Workflow-specific activities
      activities: {
        validateInventory: activity({
          input: z.tuple([z.string()]),
          output: z.object({ available: z.boolean() }),
        }),
        chargePayment: activity({
          input: z.tuple([z.string(), z.number()]),
          output: z.object({ transactionId: z.string(), success: z.boolean() }),
        }),
      },
    }),
  },
});
```

### 2. Implement activities

```typescript
// activities/index.ts
import { createActivitiesHandler } from '@temporal-contract/worker';
import myContract from '../contract';

export const activitiesHandler = createActivitiesHandler({
  contract: myContract,
  activities: {
    // Global activities
    sendEmail: async (to, subject, body) => {
      await emailService.send({ to, subject, body });
      return { sent: true };
    },
    
    // Workflow-specific activities
    validateInventory: async (orderId) => {
      const available = await inventoryDB.check(orderId);
      return { available };
    },
    
    chargePayment: async (customerId, amount) => {
      const transactionId = await paymentGateway.charge(customerId, amount);
      return { transactionId, success: true };
    },
  },
});
```

### 3. Implement workflows

```typescript
// workflows/processOrder.ts
import { createWorkflow } from '@temporal-contract/worker';
import myContract from '../contract';

export const processOrder = createWorkflow({
  definition: myContract.workflows.processOrder,
  contract: myContract,
  implementation: async (context, orderId, customerId) => {
    // context.activities: typed activities (workflow + global)
    // context.info: WorkflowInfo
    
    const inventory = await context.activities.validateInventory(orderId);
    
    if (!inventory.available) {
      throw new Error('Out of stock');
    }
    
    const payment = await context.activities.chargePayment(customerId, 100);
    
    // Global activity
    await context.activities.sendEmail(
      customerId,
      'Order processed',
      'Your order has been processed'
    );
    
    return {
      orderId,
      status: payment.success ? 'success' : 'failed',
      transactionId: payment.transactionId,
    };
  },
  activityOptions: {
    startToCloseTimeout: '1 minute',
  },
});
```

### 4. Setup Temporal Worker

```typescript
// worker.ts
import { Worker } from '@temporalio/worker';
import { activitiesHandler } from './activities';

const worker = await Worker.create({
  workflowsPath: require.resolve('./workflows'),
  activities: activitiesHandler.activities,
  taskQueue: activitiesHandler.contract.taskQueue,
});

await worker.run();
```

### 5. Call workflows from client

```typescript
// client.ts
import { Connection } from '@temporalio/client';
import { TypedClient } from '@temporal-contract/client';
import myContract from './contract';

const connection = await Connection.connect({
  address: 'localhost:7233',
});

const client = TypedClient.create(myContract, {
  connection,
  namespace: 'default',
});

const result = await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  args: ['ORD-123', 'CUST-456'],
});

console.log(result.status); // 'success' | 'failed'
console.log(result.transactionId); // string
```

## Key Concepts

### Two-Part Worker Architecture

The worker implementation is split into two functions:

1. **`createActivitiesHandler`** - Implements all activities (global + workflow-specific)
   - Used by the Temporal Worker
   - Ensures all activities are implemented at compile-time
   - Wraps activities with validation

2. **`createWorkflow`** - Implements individual workflows
   - Each workflow in its own file
   - Loaded by Worker via `workflowsPath`
   - Receives typed context with activities and workflow info

This follows Temporal's architecture where workflows must be loaded from the file system.

### Arguments as Tuples

Workflows and activities use tuples for arguments to match Temporal's native API:

```typescript
// Define with tuple
input: z.tuple([z.string(), z.number()])

// Implement with spread parameters
async (context, orderId: string, amount: number) => { ... }

// Call with array
args: ['ORD-123', 100]
```

This allows multiple arguments while maintaining full type safety.

### Global Activities

Activities defined at the contract level are available in all workflows:

```typescript
contract({
  activities: {
    sendEmail: activity({ ... }), // Available in all workflows
  },
  workflows: {
    processOrder: workflow({
      activities: {
        chargePayment: activity({ ... }), // Only in processOrder
      },
    }),
  },
})
```

### Automatic Validation

All inputs and outputs are validated automatically:
- **Workflow input/output**: Validated when entering/exiting workflow
- **Activity calls**: Validated before serialization and after deserialization
- **Network boundaries**: All data crossing network is validated

This ensures data integrity and catches errors early.

## Why temporal-contract?

### Before

```typescript
// ❌ No type safety
const result = await client.workflow.execute('processOrder', {
  workflowId: 'order-123',
  taskQueue: 'orders',
  args: [{ orderId: 'ORD-123' }], // What fields are required?
});

// ❌ Result type is unknown
console.log(result.status); // No autocomplete, runtime errors possible

// ❌ No validation
// Wrong data types can cause runtime failures

// ❌ Manual activity implementation
// No compile-time check that all activities are implemented
```

### After

```typescript
// ✅ Full type safety
const result = await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  args: ['ORD-123', 'CUST-456'], // TypeScript knows what's required
});

// ✅ Result is fully typed
console.log(result.status); // 'success' | 'failed' - autocomplete works!

// ✅ Automatic validation
// Zod validates all data at network boundaries

// ✅ Compile-time validation
// TypeScript errors if workflows/activities are missing or wrong
```

## Development

### Tech Stack

- **pnpm** with catalog - Centralized dependency management
- **Turborepo** - High-performance monorepo build system
- **TypeScript 5.9** - Type-safe JavaScript with latest features
- **tsdown** - Fast dual CJS/ESM builds
- **Changesets** - Automated versioning and publishing

### Getting Started

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Type check
pnpm typecheck

# Lint
pnpm lint
```

### Project Structure

```
temporal-contract/
├── packages/
│   ├── core/           # Core types
│   ├── contract/       # Contract builder
│   ├── worker/         # Worker implementation (handler)
│   └── client/         # Typed client
├── samples/            # Sample applications
│   └── basic-order-processing/  # Order processing example
├── docs/               # Documentation
├── .github/
│   └── workflows/      # CI/CD
└── .changeset/         # Changesets config
```

## Samples

Explore working examples in the [`samples/`](./samples) directory:

- **[basic-order-processing](./samples/basic-order-processing)** - Complete order processing system with payment, inventory, and shipping

Each sample demonstrates real-world usage patterns with full documentation.

## Documentation

Essential documentation:

- **[Worker Implementation](./docs/CONTRACT_HANDLER.md)** - Complete guide to implementing workers with type safety
- **[Changesets](./docs/CHANGESETS.md)** - Release and publishing workflow
- **[PNPM Catalog](./docs/CATALOG.md)** - Centralized dependency management

Additional documentation:

- [Changelog](./docs/CHANGELOG.md) - Version history
- [Contributing](./docs/CONTRIBUTING.md) - Contribution guidelines
- [Roadmap](./docs/ROADMAP.md) - Future plans

## Release Process

This project uses [Changesets](https://github.com/changesets/changesets) for automated releases:

1. Make changes and run `pnpm changeset`
2. Push to GitHub
3. CI creates a "Version Packages" PR automatically
4. Merge the PR to publish to npm

All packages share the same version number.

See [CHANGESETS.md](./docs/CHANGESETS.md) for details.

## License

MIT

## Related Projects

- [Temporal.io](https://temporal.io/) - Durable workflow engine
- [Zod](https://zod.dev/) - TypeScript-first schema validation
