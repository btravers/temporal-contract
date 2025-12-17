# Order Processing Worker - NestJS

This sample demonstrates how to implement a Temporal worker using NestJS with the `@temporal-contract/worker-nestjs` package using the multi-handler approach.

## Features

- **Multi-handler approach**: One handler class implements all contract activities (inspired by ts-rest)
- **NestJS Integration**: Uses `@ActivitiesHandler` decorator with full DI support
- **Type Safety**: Implements `ActivityImplementations<typeof contract>` for compile-time type checking
- **Modular Architecture**: Clean, maintainable code structure

## Structure

```
src/
├── activities/
│   ├── order-activities.handler.ts   # Single handler for all activities
│   └── activities.module.ts          # NestJS activities module
├── workflows/
│   └── workflows.ts                  # Workflow implementations
├── app.module.ts                     # Root NestJS module
├── worker.ts                         # Worker bootstrap
└── logger.ts                         # Logger configuration
```

## Running

1. Make sure Temporal server is running (see root README)

2. Start the worker:

```bash
pnpm dev:worker
```

## Comparison with Standard Worker

**Standard Worker** (`samples/order-processing-worker`):

- Activities defined with `declareActivitiesHandler()`
- Direct function implementations
- No built-in dependency injection

**NestJS Worker** (this sample):

- One handler class with `@ActivitiesHandler` decorator
- Implements `ActivityImplementations<typeof contract>`
- NestJS modular architecture and DI
- Same contract, different implementation pattern

## Key Differences

### Standard Worker

```typescript
export const activitiesHandler = declareActivitiesHandler({
  contract: orderProcessingContract,
  activities: {
    processPayment: (args) => {
      // Direct implementation
    },
    refundPayment: (transactionId) => {
      // Direct implementation
    },
    // ... more activities
  },
});
```

### NestJS Worker (Multi-handler)

```typescript
@Injectable()
@ActivitiesHandler(orderProcessingContract)
export class OrderActivitiesHandler implements ActivityImplementations<typeof orderProcessingContract> {
  constructor(private gateway: PaymentGateway) {} // DI support

  processPayment(args: { customerId: string; amount: number }) {
    // Implementation with DI
  }

  refundPayment(transactionId: string) {
    // Implementation with DI
  }

  // ... all other activities in one class
}

export const ActivitiesModule = createActivitiesModule({
  contract: orderProcessingContract,
  handler: OrderActivitiesHandler,
  providers: [PaymentGateway], // Inject dependencies
});
```

## Benefits of Multi-handler Approach

1. **Ultimate Type Safety**: Handler must implement all activities from contract
2. **Dependency Injection**: Inject services, repositories, and configurations
3. **Single Source of Truth**: All activities for a contract in one place
4. **Better IDE Support**: Autocomplete and type checking for all methods
5. **Easier to Test**: Mock dependencies for unit testing
6. **Scalability**: Clear contract boundaries for large projects

## Learn More

- [NestJS Integration Guide](https://btravers.github.io/temporal-contract/guide/nestjs-integration)
- [Worker-NestJS API Reference](https://btravers.github.io/temporal-contract/api/worker-nestjs)
- [Standard Worker Sample](../order-processing-worker)
