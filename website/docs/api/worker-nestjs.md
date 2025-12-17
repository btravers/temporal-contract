# @temporal-contract/worker-nestjs

NestJS integration for temporal-contract workers using multi-handler approach for ultimate type safety.

## Installation

```bash
pnpm add @temporal-contract/worker-nestjs @nestjs/common @nestjs/core reflect-metadata
```

## Features

- Multi-handler approach inspired by ts-rest
- One handler class implements all activities from a contract
- Full NestJS dependency injection support
- Type-safe with automatic validation

## Entry Points

### `@temporal-contract/worker-nestjs/activity`

For implementing activities with NestJS:

```typescript
import {
  ActivitiesHandler,
  createActivitiesModule,
  ACTIVITIES_HANDLER_TOKEN,
  extractActivitiesFromHandler,
  getContractFromHandler,
} from '@temporal-contract/worker-nestjs/activity';

import type {
  ActivitiesModuleOptions,
  ActivityImplementations,
  ActivitiesHandlerType,
} from '@temporal-contract/worker-nestjs/activity';
```

### `@temporal-contract/worker-nestjs/workflow`

For workflow utilities (re-exported from worker package):

```typescript
import { declareWorkflow } from '@temporal-contract/worker-nestjs/workflow';

import type {
  WorkflowImplementation,
  WorkflowContext,
  DeclareWorkflowOptions,
} from '@temporal-contract/worker-nestjs/workflow';
```

## API Reference

### Decorators

#### `@ActivitiesHandler(contract)`

Marks a handler class that implements all activities from a contract.

**Parameters:**

- `contract: ContractDefinition` - The contract definition

**Usage:**

```typescript
@Injectable()
@ActivitiesHandler(orderContract)
export class OrderActivitiesHandler implements ActivityImplementations<typeof orderContract> {
  constructor(private readonly gateway: PaymentGateway) {}

  processPayment(args: { customerId: string; amount: number }) {
    return Future.fromPromise(/*...*/)
      .mapError(error => new ActivityError(/*...*/));
  }

  // Implement all other activities...
}
```

### Module Factories

#### `createActivitiesModule(options)`

Creates a NestJS dynamic module for activities with full dependency injection support.

**Parameters:**

- `options: ActivitiesModuleOptions<TContract>`
  - `contract: TContract` - Contract definition
  - `handler: Type<ActivityImplementations<TContract>>` - Handler class with `@ActivitiesHandler` decorator
  - `providers?: Type<unknown>[]` - Optional additional providers needed by the handler

**Returns:** `DynamicModule`

**Example:**

```typescript
export const ActivitiesModule = createActivitiesModule({
  contract: orderContract,
  handler: OrderActivitiesHandler,
  providers: [PaymentGateway, InventoryRepository, EmailService],
});
```

### Injection Tokens

#### `ACTIVITIES_HANDLER_TOKEN`

Token for injecting the activities handler in your application.

**Type:** `string` - `'TEMPORAL_CONTRACT_ACTIVITIES_HANDLER'`

**Usage:**

```typescript
const app = await NestFactory.createApplicationContext(AppModule);
const activitiesHandler = app.get(ACTIVITIES_HANDLER_TOKEN);

const worker = await Worker.create({
  activities: activitiesHandler.activities,
  taskQueue: activitiesHandler.contract.taskQueue,
  // ...
});
```

### Helper Functions

#### `extractActivitiesFromHandler<TContract>(handler)`

Extracts activity implementations from a handler instance.

**Parameters:**

- `handler: object` - Handler instance with methods

**Returns:** `ActivityImplementations<TContract>`

#### `getContractFromHandler<TContract>(handlerClass)`

Gets the contract from a handler class.

**Parameters:**

- `handlerClass: new (...args: unknown[]) => unknown` - Handler class

**Returns:** `TContract | undefined`

## Type Utilities

All type utilities from `@temporal-contract/worker` are re-exported for convenience:

```typescript
import type {
  ActivityImplementations,
  ActivityError,
  BoxedActivityImplementation,
  ActivitiesHandlerType,
  WorkflowImplementation,
  WorkflowContext,
  DeclareWorkflowOptions,
} from '@temporal-contract/worker-nestjs/*';
```

## See Also

- [NestJS Integration Guide](/guide/nestjs-integration) - Complete integration guide
- [Activity Handlers](/guide/activity-handlers) - General activity implementation patterns
- [@temporal-contract/worker API](/api/worker) - Core worker package
