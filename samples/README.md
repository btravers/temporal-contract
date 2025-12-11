# Samples

> Complete working examples demonstrating temporal-contract

## Available Samples

### 📦 [basic-order-processing](./basic-order-processing)
Standard Promise-based workflow with Clean Architecture

### 📦 [boxed-order-processing](./boxed-order-processing)
Result/Future pattern with explicit error handling

### 📦 [order-processing-client](./order-processing-client)
Standalone client demonstrating interaction with the unified contract

**Note**: The `basic-order-processing` and `boxed-order-processing` samples now share a unified contract. Both workers implement the same contract (`orderProcessingContract`) but with different internal implementations. The client sample demonstrates how to interact with either worker implementation.

## Running Samples

```bash
# Start Temporal server
temporal server start-dev

# Install and build from repository root
cd ../..
pnpm install && pnpm build

# Run a worker
cd samples/basic-order-processing
pnpm dev:worker  # Terminal 1

# Run a client (in another terminal)
cd samples/order-processing-client
pnpm dev:basic  # Terminal 2
```

## Documentation

📖 **[Read the full documentation →](https://btravers.github.io/temporal-contract)**

- [Examples Overview](https://btravers.github.io/temporal-contract/examples/)
- [Getting Started](https://btravers.github.io/temporal-contract/guide/getting-started)
- [API Reference](https://btravers.github.io/temporal-contract/api/)

## License

MIT
