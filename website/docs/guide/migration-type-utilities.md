# Migration Guide: Type Utilities

## Overview

In version 0.0.5+, type utility exports have been reorganized to better align with their usage:

- **Worker types** moved to `@temporal-contract/worker`
- **Client types** moved to `@temporal-contract/client`
- **Core definitions** remain in `@temporal-contract/contract`

This improves code organization and makes it clearer which types are intended for which use case.

## What Changed

### Worker Types

Previously imported from `@temporal-contract/contract`:

```typescript
// ❌ Old (v0.0.4 and earlier)
import type {
  WorkerInferInput,
  WorkerInferOutput,
  WorkerInferActivity,
  WorkerInferWorkflow,
  ActivityHandler,
  WorkflowActivityHandler
} from '@temporal-contract/contract';
```

Now imported from worker package entry points:

```typescript
// ✅ New (v0.0.5+)
import type {
  WorkerInferInput,
  WorkerInferOutput,
  WorkerInferActivity,
  ActivityHandler,
  WorkflowActivityHandler
} from '@temporal-contract/worker/activity';

import type {
  WorkerInferWorkflow,
  WorkerInferSignal,
  WorkerInferQuery,
  WorkerInferUpdate
} from '@temporal-contract/worker/workflow';
```

### Client Types

Previously imported from `@temporal-contract/contract`:

```typescript
// ❌ Old (v0.0.4 and earlier)
import type {
  ClientInferInput,
  ClientInferOutput,
  ClientInferWorkflow,
  ClientInferActivity,
  ClientInferSignal,
  ClientInferQuery,
  ClientInferUpdate
} from '@temporal-contract/contract';
```

Now imported from client package:

```typescript
// ✅ New (v0.0.5+)
import type {
  ClientInferInput,
  ClientInferOutput,
  ClientInferWorkflow,
  ClientInferActivity,
  ClientInferSignal,
  ClientInferQuery,
  ClientInferUpdate
} from '@temporal-contract/client';
```

### Contract Types (Unchanged)

Core definitions remain in the contract package:

```typescript
// ✅ Still the same
import type {
  ContractDefinition,
  WorkflowDefinition,
  ActivityDefinition,
  SignalDefinition,
  QueryDefinition,
  UpdateDefinition,
  InferWorkflowNames,
  InferActivityNames,
  InferContractWorkflows
} from '@temporal-contract/contract';
```

## Migration Steps

### 1. Update Worker Imports

**Before:**

```typescript
import { declareActivitiesHandler } from '@temporal-contract/worker/activity';
import type { WorkerInferInput, ActivityHandler } from '@temporal-contract/contract';

const activities = declareActivitiesHandler({
  contract: myContract,
  activities: {
    sendEmail: async (input: WorkerInferInput<typeof emailDef>) => {
      // ...
    }
  }
});
```

**After:**

```typescript
import { declareActivitiesHandler } from '@temporal-contract/worker/activity';
import type { WorkerInferInput, ActivityHandler } from '@temporal-contract/worker/activity';

const activities = declareActivitiesHandler({
  contract: myContract,
  activities: {
    sendEmail: async (input: WorkerInferInput<typeof emailDef>) => {
      // ...
    }
  }
});
```

### 2. Update Client Imports

**Before:**

```typescript
import { TypedClient } from '@temporal-contract/client';
import type { ClientInferInput, ClientInferOutput } from '@temporal-contract/contract';

const client = TypedClient.create(contract, { connection });
```

**After:**

```typescript
import { TypedClient } from '@temporal-contract/client';
import type { ClientInferInput, ClientInferOutput } from '@temporal-contract/client';

const client = TypedClient.create(contract, { connection });
```

### 3. Contract Imports Stay the Same

No changes needed for contract definitions:

```typescript
import { defineContract } from '@temporal-contract/contract';
import type { ContractDefinition } from '@temporal-contract/contract';

const contract = defineContract({
  // ...
});
```

## Quick Reference

| Type                      | Old Import                    | New Import                           |
| ------------------------- | ----------------------------- | ------------------------------------ |
| `WorkerInferInput`        | `@temporal-contract/contract` | `@temporal-contract/worker/activity` |
| `WorkerInferOutput`       | `@temporal-contract/contract` | `@temporal-contract/worker/activity` |
| `WorkerInferActivity`     | `@temporal-contract/contract` | `@temporal-contract/worker/activity` |
| `WorkerInferWorkflow`     | `@temporal-contract/contract` | `@temporal-contract/worker/workflow` |
| `WorkerInferSignal`       | `@temporal-contract/contract` | `@temporal-contract/worker/workflow` |
| `WorkerInferQuery`        | `@temporal-contract/contract` | `@temporal-contract/worker/workflow` |
| `WorkerInferUpdate`       | `@temporal-contract/contract` | `@temporal-contract/worker/workflow` |
| `ActivityHandler`         | `@temporal-contract/contract` | `@temporal-contract/worker/activity` |
| `WorkflowActivityHandler` | `@temporal-contract/contract` | `@temporal-contract/worker/activity` |
| `ClientInferInput`        | `@temporal-contract/contract` | `@temporal-contract/client`          |
| `ClientInferOutput`       | `@temporal-contract/contract` | `@temporal-contract/client`          |
| `ClientInferWorkflow`     | `@temporal-contract/contract` | `@temporal-contract/client`          |
| `ClientInferActivity`     | `@temporal-contract/contract` | `@temporal-contract/client`          |
| `ClientInferSignal`       | `@temporal-contract/contract` | `@temporal-contract/client`          |
| `ClientInferQuery`        | `@temporal-contract/contract` | `@temporal-contract/client`          |
| `ClientInferUpdate`       | `@temporal-contract/contract` | `@temporal-contract/client`          |
| `ContractDefinition`      | `@temporal-contract/contract` | ✅ No change                         |
| `WorkflowDefinition`      | `@temporal-contract/contract` | ✅ No change                         |
| `ActivityDefinition`      | `@temporal-contract/contract` | ✅ No change                         |

## Benefits

This reorganization provides:

1. **Clearer organization** — Types are now co-located with their usage
2. **Better discoverability** — Import types from the package you're working with
3. **Reduced coupling** — Contract package has fewer exports to maintain
4. **Semantic clarity** — The import path clearly indicates client vs worker types

## Need Help?

If you encounter issues during migration:

1. Check the [API documentation](/api/)
2. Review the [examples](/examples/)
3. Open an issue on [GitHub](https://github.com/btravers/temporal-contract/issues)
