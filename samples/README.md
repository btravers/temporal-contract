# temporal-contract Samples

This directory contains sample applications demonstrating how to use `temporal-contract` in real-world scenarios.

## Available Samples

### 📦 [basic-order-processing](./basic-order-processing)

A comprehensive order processing system demonstrating **Clean Architecture** principles with `temporal-contract`:

**Architecture:**

- **Domain Layer:** Pure business logic with entities, use cases, and ports (interfaces)
- **Infrastructure Layer:** Adapters implementing domain ports (mock payment, inventory, shipping)
- **Application Layer:** Temporal-specific code (contracts, workflows, activities)
- **Dependency Injection:** Centralized in `dependencies.ts` for easy testing

**What it demonstrates:**

- Type-safe contract definition with workflows and activities
- Clean Architecture separation (Domain → Infrastructure → Application)
- Use cases containing business logic (activities are thin wrappers)
- Workflow orchestration with error handling and compensating actions
- Worker and client setup with proper dependency injection
- Input/output validation with Zod schemas

**What it does:** Processes an order through payment validation, inventory reservation, shipment creation, and customer notifications, with proper error handling and inventory rollback on failures.

**Approach:** Standard worker with Promise-based activities using Clean Architecture.

### 📦✨ [boxed-order-processing](./boxed-order-processing)

The same order processing system using **Clean Architecture** + **Result/Future pattern** from [@swan-io/boxed](https://swan-io.github.io/boxed/):

**Architecture:**

- Same Clean Architecture structure as basic sample
- **Domain Layer:** Use cases return `Future<Result<T, E>>` for explicit error handling
- **Infrastructure Layer:** Adapters return `Future<Result<T, E>>` instead of throwing
- **Application Layer:** Activities unwrap Results automatically via worker-boxed

**What it demonstrates:**

- Explicit error types in function signatures (`PaymentError`, `InventoryError`, etc.)
- Functional error handling without exceptions (Result.Ok / Result.Error)
- Better testability (no try/catch needed in domain layer)
- Railway-oriented programming pattern
- Type-safe error propagation through the stack
- Automatic Result unwrapping by worker-boxed in workflows

**What it does:** Same order processing flow as the basic sample, but with functional error handling throughout the entire stack.

**Approach:** Boxed worker with Result/Future pattern + Clean Architecture.

**Note:** Currently demonstrates the architecture, but has runtime limitations with `@swan-io/boxed` in Temporal workflows due to non-deterministic GC APIs. Best used for learning the pattern in activities and domain layer.

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

Want to contribute a new sample? Follow this structure based on **Clean Architecture**:

```
samples/your-sample-name/
├── package.json              # With workspace:* dependencies
├── tsconfig.json             # Extending from standard config
├── README.md                 # Documentation
├── src/
│   ├── application/          # Temporal-specific layer
│   │   ├── contract.ts       # Contract definition
│   │   ├── activities.ts     # Activity wrappers (delegate to use cases)
│   │   ├── workflows.ts      # Workflow orchestration
│   │   ├── worker.ts         # Worker setup
│   │   └── client.ts         # Client example
│   ├── dependencies.ts       # DI container (wires adapters + use cases)
│   ├── domain/               # Business logic layer
│   │   ├── entities/         # Domain entities with Zod schemas
│   │   ├── ports/            # Interfaces (contracts for adapters)
│   │   └── usecases/         # Business logic (use cases)
│   ├── infrastructure/       # Technical implementations
│   │   └── adapters/         # Implementations of domain ports
│   └── integration.spec.ts   # End-to-end tests
└── .gitignore                # Ignore dist/ and node_modules/
```

**Key principles:**

1. **Domain layer:** Pure business logic, no dependencies on frameworks
2. **Infrastructure layer:** Technical implementations (database, APIs, etc.)
3. **Application layer:** Temporal-specific code (thin wrappers)
4. **Dependencies:** Centralized DI for easy testing and configuration

Make sure to:

1. Add your sample to `pnpm-workspace.yaml` (already done via `samples/*`)
2. Use `workspace:*` for temporal-contract dependencies
3. Include clear documentation in your README
4. Add scripts for `dev:worker`, `dev:client`, `build`, and `typecheck`

## Learn More

- [temporal-contract Documentation](../docs/)
- [Temporal Documentation](https://docs.temporal.io/)
- [Worker Implementation Guide](../docs/CONTRACT_HANDLER.md)
