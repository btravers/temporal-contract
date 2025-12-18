# NestJS Integration

The `@temporal-contract/worker-nestjs` package provides seamless integration between temporal-contract and NestJS, using a multi-handler approach inspired by [ts-rest](https://ts-rest.com/server/nest#multi-handler-approach---ultimate-type-safety) for ultimate type safety.

## Installation

```bash
pnpm add @temporal-contract/worker-nestjs @nestjs/common @nestjs/core reflect-metadata
```

## Key Features

- **Multi-handler approach** - One handler class implements all activities from a contract
- **Ultimate type safety** - Implements `ActivityImplementations<typeof contract>`
- **Full DI Support** - Leverage NestJS dependency injection in activity implementations
- **Modular Architecture** - Organize activities using familiar NestJS module patterns

**Note**: Only activities benefit from NestJS DI. Workflows cannot use DI due to Temporal's workflow isolation requirements.

## Quick Start

### 1. Define an Activities Handler

Create a handler class that implements all activities from your contract:

```typescript
// activities/order-activities.handler.ts
import { Injectable } from '@nestjs/common';
import { ActivitiesHandler } from '@temporal-contract/worker-nestjs/activity';
import { Future } from '@temporal-contract/boxed';
import { ActivityError } from '@temporal-contract/worker/activity';
import type { ActivityImplementations } from '@temporal-contract/worker/activity';
import { orderContract } from '../contract';

@Injectable()
@ActivitiesHandler(orderContract)
export class OrderActivitiesHandler implements ActivityImplementations<typeof orderContract> {
  constructor(
    private readonly paymentGateway: PaymentGateway,
    private readonly inventoryRepo: InventoryRepository,
    private readonly emailService: EmailService,
  ) {}

  // Global activities
  log(args: { level: string; message: string }) {
    logger[args.level](args.message);
    return Future.value(Result.Ok(undefined));
  }

  sendNotification(args: { customerId: string; subject: string; message: string }) {
    return Future.fromPromise(
      this.emailService.send(args)
    ).mapError(
      error => new ActivityError('NOTIFICATION_FAILED', error.message, error)
    );
  }

  // Workflow-specific activities
  processPayment(args: { customerId: string; amount: number }) {
    return Future.fromPromise(
      this.paymentGateway.charge(args.customerId, args.amount)
    ).mapError(
      error => new ActivityError('PAYMENT_FAILED', error.message, error)
    );
  }

  refundPayment(transactionId: string) {
    return Future.fromPromise(
      this.paymentGateway.refund(transactionId)
    ).mapError(
      error => new ActivityError('REFUND_FAILED', error.message, error)
    );
  }

  reserveInventory(items: Array<{ productId: string; quantity: number }>) {
    return Future.fromPromise(
      this.inventoryRepo.reserve(items)
    ).mapError(
      error => new ActivityError('INVENTORY_RESERVATION_FAILED', error.message, error)
    );
  }

  releaseInventory(reservationId: string) {
    return Future.fromPromise(
      this.inventoryRepo.release(reservationId)
    ).mapError(
      error => new ActivityError('INVENTORY_RELEASE_FAILED', error.message, error)
    );
  }
}
```

### 2. Create Activities Module

Use `createActivitiesModule()` to create a NestJS dynamic module:

```typescript
// activities/activities.module.ts
import { createActivitiesModule } from '@temporal-contract/worker-nestjs/activity';
import { orderContract } from '../contract';
import { OrderActivitiesHandler } from './order-activities.handler';
import { PaymentGateway } from './services/payment-gateway';
import { InventoryRepository } from './services/inventory-repository';
import { EmailService } from './services/email.service';

export const ActivitiesModule = createActivitiesModule({
  contract: orderContract,
  handler: OrderActivitiesHandler,
  providers: [
    PaymentGateway,
    InventoryRepository,
    EmailService,
  ],
});
```

### 3. Import in App Module

Add the activities module to your application:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ActivitiesModule } from './activities/activities.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    DatabaseModule,
    ActivitiesModule,
  ],
})
export class AppModule {}
```

### 4. Bootstrap Worker

Create the Temporal worker using NestJS application context:

```typescript
// worker.ts
import { NestFactory } from '@nestjs/core';
import { Worker } from '@temporalio/worker';
import { AppModule } from './app.module';
import { ACTIVITIES_HANDLER_TOKEN } from '@temporal-contract/worker-nestjs/activity';

