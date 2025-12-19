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

All activities must be provided upfront in the module configuration. Activities can access NestJS services through the application context.

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TemporalModule } from '@temporal-contract/worker-nestjs';
import { orderProcessingContract } from './contract';

@Module({
  imports: [
    TemporalModule.forRoot({
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
                resolve(Result.Ok({ transactionId: 'txn_123' }));
              } catch (error) {
                resolve(Result.Error(
                  new ActivityError('PAYMENT_FAILED', 'Payment failed', error)
                ));
              }
            });
          },
        },
      },
      connection: { address: 'localhost:7233' },
      workflowsPath: require.resolve('./workflows'),
    }),
  ],
})
export class AppModule {}
```

### 3. Start the Worker

```typescript
// main.ts
import { NestFactory } from '@nestjs/common';
import { AppModule } from './app.module';
import { TemporalService } from '@temporal-contract/worker-nestjs';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const temporalService = app.get(TemporalService);
  await temporalService.start();
}

bootstrap();
```

## Why This Approach?

1. **Type Safety**: TypeScript ensures all activities from the contract are implemented
2. **Explicit**: All activities defined in one place
3. **No Magic**: No decorators or reflection required

## License

MIT
