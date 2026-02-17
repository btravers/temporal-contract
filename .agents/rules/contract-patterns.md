# Contract Patterns

## Defining a Contract

Use `defineContract` from `@temporal-contract/contract`:

```typescript
import { defineContract } from "@temporal-contract/contract";
import { z } from "zod";

const contract = defineContract({
  taskQueue: "my-task-queue",
  workflows: {
    processOrder: {
      input: z.object({ orderId: z.string() }),
      output: z.object({ status: z.string() }),
      activities: {
        validateInventory: {
          input: z.object({ orderId: z.string() }),
          output: z.object({ available: z.boolean() }),
        },
      },
      signals: {
        cancel: { input: z.object({ reason: z.string() }) },
      },
      queries: {
        getStatus: {
          input: z.object({}),
          output: z.object({ status: z.string() }),
        },
      },
    },
  },
  activities: {
    // Global activities shared across workflows
    sendEmail: {
      input: z.object({ to: z.string(), subject: z.string() }),
      output: z.object({ sent: z.boolean() }),
    },
  },
});
```

## Schema Libraries

Any Standard Schema compatible library works:

- **Zod** (most common)
- **Valibot**
- **ArkType**

## Contract Structure

- `taskQueue` — Temporal task queue name
- `workflows` — named workflow definitions with input/output schemas
- `activities` — global activities shared across all workflows
- Each workflow can have its own `activities`, `signals`, `queries`, `updates`
