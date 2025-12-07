# Project Structure

```
temporal-contract/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── types.ts              # Core type definitions
│   │   │   └── index.ts              # Exports
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── contract/
│   │   ├── src/
│   │   │   ├── builder.ts            # Contract, workflow, activity builders
│   │   │   └── index.ts              # Exports
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   ├── worker/
│   │   ├── src/
│   │   │   ├── activity.ts           # createActivity implementation
│   │   │   ├── workflow.ts           # createWorkflow implementation
│   │   │   └── index.ts              # Exports
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   └── client/
│       ├── src/
│       │   ├── client.ts             # TypedClient and createClient
│       │   └── index.ts              # Exports
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md
│
├── examples/
│   ├── contract.ts                   # Example contract definition
│   ├── server.ts                     # Example workflow/activity implementations
│   ├── client.ts                     # Example client usage
│   ├── worker.ts                     # Example worker setup
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── .gitignore
├── .npmrc
├── package.json                      # Root package with turbo scripts
├── pnpm-workspace.yaml               # pnpm workspace config
├── turbo.json                        # Turborepo configuration
├── README.md                         # Main documentation
├── ARCHITECTURE.md                   # Architecture overview
├── CONTRIBUTING.md                   # Contribution guidelines
└── STRUCTURE.md                      # This file
```

## Package Dependencies

```
@temporal-contract/core
  ↓
  ├── @temporal-contract/contract
  ├── @temporal-contract/worker
  └── @temporal-contract/client
```

## Tech Stack

- **Language:** TypeScript
- **Package Manager:** pnpm
- **Build System:** Turborepo
- **Validation:** Zod
- **Workflow Engine:** Temporal.io

## Key Features per Package

### @temporal-contract/core
- Core type definitions
- Type inference utilities
- No runtime dependencies (types only)

### @temporal-contract/contract
- Contract builder functions
- Workflow and activity definition helpers
- Depends on: `core`

### @temporal-contract/worker
- Workflow implementation utilities
- Activity implementation utilities
- Automatic Zod validation
- Typed activity proxies
- Depends on: `core`, `temporalio`

### @temporal-contract/client
- Typed Temporal client
- Workflow execution methods
- Automatic Zod validation
- Depends on: `core`, `temporalio`
