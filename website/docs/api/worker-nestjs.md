# @temporal-contract/worker-nestjs

NestJS integration for `@temporal-contract/worker` providing a type-safe way to define Temporal workers with full dependency injection support.

## Installation

```bash
pnpm add @temporal-contract/worker-nestjs @swan-io/boxed
```

## Features

- **ConfigurableModuleBuilder Integration**: Use NestJS's `ConfigurableModuleBuilder` for dynamic module configuration
- **Type-Safe Activities**: All activities must be implemented upfront, enforced by TypeScript
- **Full Dependency Injection**: Activities have access to NestJS services
- **Contract Validation**: Automatic validation through the contract system
- **Automatic Lifecycle**: Worker starts and stops with your NestJS application

## Quick Example

```typescript
import { Module } from '@nestjs/common';
import { TemporalModule } from '@temporal-contract/worker-nestjs';
import { NativeConnection } from '@temporalio/worker';
import { Future, Result } from '@swan-io/boxed';
import { ActivityError, declareActivitiesHandler } from '@temporal-contract/worker/activity';
import { orderContract } from './contract';

@Module({
  imports: [
    TemporalModule.forRootAsync({
      useFactory: async () => ({
        contract: orderContract,
        activities: declareActivitiesHandler({
          contract: orderContract,
          activities: {
            processOrder: {
              processPayment: ({ customerId, amount }) => {
                return Future.fromPromise(
                  Promise.resolve({ transactionId: 'txn_123' })
                )
                  .mapError((error) =>
                    new ActivityError('PAYMENT_FAILED', 'Payment failed', error)
                  )
                  .mapOk((value) => value);
              },
            },
          },
        }),
        connection: await NativeConnection.connect({ address: 'localhost:7233' }),
        workflowsPath: require.resolve('./workflows'),
      }),
    }),
  ],
})
export class AppModule {}
```

## API Reference

### TemporalModule

Dynamic NestJS module for configuring Temporal workers.

#### Methods

##### `forRoot(options: TemporalModuleOptions): DynamicModule`

Synchronous configuration of the Temporal worker.

**Parameters:**
- `options`: Configuration options for the worker
  - `contract`: The temporal-contract definition
  - `activities`: Activity implementations from `declareActivitiesHandler`
  - `connection`: Temporal NativeConnection instance
  - `workflowsPath`: Path to workflow implementations
  - `namespace?`: Temporal namespace (default: 'default')

**Example:**
```typescript
TemporalModule.forRoot({
  contract: myContract,
  connection: await NativeConnection.connect({ address: 'localhost:7233' }),
  workflowsPath: require.resolve('./workflows'),
  activities: myActivities,
})
```

##### `forRootAsync(options: TemporalModuleAsyncOptions): DynamicModule`

Asynchronous configuration of the Temporal worker with factory pattern.

**Parameters:**
- `options`: Async configuration options
  - `imports?`: Modules to import
  - `inject?`: Dependencies to inject into factory
  - `useFactory`: Factory function returning configuration
  - `name?`: Unique name for multiple workers

**Example:**
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
    workflowsPath: require.resolve('./workflows'),
    activities: activitiesProvider.createActivities(),
  }),
})
```

### TemporalService

Service managing the Temporal worker lifecycle.

#### Methods

##### `getWorker(): Worker`

Get the worker instance.

**Returns:** The Temporal Worker instance

**Throws:** Error if worker is not initialized

**Example:**
```typescript
@Injectable()
export class MyService {
  constructor(private readonly temporalService: TemporalService) {}

  getStatus() {
    const worker = this.temporalService.getWorker();
    // Use worker instance
  }
}
```

#### Lifecycle Hooks

The service automatically manages worker lifecycle:

- **onModuleInit()**: Initializes and starts the worker when the NestJS module initializes
- **onModuleDestroy()**: Gracefully shuts down the worker when the module is destroyed

## Configuration Options

### TemporalModuleOptions

```typescript
interface TemporalModuleOptions {
  contract: Contract;
  activities: DeclaredActivitiesHandler;
  connection: NativeConnection;
  workflowsPath: string;
  namespace?: string;
}
```

### TemporalModuleAsyncOptions

```typescript
interface TemporalModuleAsyncOptions {
  imports?: Type<any>[];
  inject?: (string | symbol | Type<any>)[];
  useFactory: (...args: any[]) => Promise<TemporalModuleOptions> | TemporalModuleOptions;
  name?: string;
}
```

## Usage Patterns

### With Dependency Injection

```typescript
@Injectable()
export class ActivitiesProvider {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly logger: Logger,
  ) {}

  createActivities() {
    return declareActivitiesHandler({
      contract: orderContract,
      activities: {
        processOrder: {
          processPayment: ({ customerId, amount }) => {
            this.logger.log(`Processing payment for ${customerId}`);
            return Future.fromPromise(
              this.paymentService.charge(customerId, amount)
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

### Multiple Workers

Run multiple workers in the same application:

```typescript
@Module({
  imports: [
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
})
export class AppModule {}
```

## Testing

Test your activities with NestJS testing utilities:

```typescript
import { Test } from '@nestjs/testing';

describe('ActivitiesProvider', () => {
  let provider: ActivitiesProvider;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ActivitiesProvider,
        {
          provide: PaymentService,
          useValue: {
            charge: jest.fn().mockResolvedValue({ id: 'tx-123' }),
          },
        },
      ],
    }).compile();

    provider = module.get<ActivitiesProvider>(ActivitiesProvider);
  });

  it('should create activities', () => {
    const activities = provider.createActivities();
    expect(activities.activities.processOrder.processPayment).toBeDefined();
  });
});
```

## See Also

- [NestJS Worker Usage Guide](/guide/worker-nestjs-usage) - Detailed usage guide
- [Worker Implementation](/guide/worker-implementation) - Core worker concepts
- [Defining Contracts](/guide/defining-contracts) - Creating contracts
- [@temporal-contract/worker](/api/worker) - Core worker package

## License

MIT
