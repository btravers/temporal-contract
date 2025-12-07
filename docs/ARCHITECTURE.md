# temporal-contract

## 📦 Packages

### @temporal-contract/core
Core types and utilities used across all packages.

**Location:** `packages/core/`

**Exports:**
- Type definitions for contracts, workflows, and activities
- Type inference utilities

### @temporal-contract/contract
Contract builder for defining workflows and activities.

**Location:** `packages/contract/`

**Exports:**
- `contract()` - Create a contract definition
- `workflow()` - Define a workflow
- `activity()` - Define an activity

### @temporal-contract/worker
Worker utilities for implementing workflows and activities.

**Location:** `packages/worker/`

**Exports:**
- `createWorkflow()` - Implement a workflow with validation
- `createActivity()` - Implement an activity with validation

### @temporal-contract/client
Client for consuming workflows.

**Location:** `packages/client/`

**Exports:**
- `createClient()` - Create a typed Temporal client
- `TypedClient` - Typed client class

## 🏗️ Architecture

```
┌─────────────────┐
│   Contract      │ ◄── Shared between client and server
│  (Zod schemas) │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌────────┐
│Worker │ │ Client │
│ (Impl)│ │(Consume)│
└───────┘ └────────┘
```

1. **Define** a contract with Zod schemas (shared)
2. **Implement** workflows/activities on the worker
3. **Consume** workflows from the client

All with full TypeScript type safety and validation!

## 🚀 Quick Start

### 1. Define Contract
```typescript
import { contract, workflow, activity } from '@temporal-contract/contract';
import { z } from 'zod';

export const myContract = contract({
  workflows: {
    processOrder: workflow({
      input: z.object({ orderId: z.string() }),
      output: z.object({ status: z.string() }),
    }),
  },
});
```

### 2. Implement (Worker)
```typescript
import { createWorkflow } from '@temporal-contract/worker';

export const processOrder = createWorkflow({
  definition: myContract.workflows.processOrder,
  implementation: async (input) => {
    return { status: 'success' };
  },
});
```

### 3. Consume (Client)
```typescript
import { createClient } from '@temporal-contract/client';

const client = await createClient(myContract);
const result = await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  taskQueue: 'orders',
  input: { orderId: 'ORD-123' },
});
```

## 📝 Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Watch mode
pnpm dev

# Run examples
cd examples
pnpm client
```

## 🎯 Key Features

- ✅ **Type Safety** - End-to-end TypeScript type inference
- ✅ **Validation** - Automatic Zod validation of inputs/outputs
- ✅ **Monorepo** - Organized with Turborepo + pnpm
- ✅ **Modular** - Use only the packages you need
- ✅ **DX** - Autocomplete everywhere

## 📦 Package Dependencies

```
@temporal-contract/contract
  └── @temporal-contract/core

@temporal-contract/worker
  └── @temporal-contract/core

@temporal-contract/client
  └── @temporal-contract/core
```

All packages have peer dependencies on:
- `zod` (^3.22.0)
- `temporalio` (^1.0.0) - except `contract`
