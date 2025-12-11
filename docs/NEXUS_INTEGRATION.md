# Temporal Nexus Integration

## What is Temporal Nexus?

Temporal Nexus is a powerful feature of the Temporal platform that enables durable, cross-namespace workflow orchestration. It allows independent Temporal applications, operating in isolated namespaces, to seamlessly communicate and invoke workflows, activities, or custom operations across boundaries.

### Key Benefits

- **Cross-namespace Communication**: Invoke operations in other namespaces without direct access
- **Service Contracts**: Define clear API boundaries between teams and services
- **Durability**: All Nexus operations inherit Temporal's durability guarantees
- **Security**: Fine-grained access control and namespace isolation
- **Fault Tolerance**: Automatic retries and error handling across namespace boundaries
- **Decoupling**: Teams can evolve their services independently

### Use Cases

1. **Microservice Orchestration**: Coordinate workflows across team boundaries
2. **Multi-tenant Systems**: Isolate tenant data while enabling cross-tenant operations
3. **Cross-region Workflows**: Orchestrate workflows spanning multiple regions
4. **API Abstraction**: Hide implementation details behind stable service contracts

## Current Status

**⚠️ Nexus support in temporal-contract is planned but not yet implemented.**

While the Temporal TypeScript SDK includes Nexus support (marked as experimental), temporal-contract does not yet provide type-safe wrappers for Nexus operations. This documentation outlines how Nexus works and how it could be integrated with temporal-contract in the future.

## How Nexus Works

### 1. Define a Nexus Service

A Nexus service exposes operations that other namespaces can invoke:

```typescript
// Using raw Temporal SDK (current approach without temporal-contract)
import { NexusService } from '@temporalio/worker';

const paymentService = {
  name: 'PaymentService',
  operations: {
    processPayment: async (ctx, input: { amount: number; customerId: string }) => {
      // Implementation
      return { transactionId: 'tx-123', status: 'success' as const };
    },
  },
};
```

### 2. Register Service with Worker

```typescript
import { Worker } from '@temporalio/worker';

const worker = await Worker.create({
  taskQueue: 'payments',
  nexusServices: [paymentService],
  // ... other config
});
```

### 3. Invoke from Another Namespace

```typescript
import { nexus } from '@temporalio/workflow';

async function myWorkflow() {
  const result = await nexus.invoke('PaymentService', 'processPayment', {
    amount: 100,
    customerId: 'cust-123',
  });
  // result: { transactionId: string, status: 'success' | 'failed' }
}
```

## Future Integration with temporal-contract

### Proposed API Design

The goal is to bring temporal-contract's type safety and validation to Nexus operations:

#### 1. Define Nexus Services in Contracts

```typescript
import { defineContract } from '@temporal-contract/contract';
import { z } from 'zod';

const paymentContract = defineContract({
  taskQueue: 'payments',
  
  // Regular workflows
  workflows: {
    // ... existing workflows
  },
  
  // Nexus services (future feature)
  nexusServices: {
    PaymentService: {
      operations: {
        processPayment: {
          input: z.object({
            amount: z.number().positive(),
            customerId: z.string().uuid(),
          }),
          output: z.object({
            transactionId: z.string(),
            status: z.enum(['success', 'failed']),
          }),
        },
        refundPayment: {
          input: z.object({
            transactionId: z.string(),
            amount: z.number().positive(),
          }),
          output: z.object({
            refundId: z.string(),
            status: z.enum(['completed', 'pending', 'failed']),
          }),
        },
      },
    },
  },
});

export type PaymentContract = typeof paymentContract;
```

#### 2. Implement Type-Safe Nexus Handlers

```typescript
import { createNexusHandlers } from '@temporal-contract/worker'; // Future API

const nexusHandlers = createNexusHandlers(paymentContract, {
  PaymentService: {
    processPayment: async ({ amount, customerId }) => {
      // Input is automatically validated and typed
      // amount: number, customerId: string
      
      const payment = await processPaymentInDatabase(customerId, amount);
      
      // Return value is validated against output schema
      return {
        transactionId: payment.id,
        status: 'success' as const,
      };
    },
    
    refundPayment: async ({ transactionId, amount }) => {
      const refund = await processRefundInDatabase(transactionId, amount);
      return {
        refundId: refund.id,
        status: 'completed' as const,
      };
    },
  },
});
```

#### 3. Register with Worker

```typescript
import { createWorker } from '@temporal-contract/worker';

const worker = await createWorker(paymentContract, {
  workflows,
  activities,
  nexusHandlers, // Future feature
});
```

#### 4. Type-Safe Nexus Client

```typescript
import { createNexusClient } from '@temporal-contract/client'; // Future API
import type { PaymentContract } from './payment-contract';

// From another namespace/service
const nexusClient = createNexusClient<PaymentContract>(connection, {
  namespace: 'payments-ns',
});

// Fully typed invocation
const result = await nexusClient.invoke('PaymentService', 'processPayment', {
  amount: 100,
  customerId: 'cust-123',
});
// result is typed as: { transactionId: string, status: 'success' | 'failed' }

// TypeScript error: invalid input
await nexusClient.invoke('PaymentService', 'processPayment', {
  amount: -50, // Error: amount must be positive
  customerId: 'invalid', // Error: customerId must be UUID
});
```

## Benefits of Integration

