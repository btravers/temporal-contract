# Order Processing Worker - NestJS

This sample demonstrates how to implement a Temporal worker using NestJS with the `@temporal-contract/worker-nestjs` package.

## Features

- **NestJS Integration**: Uses `@ImplementActivity` decorators to bind contract activities to service methods
- **Dependency Injection**: Full NestJS DI support for activities
- **Type Safety**: Compile-time type checking with automatic validation
- **Modular Architecture**: Activities organized in services with `createActivitiesModule()`

## Structure

```
src/
├── activities/
│   ├── payment.service.ts         # Payment activities
│   ├── inventory.service.ts       # Inventory activities
│   ├── notification.service.ts    # Notification activities
│   ├── shipping.service.ts        # Shipping activities
│   └── activities.module.ts       # NestJS activities module
├── workflows/
│   └── workflows.ts                # Workflow implementations
├── app.module.ts                   # Root NestJS module
├── worker.ts                       # Worker bootstrap
└── logger.ts                       # Logger configuration
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

- Activities defined with `@ImplementActivity` decorator
- Services with dependency injection
- NestJS modular architecture
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
  },
});
```

### NestJS Worker

```typescript
@Injectable()
export class PaymentService {
  constructor(private gateway: PaymentGateway) {}

  @ImplementActivity(orderProcessingContract, 'processPayment')
  processPayment(args: { customerId: string; amount: number }) {
    // Implementation with DI
  }
}

export const ActivitiesModule = createActivitiesModule({
  contract: orderProcessingContract,
  providers: [PaymentService, InventoryService],
});
```

## Benefits of NestJS Integration

1. **Dependency Injection**: Inject services, repositories, and configurations
2. **Modular Organization**: Group related activities in services
3. **Testability**: Easier to mock dependencies for testing
4. **Familiar Patterns**: Use NestJS conventions you already know
5. **Scalability**: Better code organization for large projects

## Learn More

- [NestJS Integration Guide](https://btravers.github.io/temporal-contract/guide/nestjs-integration)
- [Worker-NestJS API Reference](https://btravers.github.io/temporal-contract/api/worker-nestjs)
- [Standard Worker Sample](../order-processing-worker)
