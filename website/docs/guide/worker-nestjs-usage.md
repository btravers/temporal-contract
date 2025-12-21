# NestJS Worker Usage

Learn how to integrate temporal-contract workers with NestJS for full dependency injection support.

## Overview

The `@temporal-contract/worker-nestjs` package provides seamless integration between temporal-contract and NestJS, enabling you to use NestJS's powerful dependency injection system in your Temporal activities.

## Installation

```bash
pnpm add @temporal-contract/worker-nestjs @swan-io/boxed
```

## Quick Start

### 1. Create the Activities Provider

Create a provider that uses NestJS services to implement activities:

```typescript
// activities.provider.ts
import { Injectable } from '@nestjs/common';
import { declareActivitiesHandler, ActivityError } from '@temporal-contract/worker/activity';
import { Future, Result } from '@swan-io/boxed';
import { myContract } from './contract';
import { PaymentService } from './services/payment.service';
import { NotificationService } from './services/notification.service';

@Injectable()
export class ActivitiesProvider {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly notificationService: NotificationService,
  ) {}

  createActivities() {
    return declareActivitiesHandler({
      contract: myContract,
      activities: {
        // Global activities
        log: ({ level, message }) => {
          console.log(`[${level}] ${message}`);
          return Future.value(Result.Ok(undefined));
        },

        // Workflow-specific activities with DI
        processOrder: {
          processPayment: ({ customerId, amount }) => {
            return Future.fromPromise(
              this.paymentService.charge(customerId, amount)
            )
              .mapError((error) =>
                new ActivityError(
                  'PAYMENT_FAILED',
                  error instanceof Error ? error.message : 'Payment failed',
                  error
                )
              )
              .mapOk((transaction) => ({ transactionId: transaction.id }));
          },

          sendNotification: ({ customerId, message }) => {
            return Future.fromPromise(
              this.notificationService.send(customerId, message)
            )
              .mapError((error) =>
                new ActivityError(
                  'NOTIFICATION_FAILED',
                  error instanceof Error ? error.message : 'Notification failed',
                  error
                )
              )
              .mapOk(() => undefined);
          },
        },
      },
    });
  }
}
```

### 2. Configure the Temporal Module

Use `TemporalModule.forRootAsync` to configure the worker with your activities:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TemporalModule } from '@temporal-contract/worker-nestjs';
import { NativeConnection } from '@temporalio/worker';
import { myContract } from './contract';
import { ActivitiesProvider } from './activities.provider';
import { PaymentService } from './services/payment.service';
import { NotificationService } from './services/notification.service';

@Module({
  imports: [
    TemporalModule.forRootAsync({
      imports: [], // Import other modules if needed
      inject: [ActivitiesProvider],
      useFactory: async (activitiesProvider: ActivitiesProvider) => ({
        contract: myContract,
        connection: await NativeConnection.connect({
          address: 'localhost:7233',
        }),
        workflowsPath: require.resolve('./workflows'),
        activities: activitiesProvider.createActivities(),
      }),
    }),
  ],
  providers: [
    ActivitiesProvider,
    PaymentService,
    NotificationService,
  ],
})
export class AppModule {}
```

### 3. Start the Application

The worker starts automatically when the NestJS application initializes:

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  // Worker starts automatically during module initialization

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    await app.close(); // Worker shuts down automatically
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  console.log('Worker started successfully');
}

bootstrap();
```

## Dependency Injection

### Using Services in Activities

Access any NestJS service in your activities:

```typescript
@Injectable()
export class ActivitiesProvider {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly inventoryService: InventoryService,
    private readonly emailService: EmailService,
    private readonly logger: Logger,
  ) {}

  createActivities() {
    return declareActivitiesHandler({
      contract: myContract,
      activities: {
        processOrder: {
          checkInventory: ({ productId, quantity }) => {
            this.logger.log(`Checking inventory for ${productId}`);
            return Future.fromPromise(
              this.inventoryService.reserve(productId, quantity)
            )
              .mapError((error) =>
                new ActivityError('INVENTORY_UNAVAILABLE', error.message, error)
              )
              .mapOk((reservation) => ({ reservationId: reservation.id }));
          },
        },
      },
    });
  }
}
```

### Using Configuration

Access configuration values:

```typescript
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ActivitiesProvider {
  constructor(
    private readonly configService: ConfigService,
    private readonly paymentService: PaymentService,
  ) {}

  createActivities() {
    const paymentGatewayUrl = this.configService.get('PAYMENT_GATEWAY_URL');
    
    return declareActivitiesHandler({
      contract: myContract,
      activities: {
        processOrder: {
          processPayment: ({ amount }) => {
            return Future.fromPromise(
              this.paymentService.charge(amount, paymentGatewayUrl)
            )
              .mapError((err) => 
                new ActivityError('PAYMENT_FAILED', err.message, err)
              )
              .mapOk((tx) => ({ transactionId: tx.id }));
          },
        },
      },
    });
  }
}
```

## Module Configuration Options

### Synchronous Configuration

Use `forRoot` for simple, synchronous configuration:

```typescript
TemporalModule.forRoot({
  contract: myContract,
  connection: await NativeConnection.connect({ address: 'localhost:7233' }),
  workflowsPath: require.resolve('./workflows'),
  activities: activitiesProvider.createActivities(),
})
```

### Asynchronous Configuration

Use `forRootAsync` for configuration that requires async setup or DI:

