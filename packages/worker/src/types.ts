import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { AnySchema } from "@temporal-contract/contract";

/**
 * Infer input type from a definition (worker perspective)
 * Worker receives the output type (after input schema parsing/transformation)
 */
export type WorkerInferInput<T extends { input: AnySchema }> = StandardSchemaV1.InferOutput<
  T["input"]
>;

/**
 * Infer output type from a definition (worker perspective)
 * Worker returns the input type (before output schema parsing/transformation)
 */
export type WorkerInferOutput<T extends { output: AnySchema }> = StandardSchemaV1.InferInput<
  T["output"]
>;

/**
 * Infer input type from a definition (client perspective)
 * Client sends the input type (before input schema parsing/transformation)
 */
export type ClientInferInput<T extends { input: AnySchema }> = StandardSchemaV1.InferInput<
  T["input"]
>;

/**
 * Infer output type from a definition (client perspective)
 * Client receives the output type (after output schema parsing/transformation)
 */
export type ClientInferOutput<T extends { output: AnySchema }> = StandardSchemaV1.InferOutput<
  T["output"]
>;

type Entries<T> = {
  [K in keyof T]: [K, T[K]];
}[keyof T][];
