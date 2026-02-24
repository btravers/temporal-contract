import { Client, WorkflowHandle } from "@temporalio/client";
import type { WorkflowStartOptions } from "@temporalio/client";
import { Effect, Schema } from "effect";
import type {
  EffectClientInferInput,
  EffectClientInferOutput,
  EffectClientInferWorkflowQueries,
  EffectClientInferWorkflowSignals,
  EffectClientInferWorkflowUpdates,
  EffectContractDefinition,
  EffectWorkflowDefinition,
} from "@temporal-contract/contract-effect";
import {
  QueryValidationError,
  RuntimeClientError,
  SignalValidationError,
  UpdateValidationError,
  WorkflowNotFoundError,
  WorkflowValidationError,
} from "./errors.js";

/**
 * Options for starting a workflow — same shape as Temporal's WorkflowStartOptions
 * but with typed args derived from the contract schema.
 */
export type EffectTypedWorkflowStartOptions<
  TContract extends EffectContractDefinition,
  TWorkflowName extends Extract<keyof TContract["workflows"], string>,
> = Omit<WorkflowStartOptions, "taskQueue" | "args"> & {
  args: EffectClientInferInput<TContract["workflows"][TWorkflowName]>;
};

/**
 * Typed workflow handle with Effect-native return types
 */
export type EffectTypedWorkflowHandle<TWorkflow extends EffectWorkflowDefinition> = {
  workflowId: string;

  /**
   * Type-safe queries — each returns Effect<Output, QueryValidationError | RuntimeClientError>
   */
  queries: {
    [K in keyof EffectClientInferWorkflowQueries<TWorkflow>]: EffectClientInferWorkflowQueries<TWorkflow>[K] extends (
      ...args: infer Args
    ) => Promise<infer R>
      ? (...args: Args) => Effect.Effect<R, QueryValidationError | RuntimeClientError>
      : never;
  };

  /**
   * Type-safe signals — each returns Effect<void, SignalValidationError | RuntimeClientError>
   */
  signals: {
    [K in keyof EffectClientInferWorkflowSignals<TWorkflow>]: EffectClientInferWorkflowSignals<TWorkflow>[K] extends (
      ...args: infer Args
    ) => Promise<void>
      ? (...args: Args) => Effect.Effect<void, SignalValidationError | RuntimeClientError>
      : never;
  };

  /**
   * Type-safe updates — each returns Effect<Output, UpdateValidationError | RuntimeClientError>
   */
  updates: {
    [K in keyof EffectClientInferWorkflowUpdates<TWorkflow>]: EffectClientInferWorkflowUpdates<TWorkflow>[K] extends (
      ...args: infer Args
    ) => Promise<infer R>
      ? (...args: Args) => Effect.Effect<R, UpdateValidationError | RuntimeClientError>
      : never;
  };

  /**
   * Get the workflow result
   */
  result: () => Effect.Effect<
    EffectClientInferOutput<TWorkflow>,
    WorkflowValidationError | RuntimeClientError
  >;

  /**
   * Terminate the workflow
   */
  terminate: (reason?: string) => Effect.Effect<void, RuntimeClientError>;

  /**
   * Cancel the workflow
   */
  cancel: () => Effect.Effect<void, RuntimeClientError>;

  /**
   * Get the workflow execution description (status, metadata, etc.)
   */
  describe: () => Effect.Effect<
    Awaited<ReturnType<WorkflowHandle["describe"]>>,
    RuntimeClientError
  >;

  /**
   * Fetch the full workflow execution history
   */
  fetchHistory: () => Effect.Effect<
    Awaited<ReturnType<WorkflowHandle["fetchHistory"]>>,
    RuntimeClientError
  >;
};

