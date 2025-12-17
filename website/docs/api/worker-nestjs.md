# @temporal-contract/worker-nestjs

NestJS integration for temporal-contract workers with decorators and dependency injection support.

## Installation

```bash
pnpm add @temporal-contract/worker-nestjs @nestjs/common @nestjs/core reflect-metadata
```

## Features

- Decorator-based activity implementation (`@ImplementActivity`)
- Full NestJS dependency injection support
- Type-safe with automatic validation
- Modular architecture with `createActivitiesModule()`

## Entry Points

### `@temporal-contract/worker-nestjs/activity`

For implementing activities with NestJS:

```typescript
import {
  ImplementActivity,
  createActivitiesModule,
  ACTIVITIES_HANDLER_TOKEN,
  extractActivitiesFromProvider,
  getContractFromProvider,
} from '@temporal-contract/worker-nestjs/activity';

import type {
  ActivityImplementationMetadata,
  ActivitiesModuleOptions,
  BoxedActivityImplementation,
  ActivityImplementations,
  ActivitiesHandler,
} from '@temporal-contract/worker-nestjs/activity';
```

### `@temporal-contract/worker-nestjs/workflow`

For organizing workflows with NestJS:

```typescript
import {
  ImplementWorkflow,
  createWorkflowsModule,
  WORKFLOW_IMPLEMENTATIONS_TOKEN,
  extractWorkflowsFromProvider,
  getWorkflowContractFromProvider,
} from '@temporal-contract/worker-nestjs/workflow';

import type {
  WorkflowImplementationMetadata,
  WorkflowsModuleOptions,
  WorkflowImplementation,
  WorkflowContext,
  DeclareWorkflowOptions,
} from '@temporal-contract/worker-nestjs/workflow';
```

## API Reference

### Decorators

#### `@ImplementActivity(contract, activityName)`

Binds a contract activity to a service method.

**Parameters:**

- `contract: ContractDefinition` - The contract definition
- `activityName: string` - Name of the activity in the contract

**Usage:**

```typescript
@Injectable()
export class PaymentService {
  @ImplementActivity(orderContract, 'processPayment')
  processPayment(args: { customerId: string; amount: number }) {
    return Future.fromPromise(/*...*/)
      .mapError(error => new ActivityError(/*...*/));
  }
}
```

#### `@ImplementWorkflow(contract, workflowName)`

Marks a method that returns a workflow implementation.

**Parameters:**

- `contract: ContractDefinition` - The contract definition
- `workflowName: string` - Name of the workflow in the contract

**Usage:**

```typescript
@Injectable()
export class OrderWorkflowService {
  @ImplementWorkflow(orderContract, 'processOrder')
  getProcessOrderImplementation() {
    return async (context, args) => {
      // Workflow implementation
    };
  }
}
```

### Module Factories

#### `createActivitiesModule(options)`

Creates a NestJS dynamic module for activities with full dependency injection support.

**Parameters:**

- `options: ActivitiesModuleOptions<TContract>`
  - `contract: TContract` - Contract definition
  - `providers: Type<unknown>[]` - Array of provider classes with `@ImplementActivity` decorators
  - `additionalActivities?: Partial<ActivityImplementations<TContract>>` - Optional additional implementations

**Returns:** `DynamicModule`

**Example:**

```typescript
export const ActivitiesModule = createActivitiesModule({
  contract: orderContract,
  providers: [PaymentService, InventoryService, NotificationService],
  additionalActivities: {
    // Optional: add implementations not from providers
  },
});
```

#### `createWorkflowsModule(options)`

Creates a NestJS dynamic module for workflow organization.

**Parameters:**

- `options: WorkflowsModuleOptions<TContract>`
  - `contract: TContract` - Contract definition
  - `providers: Type<unknown>[]` - Array of provider classes with `@ImplementWorkflow` decorators
  - `additionalWorkflows?: Record<string, WorkflowImplementation>` - Optional additional implementations

**Returns:** `DynamicModule`

**Example:**

```typescript
export const WorkflowsModule = createWorkflowsModule({
  contract: orderContract,
  providers: [OrderWorkflowService],
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

#### `WORKFLOW_IMPLEMENTATIONS_TOKEN`

Token for injecting workflow implementations map.

**Type:** `string` - `'TEMPORAL_CONTRACT_WORKFLOW_IMPLEMENTATIONS'`

**Usage:**

```typescript
const app = await NestFactory.createApplicationContext(AppModule);
const workflowsMap = app.get(WORKFLOW_IMPLEMENTATIONS_TOKEN);
```

### Helper Functions

#### `extractActivitiesFromProvider<TContract>(provider)`

Extracts activity implementations from a provider instance.

**Parameters:**

- `provider: object` - Provider instance with decorated methods

**Returns:** `Partial<ActivityImplementations<TContract>>`

#### `getContractFromProvider<TContract>(providerClass)`

Gets the contract from a provider class.

**Parameters:**

- `providerClass: new (...args: unknown[]) => unknown` - Provider class

**Returns:** `TContract | undefined`

#### `extractWorkflowsFromProvider<TContract>(provider)`

Extracts workflow implementations from a provider instance.

**Parameters:**

- `provider: object` - Provider instance with decorated methods

**Returns:** `Record<string, WorkflowImplementation>`

#### `getWorkflowContractFromProvider<TContract>(providerClass)`

Gets the contract from a workflow provider class.

**Parameters:**

- `providerClass: new (...args: unknown[]) => unknown` - Provider class

**Returns:** `TContract | undefined`

## Type Utilities

All type utilities from `@temporal-contract/worker` are re-exported for convenience:

```typescript
import type {
  BoxedActivityImplementation,
  ActivityImplementations,
  ActivitiesHandler,
  WorkflowImplementation,
  WorkflowContext,
  DeclareWorkflowOptions,
} from '@temporal-contract/worker-nestjs/*';
```

## See Also

- [NestJS Integration Guide](/guide/nestjs-integration) - Complete integration guide
- [Activity Handlers](/guide/activity-handlers) - General activity implementation patterns
- [@temporal-contract/worker API](/api/worker) - Core worker package
