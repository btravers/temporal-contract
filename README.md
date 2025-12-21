<div align="center">

# temporal-contract

**Type-safe contracts for Temporal.io**

End-to-end type safety and automatic validation for workflows and activities

[![CI](https://github.com/btravers/temporal-contract/actions/workflows/ci.yml/badge.svg)](https://github.com/btravers/temporal-contract/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@temporal-contract/contract.svg?logo=npm)](https://www.npmjs.com/package/@temporal-contract/contract)
[![npm downloads](https://img.shields.io/npm/dm/@temporal-contract/contract.svg)](https://www.npmjs.com/package/@temporal-contract/contract)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[**Documentation**](https://btravers.github.io/temporal-contract) · [**Get Started**](https://btravers.github.io/temporal-contract/guide/getting-started) · [**Examples**](https://btravers.github.io/temporal-contract/examples/)

</div>

## Features

- ✅ **End-to-end type safety** — From contract to client, workflows, and activities
- ✅ **Automatic validation** — Zod schemas validate at all network boundaries
- ✅ **Compile-time checks** — TypeScript catches missing or incorrect implementations
- ✅ **Better DX** — Autocomplete, refactoring support, inline documentation
- ✅ **Child workflows** — Type-safe child workflow execution with Result/Future pattern
- ✅ **Result/Future pattern** — Explicit error handling without exceptions
- 🚧 **Nexus support** — Cross-namespace operations (planned for v0.5.0)

## Quick Example

```typescript
// Define contract once
const contract = defineContract({
  taskQueue: 'orders',
  workflows: {
    processOrder: {
      input: z.object({ orderId: z.string() }),
      output: z.object({ success: z.boolean() }),
      activities: { /* ... */ }
    }
  }
});

// Fully typed everywhere
const result = await client.executeWorkflow('processOrder', {
  workflowId: 'order-123',
  args: { orderId: 'ORD-123' }  // ✅ TypeScript knows!
});
```

## Installation

```bash
pnpm add @temporal-contract/contract @temporal-contract/worker @temporal-contract/client
```

## Documentation

📖 **[Read the full documentation →](https://btravers.github.io/temporal-contract)**

- [Getting Started](https://btravers.github.io/temporal-contract/guide/getting-started)
- [Core Concepts](https://btravers.github.io/temporal-contract/guide/core-concepts)
- [AsyncAPI Compatibility](https://btravers.github.io/temporal-contract/guide/asyncapi-compatibility)
- [Nexus Integration](https://btravers.github.io/temporal-contract/guide/nexus-integration) (Planned)
- [API Reference](https://btravers.github.io/temporal-contract/api/)
- [Examples](https://btravers.github.io/temporal-contract/examples/)

## Packages

| Package                                            | Description                                                          |
| -------------------------------------------------- | -------------------------------------------------------------------- |
| [@temporal-contract/contract](./packages/contract) | Contract builder and type definitions                                |
| [@temporal-contract/worker](./packages/worker)     | Type-safe worker with automatic validation and Result/Future pattern |
| [@temporal-contract/client](./packages/client)     | Type-safe client for consuming workflows with Result/Future pattern  |
| [@temporal-contract/boxed](./packages/boxed)       | Result and Future types for explicit error handling                  |
| [@temporal-contract/testing](./packages/testing)   | Testing utilities for integration tests                              |

## FAQ

### Is temporal-contract compatible with AsyncAPI?

While temporal-contract and AsyncAPI both define APIs for distributed systems, they serve fundamentally different architectural patterns:

- **AsyncAPI** is for event-driven architectures with asynchronous messaging
- **temporal-contract** is for workflow orchestration with durable execution

They are not directly compatible but can complement each other in a hybrid architecture where events trigger workflows and workflows publish events.

📖 **[Read the full analysis →](https://btravers.github.io/temporal-contract/guide/asyncapi-compatibility)**

## Contributing

See [CONTRIBUTING.md](https://github.com/btravers/temporal-contract/blob/main/CONTRIBUTING.md).

## License

MIT
