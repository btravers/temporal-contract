---
"@temporal-contract/worker-nestjs": minor
---

Add NestJS integration package for activities with multi-handler approach

- Add @ActivitiesHandler decorator for ultimate type safety (inspired by ts-rest)
- Add ActivitiesModule.forRoot() using ConfigurableModuleBuilder pattern
- Add createActivitiesModule() helper for backwards compatibility
- One handler class implements all activities from a contract
- Full support for NestJS dependency injection
- Re-export declareWorkflow from @temporal-contract/worker for convenience
- Note: Only activities benefit from NestJS DI (workflows cannot due to Temporal isolation)
