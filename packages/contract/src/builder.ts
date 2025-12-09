import type {
  ActivityDefinition,
  ContractDefinition,
  QueryDefinition,
  SignalDefinition,
  UpdateDefinition,
  WorkflowDefinition,
} from "./types.js";

/**
 * Builder for creating activity definitions
 *
 * @example
 * ```ts
 * const myActivity = defineActivity({
 *   input: z.tuple([z.object({ name: z.string() })]),
 *   output: z.object({ greeting: z.string() }),
 * });
 * ```
 */
export const defineActivity = <TActivity extends ActivityDefinition>(
  definition: TActivity,
): TActivity => {
  return definition;
};

/**
 * Builder for creating signal definitions
 *
 * @example
 * ```ts
 * const mySignal = defineSignal({
 *   input: z.object({ message: z.string() }),
 * });
 * ```
 */
export const defineSignal = <TSignal extends SignalDefinition>(definition: TSignal): TSignal => {
  return definition;
};

/**
 * Builder for creating query definitions
 *
 * @example
 * ```ts
 * const myQuery = defineQuery({
 *   input: z.object({ id: z.string() }),
 *   output: z.object({ status: z.string() }),
 * });
 * ```
 */
export const defineQuery = <TQuery extends QueryDefinition>(definition: TQuery): TQuery => {
  return definition;
};

/**
 * Builder for creating update definitions
 *
 * @example
 * ```ts
 * const myUpdate = defineUpdate({
 *   input: z.object({ value: z.number() }),
 *   output: z.object({ newValue: z.number() }),
 * });
 * ```
 */
export const defineUpdate = <TUpdate extends UpdateDefinition>(definition: TUpdate): TUpdate => {
  return definition;
};

/**
 * Builder for creating workflow definitions
 *
 * @example
 * ```ts
 * const myWorkflow = defineWorkflow({
 *   input: z.tuple([z.object({ orderId: z.string() })]),
 *   output: z.object({ status: z.string() }),
 *   activities: {
 *     processPayment: defineActivity({
 *       input: z.tuple([z.object({ amount: z.number() })]),
 *       output: z.object({ success: z.boolean() }),
 *     }),
 *   },
 * });
 * ```
 */
export const defineWorkflow = <TWorkflow extends WorkflowDefinition>(
  definition: TWorkflow,
): TWorkflow => {
  return definition;
};

/**
 * Builder for creating a complete contract
 *
 * @example
 * ```ts
 * const myContract = defineContract({
 *   taskQueue: 'my-service',
 *   workflows: {
 *     processOrder: defineWorkflow({ ... }),
 *     sendNotification: defineWorkflow({ ... }),
 *   },
 *   activities: {
 *     sendEmail: defineActivity({ ... }),
 *   },
 * });
 * ```
 */
export const defineContract = <TContract extends ContractDefinition>(
  definition: TContract,
): TContract => {
  return definition;
};
