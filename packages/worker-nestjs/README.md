# @temporal-contract/worker-nestjs

NestJS integration for temporal-contract workers with decorators and dependency injection support.

## Overview

This package provides NestJS integration for temporal-contract, inspired by [oRPC's NestJS integration](https://orpc.dev/docs/openapi/integrations/implement-contract-in-nest). It enables you to:

- Use decorators to bind contract activities to NestJS service methods
- Leverage NestJS dependency injection for activity implementations
- Organize your Temporal activities using familiar NestJS patterns
- Benefit from type-safe activity implementations with automatic validation

## Installation

```bash
pnpm add @temporal-contract/worker-nestjs
```

## Features

- **`@ImplementActivity` decorator**: Bind contract activities to service methods
- **`createActivitiesModule()`**: Create a NestJS module for activities
- **Dependency Injection**: Full support for NestJS DI in activity implementations
- **Type Safety**: Compile-time type checking for activity implementations
- **Automatic Validation**: Input/output validation at network boundaries
- **Result Pattern**: Explicit error handling with Future/Result pattern

## Usage

### 1. Define Activities with Decorators

Create services with activity implementations using the `@ImplementActivity` decorator:

```typescript
// payment.service.ts
import { Injectable } from '@nestjs/common';
import { ImplementActivity } from '@temporal-contract/worker-nestjs/activity';
import { Future, Result } from '@temporal-contract/boxed';
import { ActivityError } from '@temporal-contract/worker/activity';
import { orderContract } from './contract';

@Injectable()
export class PaymentService {
  constructor(private readonly paymentGateway: PaymentGateway) {}

  @ImplementActivity(orderContract, 'processPayment')
  processPayment(args: { customerId: string; amount: number }) {
    return Future.fromPromise(
      this.paymentGateway.charge(args)
    ).mapError(
      error => new ActivityError('PAYMENT_FAILED', error.message, error)
    );
  }
}
```

### 2. Create Activities Module

Use `createActivitiesModule()` to create a NestJS module:

```typescript
// activities.module.ts
import { createActivitiesModule } from '@temporal-contract/worker-nestjs/activity';
import { orderContract } from './contract';
import { PaymentService } from './payment.service';
import { InventoryService } from './inventory.service';
import { NotificationService } from './notification.service';

export const ActivitiesModule = createActivitiesModule({
  contract: orderContract,
  providers: [PaymentService, InventoryService, NotificationService],
});
```

### 3. Import in App Module

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ActivitiesModule } from './activities/activities.module';

@Module({
  imports: [ActivitiesModule],
})
export class AppModule {}
```

### 4. Bootstrap Worker

```typescript
// worker.ts
import { NestFactory } from '@nestjs/core';
import { Worker } from '@temporalio/worker';
import { AppModule } from './app.module';
import { ACTIVITIES_HANDLER_TOKEN } from '@temporal-contract/worker-nestjs/activity';

async function bootstrap() {
  // Create NestJS application context
  const app = await NestFactory.createApplicationContext(AppModule);

  // Get the activities handler
  const activitiesHandler = app.get(ACTIVITIES_HANDLER_TOKEN);

  // Create Temporal worker
  const worker = await Worker.create({
    workflowsPath: require.resolve('./workflows'),
    activities: activitiesHandler.activities,
    taskQueue: activitiesHandler.contract.taskQueue,
  });

  // Start the worker
  await worker.run();
}

bootstrap().catch(console.error);
```

## Complete Example

Here's a complete example with multiple activities:

```typescript
// services/inventory.service.ts
import { Injectable } from '@nestjs/common';
import { ImplementActivity } from '@temporal-contract/worker-nestjs/activity';
import { Future, Result } from '@temporal-contract/boxed';
import { ActivityError } from '@temporal-contract/worker/activity';
import { orderContract } from '../contract';

@Injectable()
export class InventoryService {
  constructor(private readonly inventoryDb: InventoryDatabase) {}

