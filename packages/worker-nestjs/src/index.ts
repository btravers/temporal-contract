/**
 * @temporal-contract/worker-nestjs
 *
 * NestJS integration for temporal-contract worker
 */

export { TemporalModule } from "./temporal.module.js";
export { TemporalService } from "./temporal.service.js";
export { TemporalActivity } from "./decorators.js";
export type {
  TemporalModuleOptions,
  TemporalModuleOptionsFactory,
  TemporalModuleAsyncOptions,
  ActivityHandlerMetadata,
} from "./interfaces.js";
