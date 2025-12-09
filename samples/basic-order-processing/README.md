# Basic Order Processing Sample

This sample demonstrates a simple order processing system using `temporal-contract`.

## What's Included

- **Contract Definition**: Type-safe contract with workflows and activities
- **Activities Implementation**: Payment processing, inventory management, and notifications
- **Workflow Implementation**: Order processing orchestration
- **Worker**: Temporal worker setup
- **Client**: Example client to start workflows

## Architecture

```
src/
├── contract.ts           # Contract definition
├── activities/
│   └── index.ts         # Activities implementation
├── workflows/
│   └── processOrder.ts  # Workflow implementation
├── worker.ts            # Worker setup
└── client.ts            # Client example
```

## Prerequisites

Make sure you have Temporal server running locally:

```bash
temporal server start-dev
```

## Running the Sample

1. Install dependencies (from repository root):

```bash
pnpm install
pnpm build
```

2. Start the worker:

```bash
cd samples/basic-order-processing
pnpm dev:worker
```

3. In another terminal, run the client:

```bash
cd samples/basic-order-processing
pnpm dev:client
```

## What This Sample Demonstrates

- ✅ **Type-Safe Contracts**: Define workflows and activities with full TypeScript types
- ✅ **Automatic Validation**: Input/output validation using Zod schemas
- ✅ **Global Activities**: Shared activities across workflows
- ✅ **Workflow Context**: Typed access to activities and workflow info
- ✅ **Two-Part Architecture**: Separate activities handler and workflow files
- ✅ **Tuple Arguments**: Type-safe multiple parameters
- ✅ **Error Handling**: Proper error handling in activities

## Key Concepts

### Contract Definition

The contract defines the structure of your workflows and activities with Zod schemas for validation.

### Activities Handler

All activities (global + workflow-specific) are implemented together using `declareActivitiesHandler`.

### Workflow Implementation

Each workflow is implemented in a separate file using `declareWorkflow`, receiving a typed context with activities.

### Worker Setup

The worker uses `workflowsPath` to load workflows from the file system and includes the activities handler.

## Next Steps

- Try modifying the order processing logic
- Add new activities or workflows to the contract
- Experiment with different validation schemas
- Add error scenarios and see how they're handled