async function bootstrap() {
  // Create NestJS application context
  const app = await NestFactory.createApplicationContext(AppModule);

  // Get activities handler from DI container
  const activitiesHandler = app.get(ACTIVITIES_HANDLER_TOKEN);

  // Create Temporal worker
  const worker = await Worker.create({
    workflowsPath: require.resolve('./workflows'),
    activities: activitiesHandler.activities,
    taskQueue: activitiesHandler.contract.taskQueue,
  });

  console.log('Worker started successfully');
  await worker.run();
}

bootstrap().catch(console.error);
```

## Workflows

Workflows cannot use NestJS dependency injection due to Temporal's workflow isolation. Simply use `declareWorkflow` from the worker package:

```typescript
// workflows/order-workflow.ts
import { declareWorkflow } from '@temporal-contract/worker-nestjs/workflow';
import { orderContract } from '../contract';

export const processOrder = declareWorkflow({
  workflowName: 'processOrder',
  contract: orderContract,
  implementation: async (context, input) => {
    // Use activities
    const payment = await context.activities.processPayment({
      customerId: input.customerId,
      amount: input.totalAmount,
    });

    if (payment.isError()) {
      throw new Error('Payment failed');
    }

    return { orderId: input.orderId, status: 'completed' };
  },
});
```

## API Reference

### `@ActivitiesHandler(contract)`

Decorator that marks a handler class implementing all activities from a contract.

**Parameters:**

- `contract` - The contract definition

**Example:**

```typescript
@Injectable()
@ActivitiesHandler(myContract)
export class MyActivitiesHandler implements ActivityImplementations<typeof myContract> {
  // Implement all activities
}
```

### `createActivitiesModule(options)`

Factory function that creates a NestJS dynamic module for activities.

**Parameters:**

- `options.contract` - Contract definition
- `options.handler` - Handler class decorated with `@ActivitiesHandler`
- `options.providers` - Optional additional providers needed by the handler

**Returns:** `DynamicModule`

**Example:**

```typescript
export const ActivitiesModule = createActivitiesModule({
  contract: orderContract,
  handler: OrderActivitiesHandler,
  providers: [PaymentGateway, EmailService],
});
```

### `ACTIVITIES_HANDLER_TOKEN`

Injection token for accessing the activities handler.

**Example:**

```typescript
const activitiesHandler = app.get(ACTIVITIES_HANDLER_TOKEN);
```

## Comparison with ts-rest

This integration is inspired by [ts-rest's multi-handler approach](https://ts-rest.com/server/nest#multi-handler-approach---ultimate-type-safety):

| Feature              | ts-rest                     | @temporal-contract/worker-nestjs |
| -------------------- | --------------------------- | -------------------------------- |
| Multi-handler        | ✅ One handler per contract | ✅ One handler per contract      |
| Type-safe            | ✅                          | ✅                               |
| DI Support           | ✅                          | ✅ Activities only               |
| Automatic validation | ✅                          | ✅                               |
| Domain               | REST APIs                   | Temporal workflows               |

## Best Practices

1. **One handler per contract** - Keep all activity implementations in a single handler class
2. **Use dependency injection** - Leverage NestJS DI for services, repositories, and configurations
3. **Handle errors explicitly** - Always wrap errors in `ActivityError` for proper retry behavior
4. **Organize by domain** - Create separate contracts and handlers for different business domains
5. **Use the Result pattern** - Return `Future<Result<T, ActivityError>>` for explicit error handling

## Examples

See the [order-processing-worker-nestjs sample](/examples/nestjs-order-processing) for a complete example.

## Next Steps

- [Activity Handlers](/guide/activity-handlers) - Learn more about implementing activities
- [Result Pattern](/guide/result-pattern) - Understand explicit error handling
- [Worker Implementation](/guide/worker-implementation) - General worker setup guide
