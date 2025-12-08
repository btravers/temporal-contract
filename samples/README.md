# temporal-contract Samples

This directory contains sample applications demonstrating how to use `temporal-contract` in real-world scenarios.

## Available Samples

### 📦 [basic-order-processing](./basic-order-processing)

A simple order processing system that demonstrates:

- Type-safe contract definition with workflows and activities
- Activities implementation (global + workflow-specific)
- Workflow orchestration with error handling
- Worker and client setup
- Input/output validation with Zod

**What it does:** Processes an order through payment, inventory reservation, and shipping, with proper error handling and customer notifications.

**Approach:** Standard worker with Promise-based activities and try/catch error handling.

### 📦✨ [boxed-order-processing](./boxed-order-processing)

The same order processing system but using the **Result/Future pattern** from [@swan-io/boxed](https://swan-io.github.io/boxed/):

- Explicit error types in activity signatures
- Functional error handling (Result.Ok / Result.Error)
- Better testability (no try/catch in activities)
- Railway-oriented programming pattern
- Automatic Result unwrapping by worker-boxed

**What it does:** Same order processing flow as the basic sample, but activities return `Future<Result<T, ActivityError>>` for explicit, type-safe error handling.

**Approach:** Boxed worker with Result/Future pattern for activities.

## Running the Samples

Each sample is a standalone Node.js application that can be run independently.

### Prerequisites

1. **Temporal Server:** All samples require a running Temporal server. The easiest way is to use the local dev server:

```bash
temporal server start-dev
```

2. **Dependencies:** Install all dependencies from the repository root:

```bash
cd ../..  # Go to repository root
pnpm install
pnpm build
```

### Running a Sample

Each sample has its own README with detailed instructions. Generally:

1. Start the worker:

```bash
cd samples/basic-order-processing
pnpm dev:worker
```

2. In another terminal, run the client:

```bash
cd samples/basic-order-processing
pnpm dev:client
```

## Building with Turbo

All samples are integrated with the monorepo's Turborepo setup:

```bash
# From repository root
pnpm turbo build  # Builds all packages and samples
pnpm turbo build --filter=@temporal-contract/sample-basic-order-processing  # Build specific sample
```

## Creating Your Own Sample

Want to contribute a new sample? Follow this structure:

```
samples/your-sample-name/
├── package.json          # With workspace:* dependencies
├── tsconfig.json         # Extending from standard config
├── README.md             # Documentation
├── src/
│   ├── contract.ts       # Contract definition
│   ├── activities/
│   │   └── index.ts      # Activities implementation
│   ├── workflows/
│   │   └── *.ts          # Workflow implementations
│   ├── worker.ts         # Worker setup
│   └── client.ts         # Client example
└── .gitignore            # Ignore dist/ and node_modules/
```

Make sure to:

1. Add your sample to `pnpm-workspace.yaml` (already done via `samples/*`)
2. Use `workspace:*` for temporal-contract dependencies
3. Include clear documentation in your README
4. Add scripts for `dev:worker`, `dev:client`, `build`, and `typecheck`

## Learn More

- [temporal-contract Documentation](../docs/)
- [Temporal Documentation](https://docs.temporal.io/)
- [Worker Implementation Guide](../docs/CONTRACT_HANDLER.md)
