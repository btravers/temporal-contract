# @temporal-contract/worker-nestjs

NestJS integration for `@temporal-contract/worker` providing a declarative way to define Temporal workers and activities using NestJS modules and decorators.

## Features

- **ConfigurableModuleBuilder Integration**: Use NestJS's `ConfigurableModuleBuilder` for dynamic module configuration
- **Single Handler Approach**: Define activities as methods in a service class (inspired by ts-rest)
- **Dependency Injection**: Full access to NestJS DI container in activities
- **Type Safety**: Fully typed activities and workflows with contract validation
- **Workflow-specific Activities**: Support for organizing activities by workflow

## Installation

```bash
pnpm add @temporal-contract/worker-nestjs
```

## Quick Start

### 1. Define Your Contract

```typescript
// contract.ts
import { defineContract, defineActivity, defineWorkflow } from '@temporal-contract/contract';
import { z } from 'zod';

export const myContract = defineContract({
  taskQueue: 'my-queue',
  workflows: {
    processOrder: defineWorkflow({
      input: z.object({ orderId: z.string() }),
      output: z.object({ success: z.boolean() }),
      activities: {
        validateOrder: defineActivity({
          input: z.object({ orderId: z.string() }),
          output: z.object({ valid: z.boolean() }),
        }),
        processPayment: defineActivity({
          input: z.object({ orderId: z.string(), amount: z.number() }),
          output: z.object({ transactionId: z.string() }),
        }),
      },
    }),
  },
});
```

### 2. Create Activity Handlers (Single Handler Approach)

```typescript
// activities.service.ts
import { Injectable } from '@nestjs/common';
import { TemporalActivity } from '@temporal-contract/worker-nestjs';
import { Future, Result } from '@temporal-contract/boxed';
import { ActivityError } from '@temporal-contract/worker/activity';

@Injectable()
export class OrderActivitiesService {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly orderService: OrderService,
  ) {}

  @TemporalActivity('processOrder', 'validateOrder')
  async validateOrder(input: { orderId: string }): Promise<Future<Result<{ valid: boolean }, ActivityError>>> {
    return Future.make(async (resolve) => {
      try {
        const isValid = await this.orderService.validate(input.orderId);
        resolve(Result.Ok({ valid: isValid }));
      } catch (error) {
        resolve(Result.Error(
          new ActivityError('ORDER_VALIDATION_FAILED', 'Failed to validate order', error)
        ));
      }
    });
  }

  @TemporalActivity('processOrder', 'processPayment')
  async processPayment(input: { orderId: string; amount: number }): Promise<Future<Result<{ transactionId: string }, ActivityError>>> {
    return Future.make(async (resolve) => {
      try {
        const txId = await this.paymentService.charge(input.orderId, input.amount);
        resolve(Result.Ok({ transactionId: txId }));
      } catch (error) {
        resolve(Result.Error(
          new ActivityError('PAYMENT_FAILED', 'Payment processing failed', error)
        ));
      }
    });
  }
}
```

### 3. Configure the Temporal Module

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TemporalModule } from '@temporal-contract/worker-nestjs';
import { myContract } from './contract';
import { OrderActivitiesService } from './activities.service';

@Module({
  imports: [
    TemporalModule.forRoot({
      contract: myContract,
      connection: {
        address: 'localhost:7233',
      },
      workflowsPath: require.resolve('./workflows'),
    }),
  ],
  providers: [OrderActivitiesService],
})
export class AppModule {}
```

### 4. Start the Worker

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TemporalService } from '@temporal-contract/worker-nestjs';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const temporalService = app.get(TemporalService);

  await temporalService.start();
  console.log('Temporal worker started');
}

bootstrap();
```

## Advanced Usage

### Async Configuration

```typescript
TemporalModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    contract: myContract,
    connection: {
      address: configService.get('TEMPORAL_ADDRESS'),
    },
    workflowsPath: require.resolve('./workflows'),
  }),
  inject: [ConfigService],
})
```

### Multiple Activity Services

You can organize activities across multiple services:

```typescript
@Injectable()
export class PaymentActivitiesService {
  @TemporalActivity('processOrder', 'processPayment')
  async processPayment(input: any) { /* ... */ }
}

@Injectable()
export class NotificationActivitiesService {
  @TemporalActivity('processOrder', 'sendNotification')
  async sendNotification(input: any) { /* ... */ }
}
```

## API Reference

### `TemporalModule`

Main module for Temporal worker integration.

#### `forRoot(options: TemporalModuleOptions)`

Configure the module synchronously.

#### `forRootAsync(options: TemporalModuleAsyncOptions)`

Configure the module asynchronously using factories, classes, or existing providers.

### `@TemporalActivity(workflowName: string, activityName: string)`

Decorator to mark a method as a Temporal activity handler.

### `TemporalService`

Service providing access to the Temporal worker lifecycle.

#### `start(): Promise<void>`

Start the Temporal worker.

#### `stop(): Promise<void>`

Stop the Temporal worker.

## License

MIT
