# @temporal-contract/contract

Core package for defining type-safe Temporal contracts.

## Installation

```bash
pnpm add @temporal-contract/contract zod
```

## API

### defineContract

Define a type-safe contract for Temporal workflows.

```typescript
import { defineContract } from "@temporal-contract/contract";
import { z } from "zod";

const contract = defineContract({
  taskQueue: "my-queue",
  activities: {
    /* ... */
  },
  workflows: {
    /* ... */
  },
});
```

## Type Definitions

The contract package exports core type definitions that are used by both client and worker packages:

```typescript
import type {
  ContractDefinition,
  WorkflowDefinition,
  ActivityDefinition,
  SignalDefinition,
  QueryDefinition,
  UpdateDefinition,
} from "@temporal-contract/contract";
```

## Utility Types

Extract metadata from contracts:

```typescript
import type {
  InferWorkflowNames,
  InferActivityNames,
  InferContractWorkflows,
} from "@temporal-contract/contract";

// Extract workflow names as union type
type WorkflowNames = InferWorkflowNames<typeof myContract>;
// "processOrder" | "cancelOrder"

// Extract activity names as union type
type ActivityNames = InferActivityNames<typeof myContract>;
// "sendEmail" | "log"

// Extract workflow definitions
type Workflows = InferContractWorkflows<typeof myContract>;
```

## Type Inference

For input/output type inference, use the appropriate package:

- **Worker types**: Import from `@temporal-contract/worker/activity` or `@temporal-contract/worker/workflow`
- **Client types**: Import from `@temporal-contract/client`

See the respective API documentation:

- [Worker API](/api/worker)
- [Client API](/api/client)

## Documentation

See [Getting Started](/guide/getting-started) for complete examples.
