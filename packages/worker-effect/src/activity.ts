import { Cause, Effect, Exit, Layer, ManagedRuntime, Option, Schema } from "effect";
import type {
  EffectActivityDefinition,
  EffectContractDefinition,
  EffectWorkerInferInput,
  EffectWorkerInferOutput,
} from "@temporal-contract/contract-effect";
import {
  ActivityDefinitionNotFoundError,
  ActivityError,
  ActivityInputValidationError,
  ActivityOutputValidationError,
} from "./errors.js";

// ---------------------------------------------------------------------------
// Activity implementation types
// ---------------------------------------------------------------------------

/**
 * Activity implementation returning an Effect with no service requirements
 */
type EffectActivityImplementation<TActivity extends EffectActivityDefinition> = (
  args: EffectWorkerInferInput<TActivity>,
) => Effect.Effect<EffectWorkerInferOutput<TActivity>, ActivityError>;

/**
 * Activity implementation returning an Effect that requires services from context
 */
type EffectActivityImplementationR<TActivity extends EffectActivityDefinition, R> = (
  args: EffectWorkerInferInput<TActivity>,
) => Effect.Effect<EffectWorkerInferOutput<TActivity>, ActivityError, R>;

// ---------------------------------------------------------------------------
// Activities maps
// ---------------------------------------------------------------------------

type EffectActivitiesImplementations<TActivities extends Record<string, EffectActivityDefinition>> =
  {
    [K in keyof TActivities]: EffectActivityImplementation<TActivities[K]>;
  };

type EffectActivitiesImplementationsR<
  TActivities extends Record<string, EffectActivityDefinition>,
  R,
> = {
  [K in keyof TActivities]: EffectActivityImplementationR<TActivities[K], R>;
};

type ContractEffectActivitiesImplementations<TContract extends EffectContractDefinition> =
  (TContract["activities"] extends Record<string, EffectActivityDefinition>
    ? EffectActivitiesImplementations<TContract["activities"]>
    : Record<string, never>) & {
    [TWorkflow in keyof TContract["workflows"]]: TContract["workflows"][TWorkflow]["activities"] extends Record<
      string,
      EffectActivityDefinition
    >
      ? EffectActivitiesImplementations<TContract["workflows"][TWorkflow]["activities"]>
      : Record<string, never>;
  };

type ContractEffectActivitiesImplementationsR<
  TContract extends EffectContractDefinition,
  R,
> = (TContract["activities"] extends Record<string, EffectActivityDefinition>
  ? EffectActivitiesImplementationsR<TContract["activities"], R>
  : Record<string, never>) & {
  [TWorkflow in keyof TContract["workflows"]]: TContract["workflows"][TWorkflow]["activities"] extends Record<
    string,
    EffectActivityDefinition
  >
    ? EffectActivitiesImplementationsR<TContract["workflows"][TWorkflow]["activities"], R>
    : Record<string, never>;
};

// ---------------------------------------------------------------------------
// Temporal-compatible activities handler (flat Promise-based functions)
// ---------------------------------------------------------------------------

type ActivityImplementation<TActivity extends EffectActivityDefinition> = (
  args: EffectWorkerInferInput<TActivity>,
) => Promise<EffectWorkerInferOutput<TActivity>>;

type ActivitiesHandler<TActivities extends Record<string, EffectActivityDefinition>> = {
  [K in keyof TActivities]: ActivityImplementation<TActivities[K]>;
};

type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

/**
 * Temporal-compatible activities object produced by `declareActivitiesHandler`
 *
 * All activity implementations are flattened to the root level (Temporal requirement).
 */
export type EffectActivitiesHandler<TContract extends EffectContractDefinition> =
  (TContract["activities"] extends Record<string, EffectActivityDefinition>
    ? ActivitiesHandler<TContract["activities"]>
    : Record<string, never>) &
    UnionToIntersection<
      {
        [TWorkflow in keyof TContract["workflows"]]: TContract["workflows"][TWorkflow]["activities"] extends Record<
          string,
          EffectActivityDefinition
        >
          ? ActivitiesHandler<TContract["workflows"][TWorkflow]["activities"]>
          : Record<string, never>;
      }[keyof TContract["workflows"]]
    >;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Convert a typed error from `Cause` back into a thrown exception for Temporal.
 *
 * `ActivityError` and validation errors all extend `Error` via `Data.TaggedError`,
 * so Temporal's retry machinery correctly detects and handles them.
 */