/**
 * Effect-native typed Temporal client
 *
 * All methods return `Effect<T, E>` instead of `Future<Result<T, E>>`.
 * Errors are `Data.TaggedError` subclasses, enabling `Effect.catchTag` pattern matching.
 *
 * Works exclusively with contracts defined via `defineEffectContract` from
 * `@temporal-contract/contract-effect`.
 *
 * @example
 * ```ts
 * import { Effect, pipe } from "effect";
 * import { Connection, Client } from "@temporalio/client";
 * import { EffectTypedClient } from "@temporal-contract/client-effect";
 * import { orderContract } from "./contract";
 *
 * const connection = await Connection.connect();
 * const client = EffectTypedClient.create(orderContract, new Client({ connection }));
 *
 * const program = pipe(
 *   client.executeWorkflow("processOrder", {
 *     workflowId: "order-123",
 *     args: { orderId: "ORD-123", customerId: "CUST-1" },
 *   }),
 *   Effect.catchTag("WorkflowValidationError", (e) =>
 *     Effect.fail(new MyAppError(`Validation: ${e.parseError.message}`))
 *   ),
 *   Effect.catchTag("RuntimeClientError", (e) =>
 *     Effect.fail(new MyAppError(`Runtime: ${String(e.cause)}`))
 *   ),
 * );
 *
 * const result = await Effect.runPromise(program);
 * ```
 */
export class EffectTypedClient<TContract extends EffectContractDefinition> {
  private constructor(
    private readonly contract: TContract,
    private readonly client: Client,
  ) {}

  /**
   * Create an Effect-native typed Temporal client from a contract
   */
  static create<TContract extends EffectContractDefinition>(
    contract: TContract,
    client: Client,
  ): EffectTypedClient<TContract> {
    return new EffectTypedClient(contract, client);
  }

  /**
   * Start a workflow and return a typed handle
   *
   * @example
   * ```ts
   * const handle = await Effect.runPromise(
   *   client.startWorkflow("processOrder", {
   *     workflowId: "order-123",
   *     args: { orderId: "ORD-123" },
   *   })
   * );
   * ```
   */
  startWorkflow<TWorkflowName extends Extract<keyof TContract["workflows"], string>>(
    workflowName: TWorkflowName,
    { args, ...temporalOptions }: EffectTypedWorkflowStartOptions<TContract, TWorkflowName>,
  ): Effect.Effect<
    EffectTypedWorkflowHandle<TContract["workflows"][TWorkflowName]>,
    WorkflowNotFoundError | WorkflowValidationError | RuntimeClientError
  > {
    return Effect.gen(this, function* () {
      const definition = this.contract.workflows[workflowName] as
        | TContract["workflows"][TWorkflowName]
        | undefined;

      if (!definition) {
        return yield* Effect.fail(
          new WorkflowNotFoundError({
            workflowName,
            availableWorkflows: Object.keys(this.contract.workflows),
          }),
        );
      }

      const validatedInput = yield* Schema.decodeUnknown(definition.input)(args).pipe(
        Effect.mapError(
          (parseError) =>
            new WorkflowValidationError({
              workflowName,
              direction: "input",
              parseError,
            }),
        ),
      );

      const handle = yield* Effect.tryPromise({
        try: () =>
          this.client.workflow.start(workflowName, {
            ...temporalOptions,
            taskQueue: this.contract.taskQueue,
            args: [validatedInput],
          }),
        catch: (e) => new RuntimeClientError({ operation: "startWorkflow", cause: e }),
      });

      return this.createTypedHandle(handle, definition, workflowName);
    });
  }

