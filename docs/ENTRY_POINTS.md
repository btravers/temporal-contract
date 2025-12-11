# Entry Points Architecture

This document explains the separate entry points architecture used by `@temporal-contract/worker` and `@temporal-contract/worker-boxed` packages.

## Problem Statement

Temporal workflows must be **deterministic** - they cannot use non-deterministic APIs like:

- Random number generators
- System time (outside of Temporal APIs)
- External network calls
- **`FinalizationRegistry`** and other GC-dependent APIs

The `@swan-io/boxed` library, used by `@temporal-contract/worker-boxed`, includes `FinalizationRegistry` for memory management. When imported in workflow files, webpack bundles this code, causing Temporal to throw:

```
DeterminismViolationError: FinalizationRegistry cannot be used in Workflows
because v8 GC is non-deterministic
```

## Solution: Separate Entry Points

Both packages now export **three entry points**:

### 1. `/activity` - For Activity Implementations

Contains everything needed for implementing activities:

- Activity handlers and validation
- Error classes
- For `worker-boxed`: Includes `@swan-io/boxed` (Result, Future, Option, AsyncData)

**Safe for:** Activity files (run on worker process, not in workflow sandbox)

### 2. `/workflow` - For Workflow Implementations

Contains only workflow-related exports:

- Workflow declaration and types
- Workflow context types
- For `worker-boxed`: **Excludes** `@swan-io/boxed` to prevent bundling issues

**Safe for:** Workflow files (bundled by webpack and run in Temporal's deterministic sandbox)

### 3. Default Export (backward compatibility)

Exports everything from both `/activity` and `/workflow`.

**⚠️ Warning:** Do not import the default export in workflow files for `worker-boxed`, as it includes `@swan-io/boxed`.

## Package Structure

### @temporal-contract/worker

```
packages/worker/
├── src/
│   ├── index.ts       # Default export (everything)
│   ├── activity.ts    # Activity-related exports
│   ├── workflow.ts    # Workflow-related exports
│   └── handler.ts     # Implementation (shared)
└── dist/
    ├── index.{mjs,cjs,d.mts,d.cts}
    ├── activity.{mjs,cjs,d.mts,d.cts}
    └── workflow.{mjs,cjs,d.mts,d.cts}
```

### @temporal-contract/worker-boxed

```
packages/worker-boxed/
├── src/
│   ├── index.ts       # Default export (everything, includes boxed)
│   ├── activity.ts    # Activity exports + boxed
│   ├── workflow.ts    # Workflow exports (NO boxed)
│   └── handler.ts     # Implementation (shared)
└── dist/
    ├── index.{mjs,cjs,d.mts,d.cts}
    ├── activity.{mjs,cjs,d.mts,d.cts}
    └── workflow.{mjs,cjs,d.mts,d.cts}
```

## Usage Examples

### Standard Worker (@temporal-contract/worker)

#### Activities File

```typescript
// src/application/activities.ts
import { declareActivitiesHandler } from '@temporal-contract/worker/activity';
import { myContract } from './contract';

export const activitiesHandler = declareActivitiesHandler({
  contract: myContract,
  activities: {
    sendEmail: async ({ to, subject, body }) => {
      await emailService.send({ to, subject, body });
      return { sent: true };
    },
  },
});
```

#### Workflow File

```typescript
// src/application/workflows.ts
import { declareWorkflow } from '@temporal-contract/worker/workflow';
import { myContract } from './contract';

export const processOrder = declareWorkflow({
  workflowName: 'processOrder',
  contract: myContract,
  implementation: async (context, order) => {
    await context.activities.sendEmail({
      to: order.customerEmail,
      subject: 'Order Confirmed',
      body: `Your order ${order.id} has been confirmed`,
    });
    return { status: 'success' };
  },
});
```

### Boxed Worker (@temporal-contract/worker-boxed)

#### Activities File

```typescript
// src/application/activities.ts
import {
  declareActivitiesHandler,
  Result,
  Future
} from '@temporal-contract/worker-boxed/activity';
import type { BoxedActivityHandler } from '@temporal-contract/worker-boxed/activity';
import { myContract } from './contract';

const sendEmail: BoxedActivityHandler<typeof myContract, 'sendEmail'> =
  ({ to, subject, body }) => {
    return Future.fromPromise(emailService.send({ to, subject, body }))
      .map(() => ({ sent: true }))
      .mapError(error => ({
        code: 'EMAIL_FAILED',
        message: error.message,
      }));
  };

export const activitiesHandler = declareActivitiesHandler({
  contract: myContract,
  activities: { sendEmail },
});
```

#### Workflow File

```typescript
// src/application/workflows.ts
// ⚠️ Import from /workflow to exclude @swan-io/boxed
import { declareWorkflow } from '@temporal-contract/worker-boxed/workflow';
import { myContract } from './contract';

export const processOrder = declareWorkflow({
  workflowName: 'processOrder',
  contract: myContract,
  implementation: async (context, order) => {
    try {
      // Activities automatically throw on Result.Error
      await context.activities.sendEmail({
        to: order.customerEmail,
        subject: 'Order Confirmed',
        body: `Your order ${order.id} has been confirmed`,
      });
      return { status: 'success' };
    } catch (error) {
      // Handle activity error
      return { status: 'failed', error: error.code };
    }
  },
});
```

## Webpack Bundle Analysis

### With Default Import (❌ Breaks)

```typescript
// workflow.ts
import { declareWorkflow } from '@temporal-contract/worker-boxed';

// Webpack bundles:
// - declareWorkflow ✅
// - Result, Future, Option, AsyncData ❌ (includes FinalizationRegistry)
// Result: DeterminismViolationError at runtime
```

### With /workflow Import (✅ Works)

```typescript
// workflow.ts
import { declareWorkflow } from '@temporal-contract/worker-boxed/workflow';

// Webpack bundles:
// - declareWorkflow ✅
// - NO boxed imports ✅
// Result: Workflow runs successfully
```

## Package.json Configuration

### @temporal-contract/worker

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./activity": {
      "import": "./dist/activity.mjs",
      "require": "./dist/activity.cjs"
    },
    "./workflow": {
      "import": "./dist/workflow.mjs",
      "require": "./dist/workflow.cjs"
    }
  }
}
```

### @temporal-contract/worker-boxed

```json
{
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./activity": {
      "import": "./dist/activity.mjs",
      "require": "./dist/activity.cjs"
    },
    "./workflow": {
      "import": "./dist/workflow.mjs",
      "require": "./dist/workflow.cjs"
    }
  }
}
```

## Build Process

Both packages use `tsdown` to build multiple entry points:

```json
{
  "scripts": {
    "build": "tsdown src/index.ts src/activity.ts src/workflow.ts --format cjs,esm --dts --clean"
  }
}
```

This generates:

- CommonJS (`.cjs`) and ESM (`.mjs`) for runtime
- Type definitions (`.d.cts`, `.d.mts`) for TypeScript

## Benefits

### 1. Tree Shaking

Only imports what's needed - workflows don't bundle activity-related code

### 2. Safety

Prevents accidental imports of non-deterministic code in workflows

### 3. Explicit Intent

Clear separation shows which code runs where:

- `/activity` → Worker process (Node.js)
- `/workflow` → Workflow sandbox (deterministic V8)

### 4. Better DX

Autocompletion shows only relevant exports for each context

## Migration Guide

### From Default Imports

**Before:**

```typescript
// activities.ts
import { declareActivitiesHandler, Result, Future } from '@temporal-contract/worker-boxed';

