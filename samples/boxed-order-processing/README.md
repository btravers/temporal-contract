# Boxed Order Processing Sample

> Result/Future pattern with Clean Architecture

## What It Does

Same order processing as basic sample, but with **explicit error handling**:

```typescript
// ❌ Standard: Implicit errors
const pay = async (amount) => {
  if (failed) throw new Error('Failed');
  return result;
};

// ✅ Boxed: Explicit errors
const pay = (amount) => {
  return Future.make(resolve => {
    if (failed) {
      resolve(Result.Error({ code: 'PAYMENT_FAILED', ... }));
    } else {
      resolve(Result.Ok(result));
    }
  });
};
```

## Key Differences

- **Domain & Infrastructure:** Return `Future<Result<T, E>>`
- **Application (activities):** Wrapped with Result pattern
- **Workflows:** Auto-unwrap Results (throw on Error)

## Architecture

Same Clean Architecture as basic sample:

```
src/
├── domain/           # Use cases return Result
├── infrastructure/   # Adapters return Result
├── application/      # Activities auto-unwrap
└── dependencies.ts   # DI container
```

## Running

### Prerequisites

1. Temporal Server:

   ```bash
   temporal server start-dev
   ```

2. From repo root:
   ```bash
   pnpm install && pnpm build
   ```

### Run

From this directory:

```bash
# Terminal 1: Worker
pnpm dev:worker

# Terminal 2: Client
pnpm dev:client
```

## Error Requalification Pattern

This sample demonstrates the **required error requalification** for Temporal activities:

### Activity Layer (activities.ts)

```typescript
processPayment: ({ customerId, amount }) => {
  return processPaymentUseCase.execute(customerId, amount).map((result) =>
    result.mapError((domainError) =>
      // ⚠️ CRITICAL: Wrap all domain errors in ActivityError
      // Required for Temporal retry policies!
      new ActivityError(domainError.code, domainError.message, domainError.details)
    )
  );
}
```

### Why Required?

1. **Temporal Retry Policies**: Temporal needs `Error` instances (not plain objects) to apply retry policies
2. **Explicit Error Handling**: Forces conscious error handling at activity boundaries
3. **Type Safety**: `ActivityError` ensures consistent error structure
4. **Clean Architecture**: Domain stays pure, activity layer handles Temporal concerns

### Error Flow

```
External Service → Adapter → Use Case → Activity → Temporal
     (throws)      (Result.Error)  (Result.Error)  (ActivityError)  (retry/fail)
```

All technical exceptions MUST be caught in adapters and returned as `Result.Error`, then wrapped in `ActivityError` at the activity layer.

## Benefits

✅ **Explicit errors** in function signatures  
✅ **Better testability** (no try/catch needed)  
✅ **Functional composition** with map/flatMap  
✅ **Type-safe errors** throughout the stack  
✅ **Railway-oriented programming**  
✅ **Controlled retry behavior** via ActivityError

## When to Use

**Use boxed worker when:**

- You want explicit error types
- You prefer functional programming
- You need better testability

**Use standard worker when:**

- You prefer traditional exceptions
- You have simple error cases

## Learn More

- [Main README](../../README.md)
- [worker-boxed Package](../../packages/worker-boxed/README.md)
- [@swan-io/boxed docs](https://swan-io.github.io/boxed/)
- [Railway-Oriented Programming](https://fsharpforfunandprofit.com/rop/)