  /**
   * Execute a workflow (start and wait for result)
   *
   * @example
   * ```ts
   * const result = await Effect.runPromise(
   *   pipe(
   *     client.executeWorkflow("processOrder", {
   *       workflowId: "order-123",
   *       args: { orderId: "ORD-123" },
   *     }),
   *     Effect.catchTag("WorkflowNotFoundError", () => Effect.succeed(defaultResult)),
   *   )
   * );
   * ```
   */
  executeWorkflow<TWorkflowName extends Extract<keyof TContract["workflows"], string>>(
    workflowName: TWorkflowName,
    { args, ...temporalOptions }: EffectTypedWorkflowStartOptions<TContract, TWorkflowName>,
  ): Effect.Effect<
    EffectClientInferOutput<TContract["workflows"][TWorkflowName]>,
    WorkflowNotFoundError | WorkflowValidationError | RuntimeClientError
  > {
    return Effect.gen(this, function* () {
      const definition = this.contract.workflows[workflowName] as
        | TContract["workflows"][TWorkflowName]
        | undefined;

      if (!definition) {
        return yield* Effect.fail(
          new WorkflowNotFoundError({
            workflowName,
            availableWorkflows: Object.keys(this.contract.workflows),
          }),
        );
      }

      const validatedInput = yield* Schema.decodeUnknown(definition.input)(args).pipe(
        Effect.mapError(
          (parseError) =>
            new WorkflowValidationError({
              workflowName,
              direction: "input",
              parseError,
            }),
        ),
      );

      const rawResult = yield* Effect.tryPromise({
        try: () =>
          this.client.workflow.execute(workflowName, {
            ...temporalOptions,
            taskQueue: this.contract.taskQueue,
            args: [validatedInput],
          }),
        catch: (e) => new RuntimeClientError({ operation: "executeWorkflow", cause: e }),
      });

      return yield* Schema.decodeUnknown(definition.output)(rawResult).pipe(
        Effect.mapError(
          (parseError) =>
            new WorkflowValidationError({
              workflowName,
              direction: "output",
              parseError,
            }),
        ),
      );
    });
  }

  /**
   * Get a handle to an existing workflow by ID
   *
   * @example
   * ```ts
   * const handle = await Effect.runPromise(
   *   client.getHandle("processOrder", "order-123")
   * );
   * ```
   */
  getHandle<TWorkflowName extends Extract<keyof TContract["workflows"], string>>(
    workflowName: TWorkflowName,
    workflowId: string,
  ): Effect.Effect<
    EffectTypedWorkflowHandle<TContract["workflows"][TWorkflowName]>,
    WorkflowNotFoundError | RuntimeClientError
  > {
    return Effect.gen(this, function* () {
      const definition = this.contract.workflows[workflowName] as
        | TContract["workflows"][TWorkflowName]
        | undefined;

      if (!definition) {
        return yield* Effect.fail(
          new WorkflowNotFoundError({
            workflowName,
            availableWorkflows: Object.keys(this.contract.workflows),
          }),
        );
      }

      const handle = yield* Effect.try({
        try: () => this.client.workflow.getHandle(workflowId),
        catch: (e) => new RuntimeClientError({ operation: "getHandle", cause: e }),
      });

      return this.createTypedHandle(handle, definition, workflowName);
    });
  }

