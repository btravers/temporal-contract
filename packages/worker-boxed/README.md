# @temporal-contract/worker-boxed

> Worker with Result/Future pattern for explicit error handling

[![npm version](https://img.shields.io/npm/v/@temporal-contract/worker-boxed.svg?logo=npm)](https://www.npmjs.com/package/@temporal-contract/worker-boxed)

## Installation

```bash
pnpm add @temporal-contract/worker-boxed @swan-io/boxed
pnpm add @temporalio/worker @temporalio/workflow zod
```

## Quick Example

```typescript
// activities.ts
import { declareActivitiesHandler, Result, Future } from '@temporal-contract/worker-boxed/activity';

const processPayment = ({ amount }) => {
  return Future.fromPromise(paymentService.charge(amount))
    .map(txId => ({ transactionId: txId }))
    .mapError(error => ({ code: 'PAYMENT_FAILED', message: error.message }));
};

export const activities = declareActivitiesHandler({
  contract,
  activities: { processPayment }
});
```

## Documentation

📖 **[Read the full documentation →](https://btravers.github.io/temporal-contract)**

- [API Reference](https://btravers.github.io/temporal-contract/api/worker-boxed)
- [Result Pattern Guide](https://btravers.github.io/temporal-contract/guide/result-pattern)
- [Examples](https://btravers.github.io/temporal-contract/examples/boxed-order-processing)

## License

MIT
