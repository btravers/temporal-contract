# Frequently Asked Questions (FAQ)

## General

### What is temporal-contract?

temporal-contract is a type-safe contract system for Temporal.io workflows and activities, similar to what oRPC and ts-rest provide for REST APIs. It brings full TypeScript type inference and Zod validation to Temporal workflows.

### Why use temporal-contract?

- ✅ **Type Safety** - Catch errors at compile time, not runtime
- ✅ **Validation** - Automatic Zod validation of all inputs/outputs
- ✅ **Developer Experience** - Autocomplete everywhere
- ✅ **Documentation** - Contract serves as living documentation
- ✅ **Refactoring** - Safe refactoring with TypeScript

### Is it production-ready?

The project is currently in early development (v0.0.1). While the core concepts are solid, we recommend thorough testing before using in production. See [ROADMAP.md](./ROADMAP.md) for upcoming features.

## Installation

### What are the peer dependencies?

- `zod` (^3.22.0) - For all packages
- `temporalio` (^1.0.0) - For `@temporal-contract/worker` and `@temporal-contract/client`

### Do I need to install all packages?

No! Install only what you need:

- **Contract definition** (shared): `@temporal-contract/contract`
- **Worker implementation**: `@temporal-contract/worker` + `@temporal-contract/contract`
- **Client usage**: `@temporal-contract/client` + `@temporal-contract/contract`

## Usage

### Can I use other validation libraries besides Zod?

Currently, only Zod is supported. However, Standard Schema support is planned for v0.1.0, which will allow you to use Valibot, Yup, ArkType, and other libraries. See [ROADMAP.md](./ROADMAP.md).

### How do I share the contract between client and server?

Create a shared package:

```typescript
// packages/shared/src/contracts/my.contract.ts
export const myContract = contract({ ... });
```

Then import it in both client and worker:

```typescript
// worker
import { myContract } from '@my-company/shared';

// client
import { myContract } from '@my-company/shared';
```

### Can I have multiple contracts?

Yes! You can create as many contracts as needed:

```typescript
export const orderContract = contract({ ... });
export const userContract = contract({ ... });
export const notificationContract = contract({ ... });
```

### How do I handle workflow versioning?

You can version your contracts:

```typescript
export const orderContractV1 = contract({ ... });
export const orderContractV2 = contract({ ... });
```

Or use versioning in the schema:

```typescript
const orderContract = contract({
  workflows: {
    processOrder: workflow({
      input: z.object({
        version: z.literal('v2'),
        // ... rest
      }),
      // ...
    }),
  },
});
```

### Can I use signals and queries?

Not yet. Signals and queries support is planned for v0.2.0. See [ROADMAP.md](./ROADMAP.md).

## Workflows

### Why is my workflow not deterministic?

Make sure you're using Temporal's deterministic APIs:

```typescript
// ❌ Bad
const now = Date.now();
const random = Math.random();

// ✅ Good
import { Date, Math } from '@temporalio/workflow';
const now = Date.now();
const random = Math.random();
```

### Can I use external libraries in workflows?

Only if they're deterministic. Most I/O operations should be in activities. See [Temporal's documentation](https://docs.temporal.io/workflows#deterministic-constraints).

### How do I debug workflows?

Use Temporal's [replay testing](https://docs.temporal.io/typescript/testing) and the Temporal Web UI to inspect workflow execution history.

## Activities

### Should I make activities idempotent?

Yes! Activities may be retried, so they should be idempotent. See [BEST_PRACTICES.md](./BEST_PRACTICES.md#1-keep-activities-idempotent).

### How do I configure retry policies?

Use `activityOptions` when creating a workflow:

```typescript
const myWorkflow = createWorkflow({
  definition: contract.workflows.myWorkflow,
  implementation: async (input, context) => { ... },
  activityOptions: {
    startToCloseTimeout: '1 minute',
    retryPolicy: {
      maximumAttempts: 3,
      initialInterval: '1s',
      backoffCoefficient: 2,
    },
  },
});
```

### Can activities call other activities?

No. Activities are simple functions. Only workflows can call activities.

## Client

### How do I execute a workflow?

```typescript
const client = await createClient(myContract);

const result = await client.executeWorkflow('workflowName', {
  workflowId: 'unique-id',
  taskQueue: 'my-queue',
  input: { ... },
});
```

### How do I start a workflow without waiting?

Use `startWorkflow` instead of `executeWorkflow`:

```typescript
const handle = await client.startWorkflow('workflowName', {
  workflowId: 'unique-id',
  taskQueue: 'my-queue',
  input: { ... },
});

// Later, get the result
const result = await handle.result();
```

### Can I query a running workflow?

Yes, using the workflow handle:

```typescript
const handle = await client.getHandle('workflowName', 'workflow-id');
const status = await handle.query('getStatus');
```

Note: Typed queries are not yet supported but are planned.

## Performance

### Is there performance overhead?

The only overhead is Zod validation, which is minimal. Type information is removed at compile time.

### Should I batch activities?

Yes, when possible. See [BEST_PRACTICES.md](./BEST_PRACTICES.md#1-batch-activities-when-possible).

### Can I run activities in parallel?

Yes! Use `Promise.all()`:

```typescript
const [result1, result2] = await Promise.all([
  context.activities.activity1(input1),
  context.activities.activity2(input2),
]);
```

## Errors

### What happens if validation fails?

A `ZodError` is thrown with detailed information about what failed validation.

### How do I handle workflow failures?

```typescript
try {
  const result = await client.executeWorkflow('myWorkflow', { ... });
} catch (error) {
  if (error instanceof WorkflowFailedError) {
    console.error('Workflow failed:', error.message);
  }
}
```

### Can I customize error messages?

Yes, using Zod's error mapping:

```typescript
input: z.object({
  amount: z.number().positive({
    message: "Amount must be positive"
  }),
})
```

## Testing

### How do I test workflows?

Use Temporal's [testing framework](https://docs.temporal.io/typescript/testing):

```typescript
import { TestWorkflowEnvironment } from '@temporalio/testing';

const testEnv = await TestWorkflowEnvironment.createLocal();
// Test your workflow
```

### How do I mock the client?

Create a mock that implements the same interface:

```typescript
const mockClient = {
  executeWorkflow: jest.fn().mockResolvedValue({ status: 'success' }),
};
```

### How do I test contracts?

Test schema validation:

```typescript
describe('myContract', () => {
  it('validates input', () => {
    const input = { orderId: 'ORD-123' };
    expect(() => 
      myContract.workflows.processOrder.input.parse(input)
    ).not.toThrow();
  });
});
```

## Monorepo

### Why use a monorepo?

- **Modular** - Use only what you need
- **Maintainable** - Clear separation of concerns
- **Flexible** - Independent versioning
- **Efficient** - Shared tooling and dependencies

### How do I add a new package?

See [CONTRIBUTING.md](./CONTRIBUTING.md#adding-a-new-package).

### Can I use a different package manager?

The project is designed for pnpm, but you could adapt it for npm or yarn. You'll need to update workspace configurations.

## Contributing

### How can I contribute?

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Where should I report bugs?

Open an issue on [GitHub](https://github.com/btravers/temporal-contract/issues).

### Can I request features?

Yes! Open a discussion or issue on GitHub.

## More Questions?

Can't find your answer? Open an issue on GitHub or check out:
- [Temporal Documentation](https://docs.temporal.io/)
- [Zod Documentation](https://zod.dev/)
- [Project Documentation](./README.md)
