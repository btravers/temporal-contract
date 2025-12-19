/**
 * @temporal-contract/worker-nestjs
 *
 * NestJS integration for temporal-contract worker
 */

export { TemporalModule } from "./temporal.module.js";
export { TemporalService } from "./temporal.service.js";
export type {
  TemporalModuleOptions,
  TemporalModuleOptionsFactory,
  TemporalModuleAsyncOptions,
  ContractActivitiesImplementation,
} from "./interfaces.js";