```typescript
TemporalModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService, ActivitiesProvider],
  useFactory: async (
    config: ConfigService,
    activitiesProvider: ActivitiesProvider
  ) => ({
    contract: myContract,
    connection: await NativeConnection.connect({
      address: config.get('TEMPORAL_ADDRESS'),
    }),
    namespace: config.get('TEMPORAL_NAMESPACE'),
    workflowsPath: require.resolve('./workflows'),
    activities: activitiesProvider.createActivities(),
  }),
})
```

## Worker Lifecycle

The `TemporalService` manages the worker lifecycle automatically:

- **onModuleInit**: Worker is created and started
- **onModuleDestroy**: Worker is gracefully shut down

You can access the worker instance if needed:

```typescript
import { Injectable } from '@nestjs/common';
import { TemporalService } from '@temporal-contract/worker-nestjs';

@Injectable()
export class MyService {
  constructor(private readonly temporalService: TemporalService) {}

  async getWorkerStatus() {
    const worker = this.temporalService.getWorker();
    // Access worker if needed
  }
}
```

## Multiple Workers

Run multiple workers in the same NestJS application:

```typescript
@Module({
  imports: [
    // Order processing worker
    TemporalModule.forRootAsync({
      name: 'orders',
      inject: [OrderActivitiesProvider],
      useFactory: async (provider: OrderActivitiesProvider) => ({
        contract: orderContract,
        connection: await NativeConnection.connect({ address: 'localhost:7233' }),
        workflowsPath: require.resolve('./order-workflows'),
        activities: provider.createActivities(),
      }),
    }),
    
    // Payment processing worker
    TemporalModule.forRootAsync({
      name: 'payments',
      inject: [PaymentActivitiesProvider],
      useFactory: async (provider: PaymentActivitiesProvider) => ({
        contract: paymentContract,
        connection: await NativeConnection.connect({ address: 'localhost:7233' }),
        workflowsPath: require.resolve('./payment-workflows'),
        activities: provider.createActivities(),
      }),
    }),
  ],
  providers: [OrderActivitiesProvider, PaymentActivitiesProvider],
})
export class AppModule {}
```

## Testing

Test your activities with NestJS testing utilities:

```typescript
import { Test } from '@nestjs/testing';
import { ActivitiesProvider } from './activities.provider';
import { PaymentService } from './services/payment.service';

describe('ActivitiesProvider', () => {
  let provider: ActivitiesProvider;
  let paymentService: PaymentService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ActivitiesProvider,
        {
          provide: PaymentService,
          useValue: {
            charge: jest.fn(),
          },
        },
      ],
    }).compile();

    provider = module.get<ActivitiesProvider>(ActivitiesProvider);
    paymentService = module.get<PaymentService>(PaymentService);
  });

  it('should process payment', async () => {
    jest.spyOn(paymentService, 'charge').mockResolvedValue({
      id: 'tx-123',
    });

    const activities = provider.createActivities();
    const result = await activities.activities.processOrder.processPayment({
      customerId: 'CUST-123',
      amount: 100,
    });

    const value = await result;
    expect(value.isOk()).toBe(true);
    expect(value.get()).toEqual({ transactionId: 'tx-123' });
  });
});
```

## Best Practices

### 1. Organize by Domain

```typescript
// ✅ Good - organized by domain
src/
├── orders/
│   ├── orders.activities.provider.ts
│   ├── orders.contract.ts
│   ├── orders.workflows.ts
│   └── orders.module.ts
├── payments/
│   ├── payments.activities.provider.ts
│   ├── payments.contract.ts
│   ├── payments.workflows.ts
│   └── payments.module.ts
```

### 2. Use Global Modules for Shared Services

```typescript
@Global()
@Module({
  providers: [Logger, ConfigService],
  exports: [Logger, ConfigService],
})
export class CoreModule {}
```

### 3. Separate Business Logic from Activities

```typescript
// ✅ Good - business logic in services
@Injectable()
export class PaymentService {
  async processPayment(customerId: string, amount: number) {
    // Business logic here
  }
}

@Injectable()
export class ActivitiesProvider {
  constructor(private readonly paymentService: PaymentService) {}

  createActivities() {
    return declareActivitiesHandler({
      contract: myContract,
      activities: {
        processOrder: {
          processPayment: ({ customerId, amount }) => {
            return Future.fromPromise(
              this.paymentService.processPayment(customerId, amount)
            )
              .mapError((err) => 
                new ActivityError('PAYMENT_FAILED', err.message, err)
              )
              .mapOk((tx) => ({ transactionId: tx.id }));
          },
        },
      },
    });
  }
}
```

## Common Issues

### Worker Not Starting

Ensure the connection is properly awaited:

```typescript
// ✅ Correct
useFactory: async () => ({
  connection: await NativeConnection.connect({ address: 'localhost:7233' }),
  // ...
})

// ❌ Wrong
useFactory: () => ({
  connection: NativeConnection.connect({ address: 'localhost:7233' }),
  // ...
})
```

### Activities Not Found

Verify the workflowsPath is correct:

```typescript
workflowsPath: require.resolve('./workflows')  // Relative to this file
```

## See Also

- [Worker Usage](/guide/worker-usage) - Standard worker implementation
- [Defining Contracts](/guide/defining-contracts) - Creating contracts
- [Result Pattern](/guide/result-pattern) - Error handling with Result/Future
- [API Reference](/api/worker-nestjs) - Complete NestJS worker API
