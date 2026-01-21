# @temporal-contract/testing

Testing utilities for workflows and activities.

## Installation

```bash
pnpm add -D @temporal-contract/testing
```

## Overview

The `@temporal-contract/testing` package provides utilities for testing workflows and activities with a real Temporal server using testcontainers. It integrates seamlessly with Vitest to provide a complete testing solution.

## Features

- **Testcontainers Integration** - Automatically starts and stops a Temporal server for tests
- **Vitest Extension** - Provides `clientConnection` and `workerConnection` in test context
- **Global Setup** - Handles Temporal server lifecycle
- **Type-safe** - Full TypeScript support

## Setup

### 1. Configure Vitest

Add the testing extension to your Vitest config:

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: "@temporal-contract/testing/global-setup",
  },
});
```

### 2. Use in Tests

Import the extended `it` function from the testing package:

```typescript
import { it, expect } from "@temporal-contract/testing/extension";

it("workflow execution", async ({ clientConnection, workerConnection }) => {
  // clientConnection is a @temporalio/client Connection instance
  // workerConnection is a @temporalio/worker NativeConnection instance

  // Use clientConnection for client operations
  const client = new WorkflowClient({ connection: clientConnection });

  const result = await client.execute("myWorkflow", {
    taskQueue: "test",
    workflowId: "test-workflow",
    args: [{ input: "test" }],
  });

  expect(result).toBeDefined();
});
```

## Example Integration Test

Here's a complete example of testing a workflow:

```typescript
import { it, expect } from "@temporal-contract/testing/extension";
import { Worker } from "@temporalio/worker";
import { TypedClient } from "@temporal-contract/client";
import { orderContract } from "./contract";
import { processOrder } from "./workflows";
import { activitiesHandler } from "./activities";

it("order processing workflow completes successfully", async ({
  clientConnection,
  workerConnection,
}) => {
  // Create worker
  const worker = await Worker.create({
    connection: workerConnection,
    taskQueue: orderContract.taskQueue,
    workflowsPath: require.resolve("./workflows"),
    activities: activitiesHandler.activities,
  });

  // Start worker
  const workerRun = worker.run();

  // Create typed client
  const client = TypedClient.create(orderContract, {
    connection: clientConnection,
  });

  // Execute workflow
  const result = await client.executeWorkflow("processOrder", {
    workflowId: `test-${Date.now()}`,
    args: {
      orderId: "ORD-123",
      customerId: "CUST-456",
      items: [{ sku: "ITEM-1", quantity: 2 }],
    },
  });

  // Assert results
  expect(result.status).toBe("completed");
  expect(result.transactionId).toBeDefined();

  // Cleanup
  worker.shutdown();
  await workerRun;
});
```

## API Reference

### Global Setup

`@temporal-contract/testing/global-setup`

Starts a Temporal server using testcontainers before all tests and stops it after all tests complete.

### Extension

`@temporal-contract/testing/extension`

Provides an extended `it` function with test context:

- `clientConnection: Connection` - Temporal client connection for executing workflows
- `workerConnection: NativeConnection` - Temporal native connection for workers

Import this instead of Vitest's `it`:

```typescript
import { it, expect } from "@temporal-contract/testing/extension";
```

## Best Practices

1. **Use unique workflow IDs** - Prefix with test name or use timestamps
2. **Clean up workers** - Always shutdown workers after tests
3. **Isolate tests** - Each test should use its own workflow ID
4. **Mock external dependencies** - Mock external services in activities

## See Also

- [Getting Started Guide](/guide/getting-started)
- [Examples](/examples/)
- [Worker Implementation](/guide/worker-implementation)
