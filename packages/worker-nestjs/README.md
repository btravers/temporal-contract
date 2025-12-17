# @temporal-contract/worker-nestjs

> NestJS integration for temporal-contract workers

[![npm version](https://img.shields.io/npm/v/@temporal-contract/worker-nestjs.svg?logo=npm)](https://www.npmjs.com/package/@temporal-contract/worker-nestjs)

## Installation

```bash
pnpm add @temporal-contract/worker-nestjs @nestjs/common @nestjs/core reflect-metadata
```

## Quick Example

```typescript
// order-activities.handler.ts
import { Injectable } from '@nestjs/common';
import { ActivitiesHandler } from '@temporal-contract/worker-nestjs/activity';
import { Future } from '@temporal-contract/boxed';
import { ActivityError } from '@temporal-contract/worker/activity';
import type { ActivityImplementations } from '@temporal-contract/worker/activity';

@Injectable()
@ActivitiesHandler(orderContract)
export class OrderActivitiesHandler implements ActivityImplementations<typeof orderContract> {
  constructor(private readonly gateway: PaymentGateway) {}

  processPayment(args: { customerId: string; amount: number }) {
    return Future.fromPromise(
      this.gateway.charge(args)
    ).mapError(
      error => new ActivityError('PAYMENT_FAILED', error.message, error)
    );
  }

  // ... implement all other activities
}

// activities.module.ts
import { createActivitiesModule } from '@temporal-contract/worker-nestjs/activity';

export const ActivitiesModule = createActivitiesModule({
  contract: orderContract,
  handler: OrderActivitiesHandler,
  providers: [PaymentGateway],
});

// worker.ts
import { NestFactory } from '@nestjs/core';
import { ACTIVITIES_HANDLER_TOKEN } from '@temporal-contract/worker-nestjs/activity';

const app = await NestFactory.createApplicationContext(AppModule);
const activitiesHandler = app.get(ACTIVITIES_HANDLER_TOKEN);

const worker = await Worker.create({
  workflowsPath: require.resolve('./workflows'),
  activities: activitiesHandler.activities,
  taskQueue: activitiesHandler.contract.taskQueue,
});
```

## Features

- **`@ActivitiesHandler` decorator**: Multi-handler approach for ultimate type safety (inspired by ts-rest)
- **`createActivitiesModule()`**: Create NestJS modules with full DI support
- **Type Safety**: One handler implements all activities from a contract
- **Automatic Validation**: Input/output validation at network boundaries

## Documentation

📖 **[Read the full documentation →](https://btravers.github.io/temporal-contract)**

- [NestJS Integration Guide](https://btravers.github.io/temporal-contract/guide/nestjs-integration)
- [API Reference](https://btravers.github.io/temporal-contract/api/worker-nestjs)
- [Examples](https://btravers.github.io/temporal-contract/examples/)

## License

MIT
