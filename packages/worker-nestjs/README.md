# @temporal-contract/worker-nestjs

NestJS integration for `@temporal-contract/worker` providing a type-safe way to define Temporal workers with activities.

## Features

- **ConfigurableModuleBuilder Integration**: Use NestJS's `ConfigurableModuleBuilder` for dynamic module configuration
- **Type-Safe Activities**: All activities must be implemented upfront, enforced by TypeScript
- **Full Dependency Injection**: Activities have access to NestJS services
- **Contract Validation**: Automatic validation through the contract system

## Installation

```bash
pnpm add @temporal-contract/worker-nestjs
```

## Quick Start

### 1. Define Your Contract

See `@temporal-contract/contract` for contract definition.

### 2. Implement Activities

All activities must be provided upfront in the module configuration. Use `declareActivitiesHandler` to create type-safe activities.

```typescript
// app.module.ts
import { Module } from "@nestjs/common";
import { TemporalModule } from "@temporal-contract/worker-nestjs";
import { NativeConnection } from "@temporalio/worker";
import { Future, Result } from "@temporal-contract/boxed";
import { ActivityError, declareActivitiesHandler } from "@temporal-contract/worker/activity";
import { orderProcessingContract } from "./contract";

@Module({
  imports: [
    TemporalModule.forRootAsync({
      useFactory: async () => ({
        contract: orderProcessingContract,
        activities: declareActivitiesHandler({
          contract: orderProcessingContract,
          activities: {
            // Global activities
            log: ({ level, message }) => {
              console.log(`[${level}] ${message}`);
              return Future.value(Result.Ok(undefined));
            },

            // Workflow-specific activities
            processOrder: {
              processPayment: ({ customerId, amount }) => {
                return Future.make(async (resolve) => {
                  try {
                    // Implementation
                    resolve(Result.Ok({ transactionId: "txn_123" }));
                  } catch (error) {
                    resolve(
                      Result.Error(new ActivityError("PAYMENT_FAILED", "Payment failed", error)),
                    );
                  }
                });
              },
            },
          },
        }),
        connection: await NativeConnection.connect({ address: "localhost:7233" }),
        workflowsPath: require.resolve("./workflows"),
      }),
    }),
  ],
})
export class AppModule {}
```

### 3. Start Your Application

The worker starts automatically when the NestJS application initializes and shuts down gracefully when the application closes.

```typescript
// main.ts
import { NestFactory } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  // Worker starts automatically during module initialization

  // Handle graceful shutdown
  process.on("SIGTERM", async () => {
    await app.close(); // Worker shuts down automatically
  });

  process.on("SIGINT", async () => {
    await app.close();
  });
}

bootstrap();
```

## API Reference

### TemporalModule

Dynamic NestJS module for configuring Temporal workers.

#### Methods

- `forRoot(options)`: Synchronous configuration
- `forRootAsync(options)`: Asynchronous configuration with factory pattern

### TemporalService

Service managing the Temporal worker lifecycle.

#### Methods

- `getWorker()`: Get the worker instance (throws if not initialized)

The service automatically:

- Initializes and starts the worker when the module initializes (`onModuleInit`)
- Shuts down the worker when the module is destroyed (`onModuleDestroy`)

bootstrap();

```

## Why This Approach?

1. **Type Safety**: TypeScript ensures all activities from the contract are implemented
2. **Explicit**: All activities defined in one place
3. **No Magic**: No decorators or reflection required

## License

MIT
```
