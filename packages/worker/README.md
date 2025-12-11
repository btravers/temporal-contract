# @temporal-contract/worker

> Type-safe worker implementation for Temporal

[![npm version](https://img.shields.io/npm/v/@temporal-contract/worker.svg?logo=npm)](https://www.npmjs.com/package/@temporal-contract/worker)

## Installation

```bash
pnpm add @temporal-contract/worker @temporal-contract/contract @temporalio/workflow zod
```

## Quick Example

```typescript
// activities.ts
import { declareActivitiesHandler } from '@temporal-contract/worker/activity';

export const activities = declareActivitiesHandler({
  contract: myContract,
  activities: {
    sendEmail: async ({ to, body }) => ({ sent: true })
  }
});

// workflows.ts
import { declareWorkflow } from '@temporal-contract/worker/workflow';

export const processOrder = declareWorkflow({
  workflowName: 'processOrder',
  contract: myContract,
  implementation: async (context, input) => {
    await context.activities.sendEmail({ to: 'user@example.com', body: 'Done!' });
    return { success: true };
  }
});
```

## Documentation

📖 **[Read the full documentation →](https://btravers.github.io/temporal-contract)**

- [API Reference](https://btravers.github.io/temporal-contract/api/worker)
- [Worker Implementation Guide](https://btravers.github.io/temporal-contract/guide/worker-implementation)
- [Examples](https://btravers.github.io/temporal-contract/examples/)

## License

MIT
