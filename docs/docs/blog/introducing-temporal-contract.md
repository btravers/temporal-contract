---
layout: doc
title: "Introducing temporal-contract: Type-Safe Contracts for Temporal.io"
description: "Learn how temporal-contract brings end-to-end type safety and automatic validation to Temporal.io workflows, eliminating runtime errors and improving developer experience."
---

# Introducing temporal-contract: Type-Safe Contracts for Temporal.io

> **TL;DR:** temporal-contract is an open-source TypeScript framework that brings end-to-end type safety and automatic validation to Temporal.io workflows. Define your contract once, and get full type inference everywhere—from client calls to workflow implementations and activity handlers.

## The Problem With Building Temporal Workflows Today

[Temporal.io](https://temporal.io/) is an incredible platform for building reliable, long-running workflows. But like any distributed system, it has a fundamental challenge: **data flows across network boundaries**, and TypeScript can't automatically validate that.

Here's what most Temporal projects look like today:

```typescript
// ❌ Typical Temporal code
const result = await client.workflow.execute("processOrder", {
  workflowId: "order-123",
  taskQueue: "orders",
  args: [{ orderId: "ORD-123" }], // What fields? What types?
});

console.log(result.status); // ❌ unknown type, no autocomplete
```

This creates several problems:

1. **No type safety at boundaries** — The client doesn't know what fields are expected or what the response looks like
2. **Manual validation everywhere** — You have to validate inputs/outputs in every workflow and activity
3. **Runtime errors** — Invalid data only fails at runtime, deep in your workflow
4. **Scattered definitions** — Activities are defined in workflows, globals are inconsistent, naming conflicts are hard to detect
5. **Poor developer experience** — No autocomplete, refactoring is error-prone, documentation lives only in comments
6. **Contract fragility** — Changing workflow signatures requires updates everywhere

The root cause? **No single source of truth.** Each layer (client, workflow, activity) must independently track what data is being passed around.

## Enter: temporal-contract

**temporal-contract** solves this with a **contract-first approach**: define your workflows and activities once as a contract, and get full type safety and automatic validation everywhere.

```typescript
// ✅ Define your contract once
const contract = defineContract({
  taskQueue: "orders",
  workflows: {
    processOrder: {
      input: z.object({ orderId: z.string(), customerId: z.string() }),
      output: z.object({ status: z.enum(["success", "failed"]), transactionId: z.string() }),
      activities: {
        validateOrder: {
          input: z.object({ orderId: z.string() }),
          output: z.object({ valid: z.boolean() }),
        },
      },
    },
  },
});

// ✅ Use it everywhere with full type safety
const result = await client.executeWorkflow("processOrder", {
  workflowId: "order-123",
  args: { orderId: "ORD-123", customerId: "CUST-456" }, // TypeScript knows the exact fields!
});

console.log(result.status); // ✅ 'success' | 'failed' — full autocomplete!
```

## How temporal-contract Works

### 1. **Contract-First Design**

You define your workflows and activities as a contract using Zod schemas:

```typescript
const contract = defineContract({
  taskQueue: "payments",
  workflows: {
    processPayment: {
      input: z.object({
        orderId: z.string(),
        amount: z.number().positive(),
      }),
      output: z.object({
        transactionId: z.string(),
        status: z.enum(["success", "failed", "pending"]),
      }),
      activities: {
        chargeCard: {
          input: z.object({
            amount: z.number(),
            cardToken: z.string(),
          }),
          output: z.object({
            transactionId: z.string(),
            approved: z.boolean(),
          }),
        },
        sendConfirmation: {
          input: z.object({ email: z.string().email() }),
          output: z.object({ sent: z.boolean() }),
        },
      },
    },
  },
});
```

### 2. **Automatic Validation**

The framework automatically validates all inputs and outputs at network boundaries:

```typescript
// In your worker
export const processPayment = workflow.create(contract, "processPayment", async (ctx, input) => {
  // input is fully typed and already validated
  // If validation fails, Temporal handles it gracefully

  const charge = await ctx.activity("chargeCard", {
    amount: input.amount,
    cardToken: "tok_123", // TypeScript ensures these fields exist
  });

  // charge is typed and validated
  if (charge.isError()) {
    return new Error(`Payment failed: ${charge.error}`);
  }

  return new Ok({
    transactionId: charge.value.transactionId,
    status: "success" as const,
  });
});
```

### 3. **End-to-End Type Safety**

The same contract is used by client, worker, and activities, creating a **single source of truth**:

```typescript
// Client code
const result = await client.executeWorkflow("processPayment", {
  workflowId: "order-123",
  args: {
    orderId: "ORD-123", // ✅ TypeScript knows this field
    amount: 99.99, // ✅ TypeScript knows it's a number
  },
});

// Result is typed
if (result.isOk()) {
  console.log(result.value.transactionId); // ✅ Autocomplete works!
}
```

### 4. **Compile-Time Checks**

TypeScript catches errors before they happen:

```typescript
// ❌ This won't compile
await client.executeWorkflow("processPayment", {
  workflowId: "order-123",
  args: {
    orderId: "ORD-123",
    // ❌ Missing 'amount' field — TypeScript error!
  },
});

// ❌ This won't compile
await client.executeWorkflow("unknownWorkflow", {
  workflowId: "order-123",
  args: {
    /* ... */
  },
  // ❌ Workflow 'unknownWorkflow' doesn't exist — TypeScript error!
});
```

## Key Features

### ✅ **End-to-End Type Safety**

Full TypeScript inference from contract to client, workflows, and activities. No manual type annotations needed.

### ✅ **Automatic Validation**

Zod schemas validate all inputs and outputs at network boundaries. No runtime surprises.

### ✅ **Compile-Time Checks**

TypeScript catches missing or incorrect implementations before runtime. Refactor with confidence.

### ✅ **Result/Future Pattern**

Explicit error handling for workflows without throwing exceptions. Use `Ok` and `Error` types for predictable error flows.

### ✅ **Child Workflows**

Execute child workflows with type safety and Result/Future pattern for microservice orchestration.

### ✅ **Better Developer Experience**

- Full autocomplete throughout your codebase
- Inline documentation from your schemas
- Refactoring support that actually works
- Clear error messages when things go wrong

### ✅ **Activity Deduplication**

Activities can be global or workflow-specific. Naming conflicts are caught at contract definition time.

### ✅ **Built-in Testing**

Type-safe testing utilities with Testcontainers integration for seamless local testing.

## Real-World Example: Order Processing

Here's how a complete order processing system looks with temporal-contract:

```typescript
// contract.ts
export const orderContract = defineContract({
  taskQueue: "orders",
  workflows: {
    processOrder: {
      input: z.object({
        orderId: z.string(),
        customerId: z.string(),
        items: z.array(
          z.object({
            productId: z.string(),
            quantity: z.number().positive(),
            price: z.number().positive(),
          }),
        ),
      }),
      output: z.object({
        status: z.enum(["success", "failed"]),
        transactionId: z.string().optional(),
        reason: z.string().optional(),
      }),
      activities: {
        validateInventory: {
          input: z.object({ items: z.array(z.string()) }),
          output: z.object({ available: z.boolean() }),
        },
        processPayment: {
          input: z.object({ amount: z.number() }),
          output: z.object({ transactionId: z.string() }),
        },
        sendConfirmation: {
          input: z.object({ orderId: z.string(), email: z.string() }),
          output: z.object({ sent: z.boolean() }),
        },
      },
    },
  },
});

// worker.ts
export const processOrder = workflow.create(orderContract, "processOrder", async (ctx, input) => {
  // Check inventory
  const inventory = await ctx.activity("validateInventory", {
    items: input.items.map((i) => i.productId),
  });

  if (inventory.isError() || !inventory.value.available) {
    return new Error({
      status: "failed" as const,
      reason: "Items not in stock",
    });
  }

  // Process payment
  const total = input.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const payment = await ctx.activity("processPayment", { amount: total });

  if (payment.isError()) {
    return new Error({
      status: "failed" as const,
      reason: "Payment failed",
    });
  }

  // Send confirmation
  await ctx.activity("sendConfirmation", {
    orderId: input.orderId,
    email: "customer@example.com",
  });

  return new Ok({
    status: "success" as const,
    transactionId: payment.value.transactionId,
  });
});

// client.ts
const client = TypedClient.create(orderContract, { connection });

const result = await client.executeWorkflow("processOrder", {
  workflowId: "order-123",
  args: {
    orderId: "ORD-123",
    customerId: "CUST-456",
    items: [
      { productId: "PROD-1", quantity: 2, price: 29.99 },
      { productId: "PROD-2", quantity: 1, price: 49.99 },
    ],
  },
});

if (result.isOk()) {
  console.log(`Order processed: ${result.value.transactionId}`);
} else {
  console.error(`Order failed: ${result.error.reason}`);
}
```

## Why This Matters

### For Teams:

- **Reduced bugs** — Type checking catches contract mismatches before production
- **Better collaboration** — The contract serves as documentation everyone can see and rely on
- **Easier refactoring** — Change the contract, and TypeScript points out all the places that need updates

### For Individual Developers:

- **Faster development** — Autocomplete and type hints eliminate guesswork
- **Fewer surprises** — Validation failures are explicit, not hidden deep in your workflows
- **Better debugging** — Stack traces and error types tell you exactly what went wrong

### For Systems:

- **Better reliability** — Invalid data is caught at boundaries, not downstream
- **Clear contracts** — New team members understand workflows from type signatures
- **Maintainability** — Your future self will thank you for the explicit contracts

## Getting Started

Ready to try it out? It takes just a few minutes:

```bash
# Install the packages
pnpm add @temporal-contract/contract @temporal-contract/worker @temporal-contract/client zod

# Follow the getting started guide
# https://btravers.github.io/temporal-contract/guide/getting-started
```

## What's Next?

temporal-contract is actively developed. Here's what's coming:

- **Nexus Integration** (v0.5.0) — Cross-namespace operations for microservice orchestration
- **Advanced Patterns** — More examples and patterns from the community
- **Performance Improvements** — Validation optimization and bundle size reduction
- **Ecosystem** — Integrations with popular tools and frameworks

## Open Source & Community

temporal-contract is **100% open source** under the MIT license. We'd love contributions:

- [GitHub Repository](https://github.com/btravers/temporal-contract)
- [Documentation](https://btravers.github.io/temporal-contract)
- [Examples](https://btravers.github.io/temporal-contract/examples/)
- [Contributing Guide](https://github.com/btravers/temporal-contract/blob/main/CONTRIBUTING.md)

## Conclusion

Building reliable, long-running workflows shouldn't require manual type checking and validation everywhere. **temporal-contract** brings the power of TypeScript's type system to Temporal.io, eliminating entire categories of bugs while improving developer experience.

If you're building Temporal workflows today, give temporal-contract a try. We think you'll love it.

---

**Have questions?** Reach out on [GitHub Discussions](https://github.com/btravers/temporal-contract/discussions) or open an issue.

**Want to see it in action?** Check out the [order processing example](https://btravers.github.io/temporal-contract/examples/) on our documentation site.
