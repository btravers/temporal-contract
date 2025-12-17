# @temporal-contract/worker-nestjs

## 0.0.1

### Patch Changes

- Initial release of NestJS integration for temporal-contract
- Add `@ActivitiesHandler` decorator for multi-handler approach (inspired by ts-rest)
- Add `createActivitiesModule()` helper for creating NestJS modules
- One handler class implements all activities from a contract for ultimate type safety
- Full support for NestJS dependency injection in activities
- Re-export declareWorkflow from @temporal-contract/worker for convenience
- Note: Only activities benefit from NestJS DI (workflows cannot due to Temporal isolation)
