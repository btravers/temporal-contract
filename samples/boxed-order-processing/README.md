# Boxed Order Processing Sample

This sample demonstrates using the **Result/Future pattern** from [@swan-io/boxed](https://swan-io.github.io/boxed/) with `@temporal-contract/worker-boxed` for explicit, type-safe error handling in Temporal workflows.

## ⚠️ Important: Separate Entry Points

This sample uses **separate entry points** to prevent bundling issues:

```typescript
// In activity files (src/application/activities.ts)
import { declareActivitiesHandler, Result, Future } from '@temporal-contract/worker-boxed/activity';

// In workflow files (src/application/workflows.ts)
import { declareWorkflow } from '@temporal-contract/worker-boxed/workflow';
```

> **Why?** `@swan-io/boxed` uses `FinalizationRegistry` which is non-deterministic and cannot be bundled into Temporal workflows. The `/workflow` entry point excludes boxed to keep workflows deterministic.

## Overview

Instead of throwing exceptions, activities return `Future<Result<T, ActivityError>>`:

- ✅ **Explicit error types** in function signatures
- ✅ **Better testability** (no try/catch in activity code)
- ✅ **Functional composition** with map/flatMap/match
- ✅ **Type safety** for errors

The worker automatically unwraps Results into Temporal's native exception behavior, so workflow code remains familiar while activities gain explicit error handling.

## Comparison with Standard Worker

### Standard Worker (throws exceptions)

```typescript
const processPayment = async (customerId: string, amount: number): Promise<PaymentResult> => {
  if (Math.random() > 0.9) {
    throw new Error("Payment failed");  // Implicit error
  }
  return { transactionId: "txn-123", status: "success", paidAmount: amount };
};
```

### Boxed Worker (Result pattern)

```typescript
const processPayment = (
  customerId: string,
  amount: number
): Future<Result<PaymentResult, ActivityError>> => {
  return Future.make((resolve) => {
    if (Math.random() > 0.9) {
      resolve(Result.Error({                    // Explicit error
        code: "PAYMENT_FAILED",
        message: "Payment declined by processor",
        details: { customerId, amount }
      }));
    } else {
      resolve(Result.Ok({
        transactionId: "txn-123",
        status: "success",
        paidAmount: amount
      }));
    }
  });
};
```

**Key benefits:**

- Error types are visible in the function signature
- Errors are explicit values, not thrown exceptions
- Better for testing: `result.match({ Ok: ..., Error: ... })`
- Enables functional composition and railway-oriented programming

## Project Structure

```
boxed-order-processing/
├── src/
│   ├── contract.ts           # Contract definition (same as standard)
│   ├── activities/
│   │   └── index.ts          # Activities using Result/Future pattern
│   ├── workflows/
│   │   └── processOrder.ts   # Workflow (similar to standard)
│   ├── worker.ts             # Worker using declareActivitiesHandler
│   └── client.ts             # Client (identical to standard)
├── package.json
├── tsconfig.json
└── README.md
```

## Activities

All activities return `Future<Result<T, ActivityError>>`:

### Global Activities

- **log**: Logging with severity levels
- **sendNotification**: Send email notifications (95% success rate)

### Workflow-Specific Activities

- **processPayment**: Process payment (90% success rate)
- **reserveInventory**: Reserve products (95% success rate)
- **releaseInventory**: Release reserved inventory
- **createShipment**: Create shipping label (98% success rate)
- **refundPayment**: Refund a transaction (99% success rate)

Failure rates simulate real-world scenarios where external services can fail.

## Workflow

The `processOrder` workflow:

1. **Log** order start
2. **Process payment** 💳
3. **Reserve inventory** 📦
4. **Create shipment** 📮
5. **Send confirmation** 📧

**Error handling:**

- Activities automatically unwrap Results
- Errors are converted to exceptions (Temporal native behavior)
- Workflow catches exceptions and performs rollback:
  - Releases inventory if reserved
  - Refunds payment if processed
  - Sends failure notification
  - Returns failed status with reason

## Prerequisites

1. **Temporal Server** running locally:

   ```bash
   temporal server start-dev
   ```

2. **Install dependencies** (from workspace root):

   ```bash
   pnpm install
   ```

3. **Build packages** (from workspace root):
   ```bash
   pnpm build
   ```

## Running the Sample

### Option 1: Using Turbo (Recommended)

From the workspace root:

```bash
# Terminal 1: Start the worker
pnpm turbo dev:worker --filter=boxed-order-processing

# Terminal 2: Run the client
pnpm turbo dev:client --filter=boxed-order-processing
```

### Option 2: Direct Execution

From this directory:

```bash
# Terminal 1: Start the worker
pnpm dev:worker

# Terminal 2: Run the client
pnpm dev:client
```

## Expected Output

### Worker Output

```
🚀 Boxed Order Processing Worker started
   Task Queue: boxed-order-processing
   Workflows Path: /path/to/workflows
   Pattern: Result/Future for explicit error handling

Worker is running... Press Ctrl+C to stop.

💳 Processing payment of $109.97 for customer CUST-001
✓ Payment successful: txn-1234567890-abc123
📦 Reserving inventory for 2 products
✓ Inventory reserved: res-1234567890-def456
📮 Creating shipment for order ORD-BOXED-001
✓ Shipment created: TRK-1234567890-GHI789 via FedEx
📧 Sending notification to customer CUST-001: Order Confirmed
```

### Client Output

```
🎯 Starting Boxed Order Processing Workflows

📦 Processing order: ORD-BOXED-001
   Customer: CUST-001
   Total: $109.97
   Items: 2
   ✓ Workflow started: ORD-BOXED-001

   📋 Result for ORD-BOXED-001:
      Status: completed
      Transaction: txn-1234567890-abc123
      Tracking: TRK-1234567890-GHI789

✅ All workflows completed!

Note: The Result/Future pattern provides explicit error handling
in activity implementations, making errors visible in type signatures.
```

## Key Concepts

### Result Pattern

```typescript
// Success
Result.Ok(value)

// Error
Result.Error({
  code: "ERROR_CODE",
  message: "Human readable message",
  details: { /* additional context */ }
})
```

### Future Pattern

```typescript
Future.make((resolve) => {
  // Async work
  setTimeout(() => {
    resolve(Result.Ok(value));
  }, 100);
})
```

### Automatic Unwrapping

The `declareActivitiesHandler` automatically:

1. Validates activity inputs (Zod)
2. Executes activity returning `Future<Result<T, E>>`
3. Unwraps the Future
4. Converts Result to Promise:
   - `Result.Ok(value)` → return validated value
   - `Result.Error(error)` → throw Temporal ApplicationFailure with error details

This means workflows see normal Promise-based activities while activity implementations benefit from explicit error handling.

## When to Use Boxed Worker vs Standard Worker

**Use Boxed Worker when:**

- You want explicit error types in activity signatures
- You need better testability for activities
- You prefer functional programming patterns
- You want to compose activity logic with map/flatMap/match
- You need railway-oriented programming

**Use Standard Worker when:**

- You prefer traditional exception handling
- You have simple error cases
- You want minimal abstraction over Temporal

Both approaches are valid! The boxed pattern adds a functional programming layer while maintaining compatibility with Temporal's workflow model.

## Learn More

- [@temporal-contract/worker-boxed Documentation](../../packages/worker-boxed/README.md)
- [@swan-io/boxed Documentation](https://swan-io.github.io/boxed/)
- [Railway-Oriented Programming](https://fsharpforfunandprofit.com/rop/)
- [Temporal.io Documentation](https://docs.temporal.io/)

## Troubleshooting

**Worker fails to start:**

- Ensure Temporal Server is running: `temporal server start-dev`
- Check that all packages are built: `pnpm build`

**Activities fail with validation errors:**

- Check that contract schemas match your data
- Zod validates at network boundaries

**Type errors:**

- Ensure all packages are built: `pnpm build`
- Check that imports use `.js` extensions (Node16 module resolution)

**Worker can't find workflows:**

- Verify `workflowsPath` points to compiled workflows
- Ensure workflows are exported correctly
