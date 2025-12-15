export {
  defineActivity,
  defineContract,
  defineQuery,
  defineSignal,
  defineUpdate,
  defineWorkflow,
} from "./builder.js";

// Re-export boxed utilities for convenience
export { Future, Result } from "@swan-io/boxed";

export type {
  AnySchema,
  ActivityDefinition,
  SignalDefinition,
  QueryDefinition,
  UpdateDefinition,
  WorkflowDefinition,
  ContractDefinition,
  // Contract utility types
  InferWorkflowNames,
  InferActivityNames,
  InferContractWorkflows,
} from "./types.js";

export { defineNexusOperation, defineNexusService } from "./nexus-types.js";

export type {
  NexusOperationDefinition,
  NexusServiceDefinition,
  ContractDefinitionWithNexus,
  // Worker perspective types
  WorkerInferNexusOperationInput,
  WorkerInferNexusOperationOutput,
  WorkerInferNexusOperationHandler,
  WorkerInferNexusServiceHandlers,
  WorkerInferNexusServices,
  // Client perspective types
  ClientInferNexusOperationInput,
  ClientInferNexusOperationOutput,
  ClientInferNexusOperationInvoker,
  ClientInferNexusServiceOperations,
  ClientInferNexusServices,
  // Utility types
  InferNexusServiceNames,
  InferNexusOperationNames,
  NexusOperationHandler,
} from "./nexus-types.js";
