# Order Processing Worker - NestJS Example

This sample demonstrates how to use `@temporal-contract/worker-nestjs` to build a Temporal worker with NestJS.

## Features

- **NestJS Integration**: Uses NestJS's dependency injection and module system
- **Single Handler Approach**: Activities are defined as methods in service classes
- **Type-Safe**: Fully typed with automatic validation
- **Organized Structure**: Activities are organized by workflow using decorators

## Structure

```
src/
├── activities/
│   └── order.activities.ts    # Activity handlers for order processing
├── workflows/
│   └── process-order.workflow.ts  # Workflow implementation
├── app.module.ts               # NestJS module configuration
└── main.ts                     # Application entry point
```

## Running

1. Make sure Temporal server is running on `localhost:7233`
2. Run the worker:

```bash
pnpm start
```

Or in development mode with watch:

```bash
pnpm dev
```

## How It Works

### 1. Define Activities with Decorators

Activities are defined as methods in service classes using the `@TemporalActivity` decorator:

```typescript
@Injectable()
export class OrderActivitiesService {
  @TemporalActivity('processOrder', 'processPayment')
  async processPayment(input: { customerId: string; amount: number }) {
    // Implementation
  }
}
```

### 2. Configure the Temporal Module

The `TemporalModule` automatically discovers and registers all activity handlers:

```typescript
@Module({
  imports: [
    TemporalModule.forRoot({
      contract: orderProcessingContract,
      connection: { address: 'localhost:7233' },
      workflowsPath: workflowPath('workflows'),
    }),
  ],
  providers: [OrderActivitiesService],
})
export class AppModule {}
```

### 3. Start the Worker

```typescript
const app = await NestFactory.createApplicationContext(AppModule);
const temporalService = app.get(TemporalService);
await temporalService.start();
```

## Comparison with Standard Worker

### Standard Worker (without NestJS)

```typescript
export const activities = declareActivitiesHandler({
  contract: orderProcessingContract,
  activities: {
    processOrder: {
      processPayment: (args) => {
        // Need to manually inject dependencies
        const paymentService = new PaymentService();
        return Future.make(async (resolve) => {
          // Implementation
        });
      },
    },
  },
});
```

### NestJS Worker

```typescript
@Injectable()
export class OrderActivitiesService {
  constructor(
    private readonly paymentService: PaymentService,  // Automatic DI!
  ) {}

  @TemporalActivity('processOrder', 'processPayment')
  async processPayment(args: { customerId: string; amount: number }) {
    // Dependencies are automatically injected
    // Cleaner, more testable code
  }
}
```

## Benefits

1. **Dependency Injection**: Full access to NestJS DI container
2. **Organization**: Activities grouped in service classes
3. **Testability**: Easy to mock dependencies for testing
4. **Scalability**: Better structure for large applications
5. **Integration**: Works seamlessly with other NestJS modules