// workflows.ts
import { declareWorkflow } from '@temporal-contract/worker-boxed';
```

**After:**

```typescript
// activities.ts
import { declareActivitiesHandler, Result, Future } from '@temporal-contract/worker-boxed/activity';

// workflows.ts
import { declareWorkflow } from '@temporal-contract/worker-boxed/workflow';
```

### Benefits of Migration

- ✅ Prevents bundling errors
- ✅ Smaller workflow bundles
- ✅ Future-proof against similar issues
- ✅ Better type safety

## Troubleshooting

### Error: Module not found '@temporal-contract/worker-boxed/workflow'

**Cause:** Old version of package or build artifacts not up to date

**Solution:**

```bash
pnpm install
pnpm build --filter @temporal-contract/worker-boxed
```

### Error: FinalizationRegistry cannot be used in Workflows

**Cause:** Importing from default entry point in workflow file

**Solution:** Change import to use `/workflow`:

```typescript
// ❌ Before
import { declareWorkflow } from '@temporal-contract/worker-boxed';

// ✅ After
import { declareWorkflow } from '@temporal-contract/worker-boxed/workflow';
```

## Related Documentation

- [Worker Implementation Guide](./CONTRACT_HANDLER.md)
- [Activity Handlers](./ACTIVITY_HANDLERS.md)
- [Worker Package README](../packages/worker/README.md)
- [Worker-Boxed Package README](../packages/worker-boxed/README.md)

## References

- [Temporal Determinism](https://docs.temporal.io/workflows#deterministic-constraints)
- [Webpack Entry Points](https://webpack.js.org/configuration/entry-context/)
- [Package Exports](https://nodejs.org/api/packages.html#exports)
- [@swan-io/boxed Documentation](https://swan-io.github.io/boxed/)
