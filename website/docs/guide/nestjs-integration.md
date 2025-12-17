# NestJS Integration

The `@temporal-contract/worker-nestjs` package provides seamless integration between temporal-contract and NestJS, inspired by [oRPC's decorator-based pattern](https://orpc.dev/docs/openapi/integrations/implement-contract-in-nest).

## Installation

```bash
pnpm add @temporal-contract/worker-nestjs @nestjs/common @nestjs/core reflect-metadata
```

## Key Features

- **Decorator-based API** - Use `@ImplementActivity` to bind contract activities to service methods
- **Full DI Support** - Leverage NestJS dependency injection in activity implementations
- **Type Safety** - Compile-time type checking with automatic validation
- **Modular Architecture** - Organize activities using familiar NestJS module patterns

## Quick Start

### 1. Define Activities with Decorators

Create services with the `@ImplementActivity` decorator to bind contract activities:

```typescript
// services/payment.service.ts
import { Injectable } from '@nestjs/common';
import { ImplementActivity } from '@temporal-contract/worker-nestjs/activity';
import { Future } from '@temporal-contract/boxed';
import { ActivityError } from '@temporal-contract/worker/activity';
import { orderContract } from '../contract';

@Injectable()
export class PaymentService {
  constructor(private readonly paymentGateway: PaymentGateway) {}

  @ImplementActivity(orderContract, 'processPayment')
  processPayment(args: { customerId: string; amount: number }) {
    return Future.fromPromise(
      this.paymentGateway.charge(args.customerId, args.amount)
    ).mapError(
      error => new ActivityError('PAYMENT_FAILED', error.message, error)
    );
  }

  @ImplementActivity(orderContract, 'refundPayment')
  refundPayment(transactionId: string) {
    return Future.fromPromise(
      this.paymentGateway.refund(transactionId)
    ).mapError(
      error => new ActivityError('REFUND_FAILED', error.message, error)
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
import { PaymentService } from './services/payment.service';
import { InventoryService } from './services/inventory.service';
import { NotificationService } from './services/notification.service';

export const ActivitiesModule = createActivitiesModule({
  contract: orderContract,
  providers: [
    PaymentService,
    InventoryService,
    NotificationService,
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

## Dependency Injection

The NestJS integration supports full dependency injection in activity services:

```typescript
@Injectable()
export class InventoryService {
  constructor(
    private readonly inventoryRepository: InventoryRepository,
    private readonly logger: LoggerService,
    private readonly config: ConfigService,
  ) {}

  @ImplementActivity(orderContract, 'reserveInventory')
  async reserveInventory(items: Array<{ productId: string; quantity: number }>) {
    this.logger.log('Reserving inventory', { items });

    return Future.fromPromise(
      this.inventoryRepository.reserve(items)
    ).mapError(
      error => new ActivityError('INVENTORY_RESERVATION_FAILED', error.message, error)
    );
  }
}
```

## Multiple Activities per Service

You can define multiple activities in a single service:

```typescript
@Injectable()
export class NotificationService {
  constructor(private readonly emailClient: EmailClient) {}

  @ImplementActivity(orderContract, 'sendOrderConfirmation')
  sendOrderConfirmation(args: { customerId: string; orderId: string }) {
    return Future.fromPromise(
      this.emailClient.send({
        to: args.customerId,
        subject: 'Order Confirmation',
        body: `Your order ${args.orderId} has been confirmed`,
      })
    ).mapError(
      error => new ActivityError('EMAIL_SEND_FAILED', error.message, error)
    );
  }

  @ImplementActivity(orderContract, 'sendShippingNotification')
  sendShippingNotification(args: { customerId: string; trackingNumber: string }) {
    return Future.fromPromise(
      this.emailClient.send({
        to: args.customerId,
        subject: 'Order Shipped',
        body: `Your order has shipped. Tracking: ${args.trackingNumber}`,
      })
    ).mapError(
      error => new ActivityError('EMAIL_SEND_FAILED', error.message, error)
    );
  }
}
```

## Workflow Organization

While Temporal workflows cannot directly use NestJS DI due to workflow isolation requirements, the package provides decorators for organizing workflow implementations:

```typescript
@Injectable()
export class OrderWorkflowService {
  @ImplementWorkflow(orderContract, 'processOrder')
  getProcessOrderImplementation() {
    return async (context, args) => {
      const payment = await context.activities.processPayment({
        customerId: args.customerId,
        amount: args.amount,
      });

      if (payment.isError()) {
        throw new Error('Payment failed');
      }

      return { orderId: args.orderId, status: 'completed' };
    };
  }
}
```

Note: For production use, workflow implementations must still be exported from separate files as required by Temporal.

## API Reference

### `@ImplementActivity(contract, activityName)`

Decorator that binds a contract activity to a service method.

**Parameters:**

- `contract` - The contract definition
- `activityName` - Name of the activity in the contract

**Example:**

```typescript
@ImplementActivity(myContract, 'processPayment')
processPayment(args: PaymentArgs) {
  // Implementation
}
```

### `createActivitiesModule(options)`

Factory function that creates a NestJS dynamic module for activities.

**Parameters:**

- `options.contract` - Contract definition
- `options.providers` - Array of provider classes with `@ImplementActivity` decorators
- `options.additionalActivities` - Optional additional activity implementations

**Returns:** `DynamicModule`

**Example:**

```typescript
export const ActivitiesModule = createActivitiesModule({
  contract: orderContract,
  providers: [PaymentService, InventoryService],
});
```

### `ACTIVITIES_HANDLER_TOKEN`

Injection token for accessing the activities handler.

**Example:**

```typescript
const activitiesHandler = app.get(ACTIVITIES_HANDLER_TOKEN);
```

## Comparison with oRPC

This integration is inspired by [oRPC's NestJS pattern](https://orpc.dev/docs/openapi/integrations/implement-contract-in-nest):

| Feature              | oRPC            | @temporal-contract/worker-nestjs |
| -------------------- | --------------- | -------------------------------- |
| Decorator-based      | ✅ `@Implement` | ✅ `@ImplementActivity`          |
| Contract-first       | ✅              | ✅                               |
| Type-safe            | ✅              | ✅                               |
| DI Support           | ✅              | ✅                               |
| Automatic validation | ✅              | ✅                               |
| Domain               | RPC endpoints   | Temporal workflows               |

## Best Practices

1. **Keep activities focused** - Each activity should do one thing well
2. **Use dependency injection** - Leverage NestJS DI for testability and maintainability
3. **Handle errors explicitly** - Always wrap errors in `ActivityError` for proper retry behavior
4. **Organize by domain** - Group related activities in the same service
5. **Use the Result pattern** - Return `Future<Result<T, ActivityError>>` for explicit error handling

## Examples

See the complete [order-processing-worker sample](/examples/basic-order-processing) for a full example of a worker implementation.

## Next Steps

- [Activity Handlers](/guide/activity-handlers) - Learn more about implementing activities
- [Result Pattern](/guide/result-pattern) - Understand explicit error handling
- [Worker Implementation](/guide/worker-implementation) - General worker setup guide
