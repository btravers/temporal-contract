# @temporal-contract/worker-nestjs

## 0.0.1

### Patch Changes

- Initial release of NestJS integration for temporal-contract
- Add `@ImplementActivity` decorator for binding contract activities to service methods
- Add `createActivitiesModule()` helper for creating NestJS modules
- Add `@ImplementWorkflow` decorator for organizing workflow implementations
- Add `createWorkflowsModule()` helper for workflow organization
- Full support for NestJS dependency injection in activities
- Type-safe activity implementations with automatic validation
- Inspired by oRPC's NestJS integration pattern
