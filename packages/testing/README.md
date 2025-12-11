# @temporal-contract/testing

> Testing utilities for temporal-contract integration tests

[![npm version](https://img.shields.io/npm/v/@temporal-contract/testing.svg?logo=npm)](https://www.npmjs.com/package/@temporal-contract/testing)

## Installation

```bash
pnpm add -D @temporal-contract/testing
```

## Quick Example

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: '@temporal-contract/testing/global-setup',
    testTimeout: 60000,
  },
});
```

## Documentation

📖 **[Read the full documentation →](https://btravers.github.io/temporal-contract)**

- [API Reference](https://btravers.github.io/temporal-contract/api/testing)
- [Examples](https://btravers.github.io/temporal-contract/examples/)

## License

MIT
