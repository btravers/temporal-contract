# Samples

> Complete working examples demonstrating temporal-contract

## Available Samples

### 📦 [basic-order-processing](./basic-order-processing)
Standard Promise-based workflow with Clean Architecture

### 📦 [boxed-order-processing](./boxed-order-processing)
Result/Future pattern with explicit error handling

## Running Samples

```bash
# Start Temporal server
temporal server start-dev

# Install and build from repository root
cd ../..
pnpm install && pnpm build

# Run a sample
cd samples/basic-order-processing
pnpm dev:worker  # Terminal 1
pnpm dev:client  # Terminal 2
```

## Documentation

📖 **[Read the full documentation →](https://btravers.github.io/temporal-contract)**

- [Examples Overview](https://btravers.github.io/temporal-contract/examples/)
- [Getting Started](https://btravers.github.io/temporal-contract/guide/getting-started)
- [API Reference](https://btravers.github.io/temporal-contract/api/)

## License

MIT
