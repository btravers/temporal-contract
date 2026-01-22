---
layout: home
title: temporal-contract - Type-safe Temporal.io workflows for TypeScript
description: End-to-end type safety, runtime validation, and explicit error handling for Temporal.io workflows and activities in TypeScript and NestJS

hero:
  name: "temporal-contract"
  text: "Type-safe contracts for Temporal.io"
  tagline: End-to-end type safety · Runtime validation · Explicit error handling
  image:
    src: /logo.svg
    alt: temporal-contract
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Why temporal-contract?
      link: /guide/why-temporal-contract
    - theme: alt
      text: GitHub
      link: https://github.com/btravers/temporal-contract

features:
  - icon: 🔒
    title: Type Safety & Validation
    details: End-to-end TypeScript inference with automatic runtime validation using Zod, Valibot, or ArkType.

  - icon: 🎯
    title: Explicit Error Handling
    details: Result/Future pattern for workflows that need explicit error handling without exceptions.

  - icon: 📝
    title: Contract-First Design
    details: Define your workflow interface once — types and validation flow from contract to client and worker.

  - icon: 🚀
    title: NestJS Ready
    details: First-class NestJS support with dependency injection and automatic lifecycle management.
---

## Quick Example

Define your contract once — get type safety everywhere:

::: code-group

```typescript [1. Define Contract]
import { defineContract } from "@temporal-contract/contract";
import { z } from "zod";

export const orderContract = defineContract({
  taskQueue: "orders",
  workflows: {
    processOrder: {
      input: z.object({
        orderId: z.string(),
        customerId: z.string(),
        amount: z.number(),
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
        sendNotification: {
          input: z.object({ customerId: z.string(), message: z.string() }),
          output: z.void(),
        },
      },
    },
  },
});
```

```typescript [2. Implement Activities]
import { Future } from "@swan-io/boxed";
import { declareActivitiesHandler, ActivityError } from "@temporal-contract/worker/activity";
import { orderContract } from "./contract";

export const activities = declareActivitiesHandler({
  contract: orderContract,
  activities: {
    processOrder: {
      processPayment: ({ customerId, amount }) => {
        return Future.fromPromise(paymentService.charge(customerId, amount))
          .mapOk((tx) => ({ transactionId: tx.id }))
          .mapError((e) => new ActivityError("PAYMENT_FAILED", e.message, e));
      },
      sendNotification: ({ customerId, message }) => {
        return Future.fromPromise(notificationService.send(customerId, message)).mapError(
          (e) => new ActivityError("NOTIFICATION_FAILED", e.message, e),
        );
      },
    },
  },
});
```

```typescript [3. Implement Workflow]
import { declareWorkflow } from "@temporal-contract/worker/workflow";
import { orderContract } from "./contract";

export const processOrder = declareWorkflow({
  workflowName: "processOrder",
  contract: orderContract,
  implementation: async ({ activities }, { orderId, customerId, amount }) => {
    const { transactionId } = await activities.processPayment({ customerId, amount });
    await activities.sendNotification({ customerId, message: `Order ${orderId} confirmed!` });
    return { status: "success", transactionId };
  },
});
```

```typescript [4. Call from Client]
import { TypedClient } from "@temporal-contract/client";
import { Connection, Client } from "@temporalio/client";
import { orderContract } from "./contract";

const connection = await Connection.connect({ address: "localhost:7233" });
const temporalClient = new Client({ connection });
const client = TypedClient.create(orderContract, temporalClient);

const future = client.executeWorkflow("processOrder", {
  workflowId: "order-123",
  args: { orderId: "ORD-123", customerId: "CUST-456", amount: 99.99 },
});

const result = await future;

result.match({
  Ok: (output) => console.log(output.status), // ✅ 'success' | 'failed'
  Error: (error) => console.error("Failed:", error),
});
```

:::
