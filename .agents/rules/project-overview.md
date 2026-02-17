# Project Overview

**temporal-contract** is a type-safe contract system for Temporal.io workflows and activities.

## Architecture

- Monorepo managed with **pnpm workspaces** and **Turborepo**
- Packages publish to npm under the `@temporal-contract/` scope
- Uses **Standard Schema** (Zod, Valibot, ArkType) for runtime validation
- Uses **Result/Future** pattern (via `@swan-io/boxed`) instead of throwing exceptions

## Package Map

| Package         | Purpose                                                    |
| --------------- | ---------------------------------------------------------- |
| `contract`      | Contract builder (`defineContract`) and type definitions   |
| `worker`        | Type-safe worker, workflow declarations, activity handlers |
| `client`        | Type-safe client for consuming workflows via Result/Future |
| `boxed`         | Re-exports Result and Future types from @swan-io/boxed     |
| `testing`       | Testing utilities (global setup, Temporal test server)     |
| `worker-nestjs` | NestJS module integration for Temporal workers             |
| `client-nestjs` | NestJS module integration for Temporal clients             |

## Key Concepts

- **Contract** — defines task queue, workflows, activities, signals, queries, updates with schemas
- **Worker** — `declareWorkflow` + `declareActivitiesHandler` with automatic validation
- **Client** — `TypedClient.create()` returns Future<Result<T, E>> for all operations
- **Boxed** — Result<Ok, Error> and Future<Result> for explicit error handling
