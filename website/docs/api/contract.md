# @temporal-contract/contract

Core package for defining type-safe Temporal contracts.

## Installation

```bash
pnpm add @temporal-contract/contract zod
```

## API

### defineContract

Define a type-safe contract for Temporal workflows.

```typescript
import { defineContract } from '@temporal-contract/contract';
import { z } from 'zod';

const contract = defineContract({
  taskQueue: 'my-queue',
  activities: { /* ... */ },
  workflows: { /* ... */ }
});
```

See [Getting Started](/guide/getting-started) for complete examples.
