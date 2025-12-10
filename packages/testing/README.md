# @temporal-contract/testing

Shared testing utilities for temporal-contract integration tests.

## Features

- **Testcontainers Integration**: Automatically starts a Temporal server in a Docker container for integration tests
- **Vitest Setup**: Pre-configured setup for Vitest with global test lifecycle
- **Connection Management**: Handles Temporal connection setup and cleanup

## Installation

This package is internal to the monorepo and used by sample projects for integration testing.

```bash
pnpm add -D @temporal-contract/testing
```

## Usage

### In vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: '@temporal-contract/testing/global-setup',
    testTimeout: 60000,
  },
});
```

### In your tests

```typescript
import { describe, expect } from 'vitest';
import { getTemporalConnection } from '@temporal-contract/testing';
import { TypedClient } from '@temporal-contract/client';
import { it as baseIt } from "@temporal-contract/testing/extension";

const it = baseIt.extend<{
  worker: Worker;
  client: TypedClient<typeof orderProcessingContract>;
}>({
  worker: [
    async ({ workerConnection }, use) => {
      // Create and start worker
      const worker = await Worker.create({
        connection: workerConnection,
        namespace: "default",
        taskQueue: orderProcessingContract.taskQueue,
        workflowsPath: workflowPath("application/workflows"),
        activities: activitiesHandler.activities,
      });

      // Start worker in background
      worker.run().catch((err) => {
        console.error("Worker failed:", err);
      });

      await vi.waitFor(() => worker.getState() === "RUNNING", { interval: 100 });

      await use(worker);

      worker.shutdown();

      await vi.waitFor(() => worker.getState() === "STOPPED", { interval: 100 });
    },
    { auto: true },
  ],
  client: async ({ clientConnection }, use) => {
    // Create typed client
    const client = TypedClient.create(orderProcessingContract, {
      connection: clientConnection,
      namespace: "default",
    });

    await use(client);
  },
});

describe('Order Processing Workflow', () => {
  it('should process an order successfully', async () => {
    // Your test code here
  });
});
```

## Requirements

- Docker must be running on the host machine
- Testcontainers requires Docker API access

## Environment Variables

- `TESTCONTAINERS_RYUK_DISABLED`: Set to `true` to disable Ryuk container (useful in CI)
