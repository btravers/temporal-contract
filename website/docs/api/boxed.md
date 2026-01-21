# @temporal-contract/boxed

Temporal-compatible `Future` and `Result` implementation for workflows, providing type-safe error handling compatible with Temporal's deterministic execution model.

## Installation

```bash
# For workflows (Temporal-compatible)
pnpm add @temporal-contract/boxed

# For activities and clients (recommended)
pnpm add @swan-io/boxed
```

## Overview

temporal-contract uses two Result/Future implementations:

- **[@swan-io/boxed](https://github.com/swan-io/boxed)** for **activities and clients** - Battle-tested with excellent performance
- **@temporal-contract/boxed** for **workflows** - Temporal-compatible for deterministic execution

Both packages provide the **same API**, making it easy to work with both.

```mermaid
graph LR
    A[Activities] -->|@swan-io/boxed| B[Result/Future API]
    C[Workflows] -->|@temporal-contract/boxed| B
    D[Clients] -->|@swan-io/boxed| B

    style A fill:#10b981,stroke:#059669,color:#fff
    style C fill:#3b82f6,stroke:#1e40af,color:#fff
    style D fill:#8b5cf6,stroke:#6d28d9,color:#fff
```

::: tip When to Use Each Package

- Use **@swan-io/boxed** for activities and clients (better performance, ecosystem support)
- Use **@temporal-contract/boxed** for workflows (required for Temporal's deterministic execution)
  :::

## Why Two Packages?

The `@swan-io/boxed` library doesn't work properly with Temporal workflows due to Temporal's deterministic execution requirements. This package provides a Temporal-compatible implementation with an identical API surface.

## Result\<T, E>

The `Result` type represents the result of an operation that can succeed or fail.

### Creating Results

```typescript
import { Result } from "@temporal-contract/boxed";

// Create a successful result
const success = Result.Ok(42);

// Create an error result
const failure = Result.Error("Something went wrong");
```

### Pattern Matching

```typescript
const value = result.match({
  Ok: (value) => value * 2,
  Error: (error) => 0,
});
```

### Transformations

```typescript
// Transform success value
const doubled = success.map((x) => x * 2);

// Transform error value
const recovered = failure.mapError((e) => `Error: ${e}`);

// Chain operations
const chained = result.flatMap((value) => {
  if (value > 0) return Result.Ok(value * 2);
  return Result.Error("Value must be positive");
});
```

### Checking State

```typescript
if (result.isOk()) {
  console.log("Success:", result.value);
}

if (result.isError()) {
  console.error("Error:", result.error);
}
```

## Future\<T>

The `Future` type wraps Promises with Result-based error handling.

### Creating Futures

```typescript
import { Future, Result } from "@temporal-contract/boxed";

// Create from value
const future = Future.value(42);

// Create from Promise
const fromPromise = Future.fromPromise(fetch("/api/data"));

// Create with executor
const custom = Future.make<number>(async (resolve) => {
  const result = await someAsyncOperation();
  resolve(Result.Ok(result));
});
```

### Transformations

```typescript
// Transform value
const doubled = future.map((x) => x * 2);

// Chain futures
const chained = future.flatMap((x) => Future.value(x * 2));

// Transform Ok/Error separately (for Future<Result<T, E>>)
const handled = future.mapOk((value) => value * 2).mapError((error) => new CustomError(error));
```

### Side Effects

```typescript
// Execute side effect
await future.tap((value) => console.log("Value:", value));

// Execute on Ok
await future.tapOk((value) => console.log("Success:", value));

// Execute on Error
await future.tapError((error) => console.error("Failed:", error));
```

### Combining Futures

```typescript
// Wait for all
const results = await Future.all([future1, future2, future3]);

// Race
const winner = await Future.race([future1, future2]);
```

## Usage in Temporal

### In Activities

Activities should return `Future<Result<T, E>>` for explicit error handling:

```typescript
import { Future, Result } from "@temporal-contract/boxed";
import { declareActivitiesHandler, ActivityError } from "@temporal-contract/worker/activity";

export const activities = declareActivitiesHandler({
  contract,
  activities: {
    processPayment: ({ amount }) => {
      return Future.make(async (resolve) => {
        try {
          const txId = await paymentService.charge(amount);
          resolve(Result.Ok({ transactionId: txId }));
        } catch (error) {
          resolve(
            Result.Error(new ActivityError("PAYMENT_FAILED", "Failed to process payment", error)),
          );
        }
      });
    },
  },
});
```

### In Workflows

Workflows work with Results returned by activities:

```typescript
import { declareWorkflow } from "@temporal-contract/worker/workflow";
import { Result } from "@temporal-contract/boxed";

export const workflow = declareWorkflow({
  workflowName: "processOrder",
  contract,
  implementation: async (context, input) => {
    const paymentResult = await context.activities.processPayment({
      amount: input.amount,
    });

    return paymentResult.match({
      Ok: (payment) =>
        Result.Ok({
          success: true,
          transactionId: payment.transactionId,
        }),
      Error: (error) =>
        Result.Error({
          type: "PAYMENT_FAILED",
          message: error.message,
        }),
    });
  },
});
```

## API Reference

### Result Methods

- `Result.Ok<T>(value: T)` - Create a successful result
- `Result.Error<E>(error: E)` - Create an error result
- `isOk(): boolean` - Check if result is Ok
- `isError(): boolean` - Check if result is Error
- `match<R>(pattern: { Ok: (value: T) => R, Error: (error: E) => R }): R` - Pattern match
- `map<U>(fn: (value: T) => U): Result<U, E>` - Transform Ok value
- `mapError<F>(fn: (error: E) => F): Result<T, F>` - Transform Error value
- `flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E>` - Chain results
- `getOr(defaultValue: T): T` - Get value or default
- `toOption(): Option<T>` - Convert to Option type

### Future Methods

- `Future.value<T>(value: T): Future<T>` - Create resolved future
- `Future.fromPromise<T>(promise: Promise<T>): Future<Result<T, Error>>` - Create from promise
- `Future.make<T>(executor: (resolve: (value: T) => void) => Promise<void>): Future<T>` - Create with executor
- `Future.reject<T>(error: Error): Future<Result<never, Error>>` - Create rejected future
- `Future.all<T>(futures: Future<T>[]): Future<T[]>` - Combine futures
- `Future.race<T>(futures: Future<T>[]): Future<T>` - Race futures
- `map<U>(fn: (value: T) => U): Future<U>` - Transform value
- `flatMap<U>(fn: (value: T) => Future<U>): Future<U>` - Chain futures
- `mapOk<U>(fn: (value: T) => U): Future<Result<U, E>>` - Transform Ok value
- `mapError<F>(fn: (error: E) => F): Future<Result<T, F>>` - Transform Error value
- `tap(fn: (value: T) => void): Future<T>` - Execute side effect
- `tapOk(fn: (value: T) => void): Future<Result<T, E>>` - Execute side effect on Ok
- `tapError(fn: (error: E) => void): Future<Result<T, E>>` - Execute side effect on Error

## Interoperability

This package provides interoperability with `@swan-io/boxed` through the `/interop` entry point:

```typescript
import {
  fromSwanResult,
  toSwanResult,
  fromSwanFuture,
  toSwanFuture,
} from "@temporal-contract/boxed/interop";

// Convert from @swan-io/boxed
const temporalResult = fromSwanResult(swanResult);
const temporalFuture = fromSwanFuture(swanFuture);

// Convert to @swan-io/boxed compatible types
const swanCompatible = toSwanResult(temporalResult);
const swanFutureCompatible = toSwanFuture(temporalFuture);
```

## TypeScript Support

Full type safety with automatic type inference:

```typescript
// Type inference works automatically
const result = Result.Ok(42); // Result<number, never>
const error = Result.Error("failed"); // Result<never, string>

// Generic types can be specified explicitly
const typed: Result<number, string> = Result.Ok(42);
```

## See Also

- [Result Pattern Guide](/guide/result-pattern)
- [Worker API](/api/worker)
- [Client API](/api/client)
- [Examples](/examples/)