  private createTypedHandle<TWorkflow extends EffectWorkflowDefinition>(
    workflowHandle: WorkflowHandle,
    definition: TWorkflow,
    workflowName: string,
  ): EffectTypedWorkflowHandle<TWorkflow> {
    // Build each map into a plain Record first, then cast once at the return site.
    // The per-entry type cannot be verified by TypeScript at construction time because
    // the keys and value types are derived from a runtime-iterated generic object.
    const queries: Record<string, unknown> = {};
    if (definition.queries) {
      for (const [queryName, queryDef] of Object.entries(definition.queries)) {
        queries[queryName] = (
          args: EffectClientInferInput<typeof queryDef>,
        ): Effect.Effect<unknown, QueryValidationError | RuntimeClientError> =>
          Effect.gen(function* () {
            const validatedInput = yield* Schema.decodeUnknown(queryDef.input)(args).pipe(
              Effect.mapError(
                (parseError) =>
                  new QueryValidationError({ queryName, direction: "input", parseError }),
              ),
            );

            const rawResult = yield* Effect.tryPromise({
              try: () => workflowHandle.query(queryName, validatedInput),
              catch: (e) => new RuntimeClientError({ operation: "query", cause: e }),
            });

            return yield* Schema.decodeUnknown(queryDef.output)(rawResult).pipe(
              Effect.mapError(
                (parseError) =>
                  new QueryValidationError({ queryName, direction: "output", parseError }),
              ),
            );
          });
      }
    }

    const signals: Record<string, unknown> = {};
    if (definition.signals) {
      for (const [signalName, signalDef] of Object.entries(definition.signals)) {
        signals[signalName] = (
          args: EffectClientInferInput<typeof signalDef>,
        ): Effect.Effect<void, SignalValidationError | RuntimeClientError> =>
          Effect.gen(function* () {
            const validatedInput = yield* Schema.decodeUnknown(signalDef.input)(args).pipe(
              Effect.mapError(
                (parseError) => new SignalValidationError({ signalName, parseError }),
              ),
            );

            yield* Effect.tryPromise({
              try: () => workflowHandle.signal(signalName, validatedInput),
              catch: (e) => new RuntimeClientError({ operation: "signal", cause: e }),
            });
          });
      }
    }

    const updates: Record<string, unknown> = {};
    if (definition.updates) {
      for (const [updateName, updateDef] of Object.entries(definition.updates)) {
        updates[updateName] = (
          args: EffectClientInferInput<typeof updateDef>,
        ): Effect.Effect<unknown, UpdateValidationError | RuntimeClientError> =>
          Effect.gen(function* () {
            const validatedInput = yield* Schema.decodeUnknown(updateDef.input)(args).pipe(
              Effect.mapError(
                (parseError) =>
                  new UpdateValidationError({ updateName, direction: "input", parseError }),
              ),
            );

            const rawResult = yield* Effect.tryPromise({
              try: () => workflowHandle.executeUpdate(updateName, { args: [validatedInput] }),
              catch: (e) => new RuntimeClientError({ operation: "update", cause: e }),
            });

            return yield* Schema.decodeUnknown(updateDef.output)(rawResult).pipe(
              Effect.mapError(
                (parseError) =>
                  new UpdateValidationError({ updateName, direction: "output", parseError }),
              ),
            );
          });
      }
    }

    return {
      workflowId: workflowHandle.workflowId,
      // Necessary: dynamic construction cannot be verified against the mapped type at compile time
      queries: queries as EffectTypedWorkflowHandle<TWorkflow>["queries"],
      signals: signals as EffectTypedWorkflowHandle<TWorkflow>["signals"],
      updates: updates as EffectTypedWorkflowHandle<TWorkflow>["updates"],

      result: (): Effect.Effect<
        EffectClientInferOutput<TWorkflow>,
        WorkflowValidationError | RuntimeClientError
      > =>
        Effect.gen(function* () {
          const rawResult = yield* Effect.tryPromise({
            try: () => workflowHandle.result(),
            catch: (e) => new RuntimeClientError({ operation: "result", cause: e }),
          });

          return yield* Schema.decodeUnknown(definition.output)(rawResult).pipe(
            Effect.mapError(
              (parseError) =>
                new WorkflowValidationError({
                  workflowName,
                  direction: "output",
                  parseError,
                }),
            ),
          );
        }),

      terminate: (reason?: string): Effect.Effect<void, RuntimeClientError> =>
        Effect.tryPromise({
          try: () => workflowHandle.terminate(reason).then(() => undefined),
          catch: (e) => new RuntimeClientError({ operation: "terminate", cause: e }),
        }),

      cancel: (): Effect.Effect<void, RuntimeClientError> =>
        Effect.tryPromise({
          try: () => workflowHandle.cancel().then(() => undefined),
          catch: (e) => new RuntimeClientError({ operation: "cancel", cause: e }),
        }),

      describe: (): Effect.Effect<
        Awaited<ReturnType<WorkflowHandle["describe"]>>,
        RuntimeClientError
      > =>
        Effect.tryPromise({
          try: () => workflowHandle.describe(),
          catch: (e) => new RuntimeClientError({ operation: "describe", cause: e }),
        }),

      fetchHistory: (): Effect.Effect<
        Awaited<ReturnType<WorkflowHandle["fetchHistory"]>>,
        RuntimeClientError
      > =>
        Effect.tryPromise({
          try: () => workflowHandle.fetchHistory(),
          catch: (e) => new RuntimeClientError({ operation: "fetchHistory", cause: e }),
        }),
    };
  }
}
