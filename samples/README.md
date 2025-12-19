# Samples

> Complete working examples demonstrating temporal-contract

## Available Samples

### 📦 [order-processing-worker](./order-processing-worker)

Standard Promise-based worker with Clean Architecture

### 📦 [order-processing-worker-boxed](./order-processing-worker-boxed)

Result/Future pattern worker with explicit error handling

### 📦 [order-processing-client](./order-processing-client)

Standalone client demonstrating interaction with the unified contract

**Note**: The `order-processing-worker` and `order-processing-worker-boxed` samples share a unified contract. Both workers implement the same contract (`orderProcessingContract`) but with different internal implementations. The client sample works with either worker implementation seamlessly.

### 📄 [contract-utilities-example.ts](./contract-utilities-example.ts)

Demonstrates the debugging utilities:

- **Contract Debugging**: `debugContract`, `debugContractJSON`
- **Contract Validation**: `validateContractNaming`
- **Contract Comparison**: `compareContracts` for version migration analysis

Run with: `npx tsx samples/contract-utilities-example.ts`

## Running Samples

```bash
# Start Temporal server
temporal server start-dev

# Install and build from repository root
cd ../..
pnpm install && pnpm build

# Run a worker (choose one)
cd samples/order-processing-worker
pnpm dev  # Terminal 1

# Run the client (in another terminal)
cd samples/order-processing-client
pnpm dev  # Terminal 2

# Or run the utilities example
npx tsx samples/contract-utilities-example.ts
```

## Documentation

📖 **[Read the full documentation →](https://btravers.github.io/temporal-contract)**

- [Examples Overview](https://btravers.github.io/temporal-contract/examples/)
- [Getting Started](https://btravers.github.io/temporal-contract/guide/getting-started)
- [API Reference](https://btravers.github.io/temporal-contract/api/)

## License

MIT