function extractAndThrowCause<E>(cause: Cause.Cause<E>): never {
  const typed = Cause.failureOption(cause);
  if (Option.isSome(typed)) {
    throw typed.value;
  }
  // Defect (unexpected die/interrupt) — wrap in ActivityError so Temporal can retry
  throw new ActivityError({
    code: "DEFECT",
    message: "Unexpected activity failure",
    cause: Cause.squash(cause),
  });
}

/**
 * Build a single Temporal-compatible wrapper around an Effect activity implementation.
 *
 * Handles:
 * - Input validation via Effect Schema
 * - Running the Effect implementation via the provided runtime
 * - Output validation via Effect Schema
 * - Converting Effect failures back to thrown errors for Temporal retry policies
 */
function makeWrapped<R>(
  activityName: string,
  activityDef: EffectActivityDefinition,
  effectImpl: (args: unknown) => Effect.Effect<unknown, ActivityError, R>,
  runtime: { runPromiseExit: <A, E>(effect: Effect.Effect<A, E, R>) => Promise<Exit.Exit<A, E>> },
): (...args: unknown[]) => Promise<unknown> {
  return async (...args: unknown[]) => {
    const input = args.length === 1 ? args[0] : args;

    const program = Effect.gen(function* () {
      const validatedInput = yield* Schema.decodeUnknown(activityDef.input)(input).pipe(
        Effect.mapError(
          (parseError) => new ActivityInputValidationError({ activityName, parseError }),
        ),
      );

      const output = yield* effectImpl(validatedInput);

      return yield* Schema.decodeUnknown(activityDef.output)(output).pipe(
        Effect.mapError(
          (parseError) => new ActivityOutputValidationError({ activityName, parseError }),
        ),
      );
    });

    const exit = await runtime.runPromiseExit(program);

    if (Exit.isSuccess(exit)) {
      return exit.value;
    }

    return extractAndThrowCause(exit.cause);
  };
}

// Default runtime (no service requirements)
const defaultRuntime = {
  runPromiseExit: <A, E>(effect: Effect.Effect<A, E, never>) => Effect.runPromiseExit(effect),
};

// ---------------------------------------------------------------------------
// Public API: plain variant (no Layer)
// ---------------------------------------------------------------------------

/**
 * Options for `declareActivitiesHandler`
 */
type DeclareActivitiesHandlerOptions<TContract extends EffectContractDefinition> = {
  contract: TContract;
  activities: ContractEffectActivitiesImplementations<TContract>;
};

/**
 * Create a Temporal-compatible activities handler from Effect implementations
 *
 * Activity implementations return `Effect<Output, ActivityError>` instead of
 * `Future<Result<Output, ActivityError>>`. The handler validates inputs and outputs
 * using the contract's Effect Schemas and converts Effect failures back into thrown
 * errors so Temporal's retry policies work correctly.
 *
 * Use this variant when your activities have no Effect service dependencies.
 * For activities that need injected services, use `declareActivitiesHandlerWithLayer`.
 *
 * @example
 * ```ts
 * import { Effect } from "effect";
 * import { declareActivitiesHandler, ActivityError } from "@temporal-contract/worker-effect";
 * import { orderContract } from "./contract";
 *
 * export const activities = declareActivitiesHandler({
 *   contract: orderContract,
 *   activities: {
 *     orderWorkflow: {
 *       chargePayment: (args) =>
 *         Effect.tryPromise({
 *           try:   () => paymentService.charge(args.amount),
 *           catch: (e) => new ActivityError({ code: "CHARGE_FAILED", message: "...", cause: e }),
 *         }),
 *     },
 *   },
 * });
 * ```
 */
export function declareActivitiesHandler<TContract extends EffectContractDefinition>(
  options: DeclareActivitiesHandlerOptions<TContract>,
): EffectActivitiesHandler<TContract> {
  return buildActivitiesHandler(options.contract, options.activities, defaultRuntime);
}

// ---------------------------------------------------------------------------
// Public API: Layer variant (with Effect service injection)
// ---------------------------------------------------------------------------

/**
 * Options for `declareActivitiesHandlerWithLayer`
 */
type DeclareActivitiesHandlerWithLayerOptions<TContract extends EffectContractDefinition, R> = {
  contract: TContract;
  /**
   * Effect Layer providing the services required by the activity implementations.
   * The Layer is built once at startup; all activity invocations share the same runtime.
   */
  layer: Layer.Layer<R>;
  activities: ContractEffectActivitiesImplementationsR<TContract, R>;
};

