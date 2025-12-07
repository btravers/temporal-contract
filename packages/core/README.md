# @temporal-contract/core

Core types and utilities for temporal-contract.

## What's inside?

This package contains the foundational TypeScript types used across all temporal-contract packages:

- `ActivityDefinition` - Type definition for activities
- `WorkflowDefinition` - Type definition for workflows
- `ContractDefinition` - Type definition for contracts
- Type inference utilities (`InferInput`, `InferOutput`, etc.)

## Installation

```bash
pnpm add @temporal-contract/core zod
```

## Usage

This package is typically not used directly. It's a dependency of other temporal-contract packages.

```typescript
import type { WorkflowDefinition, InferInput, InferOutput } from '@temporal-contract/core';
```

## License

MIT
