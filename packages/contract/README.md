# @temporal-contract/contract

> Contract builder and type definitions for Temporal workflows and activities

[![npm version](https://img.shields.io/npm/v/@temporal-contract/contract.svg?logo=npm)](https://www.npmjs.com/package/@temporal-contract/contract)

## Installation

```bash
pnpm add @temporal-contract/contract zod
```

## Quick Example

```typescript
import { defineContract } from "@temporal-contract/contract";
import { z } from "zod";

export const myContract = defineContract({
  taskQueue: "orders",
  workflows: {
    processOrder: {
      input: z.object({ orderId: z.string() }),
      output: z.object({ success: z.boolean() }),
      activities: {
        /* ... */
      },
    },
  },
});
```

## Documentation

📖 **[Read the full documentation →](https://btravers.github.io/temporal-contract)**

- [API Reference](https://btravers.github.io/temporal-contract/api/contract)
- [Getting Started](https://btravers.github.io/temporal-contract/guide/getting-started)
- [Core Concepts](https://btravers.github.io/temporal-contract/guide/core-concepts)

## License

MIT
