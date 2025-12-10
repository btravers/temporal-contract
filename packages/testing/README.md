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
    globalSetup: './vitest.global-setup.ts',
    testTimeout: 60000,
  },
});
```

### In vitest.global-setup.ts

```typescript
import { setupTemporalTestContainer } from '@temporal-contract/testing';

export default setupTemporalTestContainer;
```

### In your tests

```typescript
import { describe, it, expect } from 'vitest';
import { getTemporalConnection } from '@temporal-contract/testing';
import { TypedClient } from '@temporal-contract/client';

describe('Order Processing Workflow', () => {
  it('should process an order successfully', async () => {
    const connection = await getTemporalConnection();
    const client = TypedClient.create(myContract, { connection });

    // Your test code here
  });
});
```

## API

### `setupTemporalTestContainer()`

Global setup function that starts a Temporal container before all tests and stops it after all tests.

### `getTemporalConnection()`

Returns a connection to the Temporal server running in the container.

## Requirements

- Docker must be running on the host machine
- Testcontainers requires Docker API access

## Environment Variables

- `TESTCONTAINERS_RYUK_DISABLED`: Set to `true` to disable Ryuk container (useful in CI)
