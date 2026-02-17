# @temporal-contract/testing

> Testing utilities for temporal-contract integration tests

[![npm version](https://img.shields.io/npm/v/@temporal-contract/testing.svg?logo=npm)](https://www.npmjs.com/package/@temporal-contract/testing)

## Installation

```bash
pnpm add -D @temporal-contract/testing
```

## Quick Example

### Global Setup

Configure Vitest to start a Temporal server before all tests:

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: "@temporal-contract/testing/global-setup",
    testTimeout: 60000,
  },
});
```

### Test Extension

Use the `it` extension for automatic connection management:

```typescript
// my-workflow.spec.ts
import { it } from "@temporal-contract/testing/extension";
import { expect } from "vitest";

it("should execute workflow", async ({ clientConnection, workerConnection }) => {
  // clientConnection: Connection from @temporalio/client (auto-connected, auto-closed)
  // workerConnection: NativeConnection from @temporalio/worker (auto-connected)

  const client = new Client({ connection: clientConnection });
  // ... use client and workerConnection in your test
});
```

## Documentation

📖 **[Read the full documentation →](https://btravers.github.io/temporal-contract)**

- [API Reference](https://btravers.github.io/temporal-contract/api/testing)
- [Examples](https://btravers.github.io/temporal-contract/examples/)

## License

MIT
