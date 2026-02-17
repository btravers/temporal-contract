---
title: Introducing temporal-contract - Type-safe Temporal.io Workflows
description: Learn how temporal-contract brings end-to-end type safety, automatic validation, and contract-first development to Temporal.io workflows in TypeScript.
---

# Introducing temporal-contract

_January 2025_

We're excited to introduce **temporal-contract**, a library that brings end-to-end type safety and contract-first development to [Temporal.io](https://temporal.io/) workflows.

## The Challenge

Temporal.io is an excellent platform for building durable, fault-tolerant applications. However, working with workflows in TypeScript presents some challenges:

- **No compile-time type safety** between client and worker
- **Manual validation** of workflow inputs and outputs
- **Scattered type definitions** across different files
- **Runtime errors** from mismatched data types

## The Solution

temporal-contract solves these problems with a **contract-first approach**:

```typescript
import { defineContract } from "@temporal-contract/contract";
import { z } from "zod";

export const orderContract = defineContract({
  taskQueue: "orders",
  workflows: {
    processOrder: {
      input: z.object({
        orderId: z.string(),
        customerId: z.string(),
        amount: z.number().positive(),
      }),
      output: z.object({
        status: z.enum(["success", "failed"]),
        transactionId: z.string().optional(),
      }),
      activities: {
        processPayment: {
          input: z.object({ customerId: z.string(), amount: z.number() }),
          output: z.object({ transactionId: z.string() }),
        },
      },
    },
  },
});
```

From this single contract definition, you get:

1. **Full TypeScript inference** - No manual type annotations needed
2. **Automatic validation** - Zod validates inputs and outputs at runtime
3. **IDE support** - Autocomplete, inline docs, and refactoring
4. **Compile-time checks** - TypeScript catches errors before runtime

## Type-Safe Client

```typescript
import { TypedClient } from "@temporal-contract/client";

const client = TypedClient.create(orderContract, temporalClient);

// TypeScript knows the exact shape of args and result
const future = client.executeWorkflow("processOrder", {
  workflowId: "order-123",
  args: {
    orderId: "ORD-123",
    customerId: "CUST-456",
    amount: 99.99,
  },
});

const result = await future;
result.match({
  Ok: (output) => console.log(output.status), // 'success' | 'failed'
  Error: (error) => console.error("Failed:", error),
});
```

## Type-Safe Worker

```typescript
import { declareWorkflow } from "@temporal-contract/worker/workflow";

const processOrder = declareWorkflow({
  workflowName: "processOrder",
  contract: orderContract,
  activityOptions: { startToCloseTimeout: "1 minute" },
  implementation: async ({ activities }, { orderId, customerId, amount }) => {
    // Activities are fully typed
    const { transactionId } = await activities.processPayment({
      customerId,
      amount,
    });

    return { status: "success", transactionId };
  },
});
```

## Key Features

### Schema Validation Support

temporal-contract works with multiple schema libraries:

- [Zod](https://zod.dev/)
- [Valibot](https://valibot.dev/)
- [ArkType](https://arktype.io/)

### NestJS Integration

First-class NestJS support with dependency injection:

```typescript
import { TemporalClientModule } from "@temporal-contract/client-nestjs";
import { Connection, Client } from "@temporalio/client";
import { orderContract } from "./contract";

const connection = await Connection.connect({ address: "localhost:7233" });
const client = new Client({ connection });

@Module({
  imports: [
    TemporalClientModule.forRoot({
      contract: orderContract,
      client,
    }),
  ],
})
export class AppModule {}
```

### Result Pattern

Explicit error handling with the Result/Future pattern:

```typescript
const result = await client.executeWorkflow("processOrder", options);

result.match({
  Ok: (output) => {
    // Handle success
  },
  Error: (error) => {
    // Handle failure explicitly
  },
});
```

## Getting Started

Install the packages:

```bash
pnpm add @temporal-contract/contract @temporal-contract/client @temporal-contract/worker zod
```

Then follow our [Getting Started Guide](/guide/getting-started) to build your first type-safe workflow.

## Inspired By

temporal-contract brings the contract-first patterns from these excellent projects to Temporal.io:

- [tRPC](https://trpc.io/) - End-to-end type safety for RPC
- [oRPC](https://orpc.dev/) - Contract-first RPC with OpenAPI
- [ts-rest](https://ts-rest.com/) - Type-safe REST APIs

## What's Next

We're actively developing temporal-contract with planned features including:

- **Nexus integration** for cross-namespace workflows
- **OpenTelemetry support** for observability
- **More schema library support**

## Join Us

- Star us on [GitHub](https://github.com/btravers/temporal-contract)
- Report issues or request features
- Contribute to the project

We'd love to hear your feedback and see what you build with temporal-contract!
