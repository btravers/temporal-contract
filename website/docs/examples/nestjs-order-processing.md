# Order Processing with NestJS

A complete e-commerce order processing workflow using NestJS dependency injection with the multi-handler approach.

## Overview

This example demonstrates:

- **NestJS Integration**: Using `@temporal-contract/worker-nestjs` for DI support
- **Multi-handler pattern**: Single handler class implementing all activities (inspired by ts-rest)
- **Dependency Injection**: NestJS services injected into activity handlers
- **Type Safety**: Full TypeScript support with `ActivityImplementations<T>`
- Payment processing
- Inventory management
- Email notifications
- Shipping management

## Project Structure

The example consists of the NestJS worker package:

```
samples/order-processing-worker-nestjs/
├── src/
│   ├── activities/
│   │   ├── order-activities.handler.ts  # Single handler for all activities
│   │   └── activities.module.ts         # NestJS module configuration
│   ├── workflows/
│   │   └── workflows.ts                 # Workflow declarations
│   ├── app.module.ts                    # Root NestJS module
│   ├── worker.ts                        # Worker bootstrap with NestJS
│   └── logger.ts                        # Logger service
└── package.json                         # Imports contract and worker-nestjs
```

## Key Concepts

### Multi-Handler Pattern

Unlike the standard worker where each activity is a separate function, the NestJS integration uses a single handler class that implements all activities from the contract:

```typescript
@Injectable()
@ActivitiesHandler(orderProcessingContract)
export class OrderActivitiesHandler implements ActivityImplementations<typeof orderProcessingContract> {
  constructor(
    private logger: LoggerService,
    // Other services injected here
  ) {}

  // Implement all activities from the contract
  log(args: { level: string; message: string }) {
    // Implementation
  }

  processPayment(args: { customerId: string; amount: number }) {
    // Implementation with DI services
  }

  // ... all other activities
}
```

This approach provides:

- **Ultimate type safety**: TypeScript ensures all activities are implemented
- **Single responsibility**: One handler per contract
- **Easy testing**: Mock the entire handler or individual dependencies
- **Clean organization**: All activities in one place

### NestJS Dependency Injection

The handler can use standard NestJS dependency injection:

```typescript
@Injectable()
@ActivitiesHandler(orderProcessingContract)
export class OrderActivitiesHandler {
  constructor(
    private paymentGateway: PaymentGateway,
    private emailService: EmailService,
    private inventoryService: InventoryService,
  ) {}

  // Activities can use injected services
}
```

### Module Creation

Create a NestJS module using `createActivitiesModule`:

```typescript
import { createActivitiesModule } from "@temporal-contract/worker-nestjs/activity";

export const ActivitiesModule = createActivitiesModule({
  contract: orderProcessingContract,
  handler: OrderActivitiesHandler,
  providers: [
    // Additional providers for DI
    LoggerService,
    PaymentGateway,
    EmailService,
    // ...
  ],
});
```

### Worker Bootstrap

Bootstrap the worker using NestJS application context:

```typescript
import { NestFactory } from "@nestjs/core";
import { ACTIVITIES_HANDLER_TOKEN } from "@temporal-contract/worker-nestjs/activity";

const app = await NestFactory.createApplicationContext(AppModule);
const activitiesHandler = app.get(ACTIVITIES_HANDLER_TOKEN);

const worker = await Worker.create({
  workflowsPath: require.resolve("./workflows"),
  activities: activitiesHandler.activities,
  taskQueue: activitiesHandler.contract.taskQueue,
});
```

## Source Code

View the complete source code:

- [Contract package](https://github.com/btravers/temporal-contract/tree/main/samples/order-processing-contract)
- [NestJS Worker](https://github.com/btravers/temporal-contract/tree/main/samples/order-processing-worker-nestjs)
- [Standard Worker (for comparison)](https://github.com/btravers/temporal-contract/tree/main/samples/order-processing-worker)

## Running the Example

### Prerequisites

1. Start Temporal server:
   ```bash
   temporal server start-dev
   ```

### Run the Example

```bash
# Build the contract package first
cd samples/order-processing-contract
pnpm build

# Run the NestJS worker
cd ../order-processing-worker-nestjs
pnpm dev:worker  # Terminal 1 - Start worker

# In another terminal, run the client
cd ../order-processing-client
pnpm dev  # Terminal 2 - Run client
```

## Comparison with Standard Worker

| Feature                  | Standard Worker           | NestJS Worker                          |
| ------------------------ | ------------------------- | -------------------------------------- |
| **Dependency Injection** | Manual                    | NestJS DI container                    |
| **Handler Pattern**      | Individual functions      | Single class with all activities       |
| **Type Safety**          | Manual typing             | `ActivityImplementations<T>` interface |
| **Organization**         | Function-based            | Class-based with decorators            |
| **Testing**              | Mock individual functions | Mock class or dependencies             |
| **Best For**             | Simple workers            | Complex apps with many dependencies    |

## Benefits

1. **Dependency Injection**: Leverage NestJS DI for complex dependencies
2. **Type Safety**: `ActivityImplementations<T>` ensures all activities are implemented
3. **Single Handler**: All activities in one place, inspired by ts-rest's multi-handler approach
4. **Easy Testing**: Mock the handler class or inject test doubles
5. **Familiar Pattern**: NestJS developers can use familiar patterns

## When to Use

Use the NestJS worker when:

- You already have a NestJS application
- Your activities need complex dependency injection
- You want class-based organization
- You prefer decorator-based patterns

Use the standard worker when:

- You want simpler, function-based activities
- You don't need dependency injection
- You prefer a minimal setup

See [NestJS Integration Guide](/guide/nestjs-integration) and [API Reference](/api/worker-nestjs) for more details.
