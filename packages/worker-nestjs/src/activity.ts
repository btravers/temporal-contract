// Entry point for activity handler and modules
export { ActivitiesHandler } from "./activity-handler.js";
export { extractActivitiesFromHandler, getContractFromHandler } from "./activity-handler.js";

export {
  createActivitiesModule,
  ActivitiesModule,
  ACTIVITIES_HANDLER_TOKEN,
} from "./activity-module.js";
export type { ActivitiesModuleOptions } from "./activity-module.js";

// Re-export types from worker package for convenience
export type {
  BoxedActivityImplementation,
  ActivityImplementations,
  ActivitiesHandler as ActivitiesHandlerType,
} from "@temporal-contract/worker/activity";
