# Order Processing Worker (NestJS)

> Type-safe order processing worker using temporal-contract with NestJS

This sample demonstrates how to use `@temporal-contract/worker-nestjs` to build a Temporal worker with NestJS dependency injection.

## Features

- **NestJS Integration**: Full dependency injection for activities
- **Type-Safe Activities**: Contract-based activities with TypeScript validation
- **Result/Future Pattern**: Explicit error handling using `@temporal-contract/boxed`
- **Clean Architecture**: Domain-driven design with ports and adapters
- **Graceful Shutdown**: Proper cleanup on SIGTERM/SIGINT signals

## Structure

```
src/
├── domain/              # Business logic (entities, ports, use cases)
│   ├── entities/
│   ├── ports/
│   └── usecases/
├── infrastructure/      # External adapters (payment, inventory, etc.)
│   └── adapters/
├── activities.provider.ts   # Activities provider with DI
├── app.module.ts       # Main NestJS application module
├── dependencies.module.ts   # DI container for domain/infrastructure
├── main.ts             # Application entry point
├── logger.ts           # Pino logger configuration
└── workflows.ts        # Temporal workflow implementations
```

## Differences from Classic Worker

This sample does the same thing as `order-processing-worker` but uses NestJS:

| Classic Worker                  | NestJS Worker                             |
| ------------------------------- | ----------------------------------------- |
| Plain TypeScript                | NestJS with decorators                    |
| Manual DI via `dependencies.ts` | NestJS DI via modules                     |
| Direct worker creation          | `TemporalModule.forRootAsync()`           |
| Manual lifecycle                | Auto lifecycle via `onModuleInit/Destroy` |

## Prerequisites

1. **Temporal server running**:

   ```bash
   temporal server start-dev
   ```

2. **Dependencies installed** (from repository root):
   ```bash
   pnpm install && pnpm build
   ```

## Running the Worker

```bash
# From this directory
pnpm dev

# Or from repository root
cd samples/order-processing-worker-nestjs
pnpm dev
```

The worker will:

- Connect to Temporal at `localhost:7233`
- Listen on the `order-processing` task queue
- Process workflow executions from the client

## Testing with the Client

In another terminal, run the client to send workflow requests:

```bash
cd samples/order-processing-client
pnpm dev
```

The client will execute sample orders that the worker will process.

## Key Files

### `app.module.ts`

Main NestJS module that configures the Temporal worker:

```typescript
@Module({
  imports: [
    DependenciesModule,
    TemporalModule.forRootAsync({
      useFactory: async (activitiesProvider) => ({
        contract: orderProcessingContract,
        connection: await NativeConnection.connect({ address: "localhost:7233" }),
        workflowsPath: workflowPath("workflows"),
        activities: activitiesProvider.createActivities(),
      }),
    }),
  ],
})
export class AppModule {}
```

### `activities.provider.ts`

Creates type-safe activities with dependency injection:

```typescript
@Injectable()
export class ActivitiesProvider {
  constructor(
    private readonly processPaymentUseCase: ProcessPaymentUseCase,
    // ... other use cases
  ) {}

  createActivities() {
    return declareActivitiesHandler({
      contract: orderProcessingContract,
      activities: {
        processOrder: {
          processPayment: ({ customerId, amount }) => {
            return Future.fromPromise(
              this.processPaymentUseCase.execute(customerId, amount)
            ).mapError(/* ... */);
          },
        },
      },
    });
  }
}
```

### `dependencies.module.ts`

NestJS module providing all domain and infrastructure services:

```typescript
@Global()
@Module({
  providers: [
    { provide: "PaymentAdapter", useFactory: () => new MockPaymentAdapter() },
    {
      provide: ProcessPaymentUseCase,
      useFactory: (adapter) => new ProcessPaymentUseCase(adapter),
      inject: ["PaymentAdapter"],
    },
    // ... other providers
  ],
})
export class DependenciesModule {}
```

## What Gets Processed

The worker handles order processing workflows with these steps:

1. **Process Payment** - Charge customer's payment method
2. **Reserve Inventory** - Reserve items from warehouse
3. **Create Shipment** - Generate shipping label and tracking
4. **Send Notification** - Notify customer of order status

If any step fails, appropriate compensating actions are taken (e.g., refund payment if inventory unavailable).

## Learn More

- [Worker NestJS Package](../../packages/worker-nestjs/README.md)
- [Contract Definition](../order-processing-contract/src/contract.ts)
- [Classic Worker Sample](../order-processing-worker/README.md)
- [Documentation](https://btravers.github.io/temporal-contract)

## License

MIT
