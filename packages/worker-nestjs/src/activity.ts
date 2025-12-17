// Entry point for activity decorators and modules
export { ImplementActivity } from "./activity-decorators.js";
export type { ActivityImplementationMetadata } from "./activity-decorators.js";
export { extractActivitiesFromProvider, getContractFromProvider } from "./activity-decorators.js";

export { createActivitiesModule, ACTIVITIES_HANDLER_TOKEN } from "./activity-module.js";
export type { ActivitiesModuleOptions } from "./activity-module.js";

// Re-export types from worker package for convenience
export type {
  BoxedActivityImplementation,
  ActivityImplementations,
  ActivitiesHandler,
} from "@temporal-contract/worker/activity";