  @ImplementActivity(orderContract, 'reserveInventory')
  reserveInventory(items: { productId: string; quantity: number }[]) {
    return Future.fromPromise(
      this.inventoryDb.reserve(items)
    ).mapError(
      error => new ActivityError('INVENTORY_RESERVATION_FAILED', error.message, error)
    );
  }

  @ImplementActivity(orderContract, 'releaseInventory')
  releaseInventory(reservationId: string) {
    return Future.fromPromise(
      this.inventoryDb.release(reservationId)
    ).mapError(
      error => new ActivityError('INVENTORY_RELEASE_FAILED', error.message, error)
    );
  }
}

// services/notification.service.ts
import { Injectable } from '@nestjs/common';
import { ImplementActivity } from '@temporal-contract/worker-nestjs/activity';
import { Future, Result } from '@temporal-contract/boxed';
import { ActivityError } from '@temporal-contract/worker/activity';
import { orderContract } from '../contract';

@Injectable()
export class NotificationService {
  constructor(private readonly emailClient: EmailClient) {}

  @ImplementActivity(orderContract, 'sendNotification')
  sendNotification(args: { customerId: string; subject: string; message: string }) {
    return Future.fromPromise(
      this.emailClient.send(args)
    ).mapError(
      error => new ActivityError('NOTIFICATION_FAILED', error.message, error)
    );
  }
}

// activities.module.ts
import { Module } from '@nestjs/common';
import { createActivitiesModule } from '@temporal-contract/worker-nestjs/activity';
import { orderContract } from './contract';
import { PaymentService } from './services/payment.service';
import { InventoryService } from './services/inventory.service';
import { NotificationService } from './services/notification.service';

export const ActivitiesModule = createActivitiesModule({
  contract: orderContract,
  providers: [PaymentService, InventoryService, NotificationService],
});

// app.module.ts
import { Module } from '@nestjs/common';
import { ActivitiesModule } from './activities/activities.module';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    ActivitiesModule,
  ],
})
export class AppModule {}
```

## Workflows

While activities benefit from NestJS dependency injection, Temporal workflows must be defined in separate files due to Temporal's workflow isolation requirements. The package also provides workflow decorators for organizing workflow logic:

```typescript
// workflow.service.ts
import { Injectable } from '@nestjs/common';
import { ImplementWorkflow } from '@temporal-contract/worker-nestjs/workflow';
import { orderContract } from './contract';

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

However, for production use, workflow implementations should be exported from separate workflow files as required by Temporal.

## API Reference

### Decorators

#### `@ImplementActivity(contract, activityName)`

Binds a contract activity to a service method.

- **Parameters:**
  - `contract`: The contract definition
  - `activityName`: Name of the activity in the contract
- **Usage:** Method decorator for activity implementations

### Module Helpers

#### `createActivitiesModule(options)`

Creates a NestJS module for activities.

- **Parameters:**
  - `options.contract`: Contract definition
  - `options.providers`: Array of provider classes with @ImplementActivity decorators
  - `options.additionalActivities`: Optional additional activity implementations
- **Returns:** DynamicModule

### Tokens

#### `ACTIVITIES_HANDLER_TOKEN`

Injection token for accessing the activities handler.

```typescript
const activitiesHandler = app.get(ACTIVITIES_HANDLER_TOKEN);
```

## Comparison with oRPC

This package is inspired by [oRPC's NestJS integration](https://orpc.dev/docs/openapi/integrations/implement-contract-in-nest):

| Feature              | oRPC            | temporal-contract-nestjs |
| -------------------- | --------------- | ------------------------ |
| Decorator-based      | ✅ `@Implement` | ✅ `@ImplementActivity`  |
| Contract-first       | ✅              | ✅                       |
| Type-safe            | ✅              | ✅                       |
| DI Support           | ✅              | ✅                       |
| Automatic validation | ✅              | ✅                       |
| Domain               | RPC             | Temporal workflows       |

## License

MIT