### 1. Type Safety

- **End-to-end types**: From contract definition to client and worker
- **Compile-time checks**: Catch errors before runtime
- **Autocomplete**: Full IDE support for Nexus operations
- **Refactoring**: Rename operations safely across codebases

### 2. Automatic Validation

- **Input validation**: All Nexus operation inputs validated with Zod schemas
- **Output validation**: Worker returns validated against schemas
- **Schema-driven**: Single source of truth for operation signatures

### 3. Better Developer Experience

- **Consistent API**: Same patterns as workflows and activities
- **Less boilerplate**: No manual type definitions needed
- **Clear contracts**: Service boundaries explicitly defined
- **Documentation**: Types serve as inline documentation

### 4. Production Ready

- **Error handling**: Structured validation errors
- **Versioning**: Schema evolution with Zod's transform capabilities
- **Testing**: Easy to mock and test with typed interfaces
- **Observability**: Validation errors logged and traceable

## Comparison: With vs Without temporal-contract

### Without temporal-contract (Current Temporal SDK)

```typescript
// Service definition - types manually maintained
const service = {
  name: 'PaymentService',
  operations: {
    processPayment: async (ctx, input: any) => { // No type safety!
      // Manual validation needed
      if (typeof input.amount !== 'number') throw new Error('Invalid amount');
      
      return { transactionId: 'tx-123', status: 'success' };
    },
  },
};

// Client usage - no type checking
const result = await nexus.invoke('PaymentService', 'processPayment', {
  amout: 100, // Typo! No error
  customer: 'cust-123', // Wrong field name! No error
});
```

### With temporal-contract (Future)

```typescript
// Contract-first approach
const contract = defineContract({
  nexusServices: {
    PaymentService: {
      operations: {
        processPayment: {
          input: z.object({ amount: z.number(), customerId: z.string() }),
          output: z.object({ transactionId: z.string(), status: z.enum(['success', 'failed']) }),
        },
      },
    },
  },
});

// Automatically validated and typed
const handlers = createNexusHandlers(contract, {
  PaymentService: {
    processPayment: async ({ amount, customerId }) => { // Fully typed!
      // No manual validation - already done
      return { transactionId: 'tx-123', status: 'success' };
    },
  },
});

// Type-safe client
const result = await client.invoke('PaymentService', 'processPayment', {
  amount: 100,
  customerId: 'cust-123', // TypeScript ensures correctness
});
```

## Migration Path

When Nexus support is added to temporal-contract, the migration should be straightforward:

1. **Define contracts**: Add `nexusServices` to existing contracts
2. **Update workers**: Use `createNexusHandlers` for type-safe handlers
3. **Update clients**: Use `createNexusClient` for type-safe invocations
4. **Test**: Existing tests continue working with enhanced type safety

## Implementation Considerations

### Type System

```typescript
// Core types needed (similar to existing WorkflowDefinition, ActivityDefinition)
export interface NexusOperationDefinition<
  TInput extends AnySchema = AnySchema,
  TOutput extends AnySchema = AnySchema,
> {
  readonly input: TInput;
  readonly output: TOutput;
}

export interface NexusServiceDefinition<
  TOperations extends Record<string, NexusOperationDefinition> = Record<string, NexusOperationDefinition>,
> {
  readonly operations: TOperations;
}

export interface ContractDefinition<
  TWorkflows extends Record<string, WorkflowDefinition>,
  TActivities extends Record<string, ActivityDefinition>,
  TNexusServices extends Record<string, NexusServiceDefinition> = Record<string, NexusServiceDefinition>,
> {
  readonly taskQueue: string;
  readonly workflows: TWorkflows;
  readonly activities?: TActivities;
  readonly nexusServices?: TNexusServices; // New field
}
```

### Worker Integration

The worker package would need to:
- Register Nexus services with the Temporal SDK
- Wrap handlers with validation logic
- Provide proper error handling and logging
- Support both sync and async operations

### Client Integration

The client package would need to:
- Create type-safe Nexus client wrappers
- Validate inputs before sending
- Validate outputs after receiving
- Handle errors consistently with existing patterns

## Resources

- [Temporal Nexus Documentation](https://docs.temporal.io/nexus)
- [Temporal Nexus TypeScript SDK Guide](https://docs.temporal.io/develop/typescript/nexus)
- [Nexus TypeScript API Reference](https://typescript.temporal.io/api/namespaces/nexus)
- [Temporal Nexus Announcement Blog](https://temporal.io/blog/announcing-nexus-connect-temporal-applications-across-isolated-namespaces)
- [Nexus TypeScript Samples](https://github.com/temporalio/samples-typescript/tree/main/nexus-hello)

## Contributing

Interested in helping implement Nexus support? Check out:

1. [ROADMAP.md](./ROADMAP.md) - See Phase 5 for detailed implementation tasks
2. [CONTRIBUTING.md](./CONTRIBUTING.md) - Guidelines for contributors
3. [Open GitHub Issues](https://github.com/btravers/temporal-contract/issues) - Join the discussion

## Feedback

Have ideas or suggestions for Nexus integration? Please open an issue or discussion on GitHub!

---

**Note**: This documentation describes a future feature. Nexus support is planned for v0.5.0 but not yet implemented. The API examples shown here are proposed designs and may change based on community feedback and implementation experience.
