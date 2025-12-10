# Samples

Complete working examples demonstrating `temporal-contract` usage patterns.

## Available Samples

### 📦 [basic-order-processing](./basic-order-processing)

**Standard Promise-based workflow** with Clean Architecture

Order processing system with payment, inventory, and shipping management.

**Demonstrates:**
- Type-safe contracts with Zod schemas
- Clean Architecture (Domain → Infrastructure → Application)
- Dependency injection for testability
- Error handling and compensating transactions

**Pattern:** Traditional async/await with exceptions

---

### 📦✨ [boxed-order-processing](./boxed-order-processing)

**Result/Future pattern** with Clean Architecture

Same order processing, but with explicit error handling using [@swan-io/boxed](https://swan-io.github.io/boxed/).

**Demonstrates:**
- Explicit error types in function signatures
- Functional error handling (Result.Ok / Result.Error)
- Railway-oriented programming
- Same Clean Architecture structure

**Pattern:** Result/Future for explicit errors, auto-unwrapped in workflows

---

## Running Samples

### Prerequisites

1. **Temporal Server:**
   ```bash
   temporal server start-dev
   ```

2. **Install & Build:**
   ```bash
   cd ../..  # Repository root
   pnpm install
   pnpm build
   ```

### Run a Sample

```bash
cd samples/basic-order-processing

# Terminal 1: Start worker
pnpm dev:worker

# Terminal 2: Run client
pnpm dev:client
```

---

## Architecture

All samples follow **Clean Architecture**:

```
src/
├── domain/                 # Pure business logic
│   ├── entities/          # Domain models (Zod schemas)
│   ├── ports/             # Interfaces for adapters
│   └── usecases/          # Business logic
├── infrastructure/        # Technical implementations
│   └── adapters/          # Implementations of domain ports
├── application/           # Temporal-specific layer
│   ├── contract.ts        # Contract definition
│   ├── activities.ts      # Activity wrappers (thin)
│   ├── workflows.ts       # Workflow orchestration
│   ├── worker.ts          # Worker setup
│   └── client.ts          # Client example
└── dependencies.ts        # Dependency injection
```

**Key principles:**
- **Domain:** No framework dependencies
- **Infrastructure:** Technical implementations
- **Application:** Temporal bindings (thin layer)
- **DI:** Centralized for easy testing

---

## Learn More

- [temporal-contract Documentation](../docs/)
- [Temporal Documentation](https://docs.temporal.io/)
- [Worker Implementation Guide](../docs/CONTRACT_HANDLER.md)
