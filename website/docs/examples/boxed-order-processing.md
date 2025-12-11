# Boxed Order Processing

Order processing with Result/Future pattern for explicit error handling.

## Overview

This example demonstrates:
- Type-safe error handling with Result<T, E>
- Non-throwing async operations with Future<T, E>
- Explicit error propagation
- Railway-oriented programming

## Source Code

View the complete source code in the [samples/boxed-order-processing](https://github.com/btravers/temporal-contract/tree/main/samples/boxed-order-processing) directory.

## Running the Example

```bash
cd samples/boxed-order-processing
pnpm dev:worker  # Start worker
pnpm dev:client  # Run client
```

See [Result Pattern Guide](/guide/result-pattern) for more details.
