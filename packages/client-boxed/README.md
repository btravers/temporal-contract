# @temporal-contract/client-boxed

Type-safe Temporal client with [boxed](https://github.com/swan-io/boxed) Result/Future pattern for consuming workflows.

## Features

- ✅ **Result/Future pattern** — Explicit error handling with `Result<T, E>` and async operations with `Future<T>`
- ✅ **End-to-end type safety** — From contract to client with full TypeScript support
- ✅ **Automatic validation** — Zod schemas validate at all network boundaries
- ✅ **Functional error handling** — No try-catch blocks, explicit error handling with pattern matching

## Installation

```bash
pnpm add @temporal-contract/client-boxed @temporal-contract/contract
```

## Usage

```typescript
import { Connection } from "@temporalio/client";
import { TypedClientBoxed } from "@temporal-contract/client-boxed";
import { myContract } from "./contract";

// Connect to Temporal
const connection = await Connection.connect();

// Create typed client with boxed pattern
const client = TypedClientBoxed.create(myContract, {
  connection,
  namespace: "default",
});

// Execute workflow with Result/Future pattern
const resultFuture = client.executeWorkflow("processOrder", {
  workflowId: "order-123",
  args: { orderId: "ORD-123", customerId: "CUST-456" },
});

// Unwrap Future and handle Result
const result = await resultFuture.toPromise();

result.match({
  Ok: (output) => {
    console.log("Order processed successfully:", output);
  },
  Error: (error) => {
    console.error("Failed to process order:", error.message);
  },
});
```

## Differences from @temporal-contract/client

The boxed client wraps all operations with `Future<Result<T, Error>>` instead of `Promise<T>`:

| Operation        | Regular Client    | Boxed Client                    |
| ---------------- | ----------------- | ------------------------------- |
| Execute workflow | `Promise<Output>` | `Future<Result<Output, Error>>` |
| Start workflow   | `Promise<Handle>` | `Future<Result<Handle, Error>>` |
| Get handle       | `Promise<Handle>` | `Future<Result<Handle, Error>>` |
| Query            | `Promise<Output>` | `Future<Result<Output, Error>>` |
| Signal           | `Promise<void>`   | `Future<Result<void, Error>>`   |
| Update           | `Promise<Output>` | `Future<Result<Output, Error>>` |

## Why Boxed?

The boxed pattern provides several benefits:

1. **Explicit error handling** — All errors are part of the type signature
2. **Railway-oriented programming** — Chain operations that might fail
3. **Functional composition** — Use `map`, `flatMap`, etc. for transformations
4. **No exceptions** — All errors are values, no try-catch needed

## Examples

### Starting a workflow

```typescript
const handleFuture = client.startWorkflow("processOrder", {
  workflowId: "order-123",
  args: { orderId: "ORD-123" },
});

const handleResult = await handleFuture.toPromise();

handleResult.match({
  Ok: async (handle) => {
    console.log("Workflow started:", handle.workflowId);

    // Wait for result
    const result = await handle.result().toPromise();
    result.match({
      Ok: (output) => console.log("Output:", output),
      Error: (error) => console.error("Execution failed:", error),
    });
  },
  Error: (error) => {
    console.error("Failed to start workflow:", error.message);
  },
});
```

### Using queries with boxed pattern

```typescript
const handleResult = await client.getHandle("processOrder", "order-123").toPromise();

if (handleResult.isOk()) {
  const handle = handleResult.value;

  const statusResult = await handle.queries.getStatus([]).toPromise();

  statusResult.match({
    Ok: (status) => console.log("Status:", status),
    Error: (error) => console.error("Query failed:", error),
  });
}
```

### Chaining operations

```typescript
const orderResult = await client
  .executeWorkflow("processOrder", {
    workflowId: "order-123",
    args: { orderId: "ORD-123" },
  })
  .toPromise();

// Transform the result
const summary = orderResult.map((output) => ({
  id: output.orderId,
  success: output.status === "completed",
}));

summary.match({
  Ok: (data) => console.log("Summary:", data),
  Error: (error) => console.error("Failed:", error),
});
```

## API Reference

See the [full documentation](https://btravers.github.io/temporal-contract/api/client-boxed/) for detailed API reference.

## License

MIT
