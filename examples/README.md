# Examples

> Complete working examples demonstrating temporal-contract

## Available Examples

### [order-processing-worker](./order-processing-worker)

Standard Promise-based worker with Clean Architecture

### [order-processing-worker-nestjs](./order-processing-worker-nestjs)

NestJS-based worker with dependency injection and Result/Future pattern

### [order-processing-client](./order-processing-client)

Standalone client demonstrating interaction with the unified contract

**Note**: All worker examples (`order-processing-worker` and `order-processing-worker-nestjs`) implement the same contract (`orderProcessingContract`) but with different internal implementations. The client example works with any worker implementation seamlessly.

## Running Examples

```bash
# Start Temporal server
temporal server start-dev

# Install and build from repository root
cd ../..
pnpm install && pnpm build

# Run a worker (choose one)
cd examples/order-processing-worker
pnpm dev  # Terminal 1

# Or use the NestJS worker
cd examples/order-processing-worker-nestjs
pnpm dev  # Terminal 1

# Run the client (in another terminal)
cd examples/order-processing-client
pnpm dev  # Terminal 2
```

## Documentation

**[Read the full documentation](https://btravers.github.io/temporal-contract)**

- [Examples Overview](https://btravers.github.io/temporal-contract/examples/)
- [Getting Started](https://btravers.github.io/temporal-contract/guide/getting-started)
- [API Reference](https://btravers.github.io/temporal-contract/api/)

## License

MIT