/**
 * Create a Temporal-compatible activities handler from Effect implementations
 * that depend on Effect services provided via a Layer.
 *
 * The Layer is used to build a `ManagedRuntime` once at startup. All activity
 * invocations share this runtime, so services like database connections are
 * only initialised once.
 *
 * @example
 * ```ts
 * import { Effect, Layer, Context } from "effect";
 * import { declareActivitiesHandlerWithLayer, ActivityError } from "@temporal-contract/worker-effect";
 * import { orderContract } from "./contract";
 *
 * // Define a service
 * class Database extends Context.Tag("Database")<Database, {
 *   query: (sql: string) => Effect.Effect<unknown, ActivityError>
 * }>() {}
 *
 * // Provide a live implementation
 * const DatabaseLive = Layer.succeed(Database, {
 *   query: (sql) => Effect.tryPromise({
 *     try: () => db.execute(sql),
 *     catch: (e) => new ActivityError({ code: "DB_ERROR", message: String(e) }),
 *   }),
 * });
 *
 * export const activities = declareActivitiesHandlerWithLayer({
 *   contract: orderContract,
 *   layer: DatabaseLive,
 *   activities: {
 *     orderWorkflow: {
 *       chargePayment: (args) => Effect.gen(function* () {
 *         const db = yield* Database;
 *         const row = yield* db.query(`SELECT * FROM orders WHERE id = '${args.orderId}'`);
 *         return { transactionId: String(row) };
 *       }),
 *     },
 *   },
 * });
 * ```
 */
export async function declareActivitiesHandlerWithLayer<
  TContract extends EffectContractDefinition,
  R,
>(
  options: DeclareActivitiesHandlerWithLayerOptions<TContract, R>,
): Promise<EffectActivitiesHandler<TContract>> {
  const runtime = ManagedRuntime.make(options.layer);

  return buildActivitiesHandler(options.contract, options.activities, runtime);
}

// ---------------------------------------------------------------------------
// Core builder (shared by both variants)
// ---------------------------------------------------------------------------

function buildActivitiesHandler<TContract extends EffectContractDefinition, R>(
  contract: TContract,
  activities: Record<string, unknown>,
  runtime: {
    runPromiseExit: <A, E>(effect: Effect.Effect<A, E, R>) => Promise<Exit.Exit<A, E>>;
  },
): EffectActivitiesHandler<TContract> {
  const wrapped = {} as EffectActivitiesHandler<TContract>;

  // 1. Wrap global activities (contract.activities)
  if (contract.activities) {
    for (const [activityName, impl] of Object.entries(activities)) {
      // Skip workflow namespace keys
      if (contract.workflows && activityName in contract.workflows) {
        continue;
      }

      const activityDef = (contract.activities as Record<string, EffectActivityDefinition>)[
        activityName
      ];

      if (!activityDef) {
        throw new ActivityDefinitionNotFoundError({
          activityName,
          availableActivities: Object.keys(contract.activities),
        });
      }

      (wrapped as Record<string, unknown>)[activityName] = makeWrapped(
        activityName,
        activityDef,
        impl as (args: unknown) => Effect.Effect<unknown, ActivityError, R>,
        runtime,
      );
    }
  }

  // 2. Wrap workflow-scoped activities (flattened to root level for Temporal)
  if (contract.workflows) {
    for (const [workflowName, workflowDef] of Object.entries(contract.workflows)) {
      const wfActivitiesImpl = activities[workflowName] as Record<string, unknown> | undefined;

      if (!wfActivitiesImpl) {
        continue;
      }

      const wfDefs = workflowDef.activities ?? {};

      for (const [activityName, impl] of Object.entries(wfActivitiesImpl)) {
        const activityDef = (wfDefs as Record<string, EffectActivityDefinition>)[activityName];

        if (!activityDef) {
          throw new ActivityDefinitionNotFoundError({
            activityName: `${workflowName}.${activityName}`,
            availableActivities: Object.keys(wfDefs),
          });
        }

        (wrapped as Record<string, unknown>)[activityName] = makeWrapped(
          `${workflowName}.${activityName}`,
          activityDef,
          impl as (args: unknown) => Effect.Effect<unknown, ActivityError, R>,
          runtime,
        );
      }
    }
  }

  return wrapped;
}
