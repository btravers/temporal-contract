import { Connection, Client } from "@temporalio/client";
import type { ConnectionOptions } from "@temporalio/client";
import { Context, Effect, Layer } from "effect";
import type { EffectContractDefinition } from "@temporal-contract/contract-effect";
import { EffectTypedClient } from "./client.js";
import { RuntimeClientError } from "./errors.js";

/**
 * Generic Context.Tag for EffectTypedClient
 *
 * Because TypeScript generics cannot be used in `extends Context.Tag`, this
 * is provided as a factory so callers can create a correctly-typed tag for
 * their specific contract.
 *
 * @example
 * ```ts
 * import { makeTemporalClientTag } from "@temporal-contract/client-effect/layer";
 * import { orderContract } from "./contract";
 *
 * export const OrderClient = makeTemporalClientTag<typeof orderContract>("OrderClient");
 * export type OrderClient = Context.Tag.Service<typeof OrderClient>;
 * ```
 */
export function makeTemporalClientTag<TContract extends EffectContractDefinition>(
  identifier: string,
): Context.Tag<EffectTypedClient<TContract>, EffectTypedClient<TContract>> {
  return Context.GenericTag<EffectTypedClient<TContract>>(identifier);
}

/**
 * Build a Layer that provides an EffectTypedClient for the given contract
 *
 * The Layer establishes the Temporal connection and wraps the resulting client.
 * Use this when building a full Effect application with Layer-based dependency
 * injection.
 *
 * @example
 * ```ts
 * import { Effect, Layer, pipe } from "effect";
 * import { makeTemporalClientTag, makeTemporalClientLayer } from "@temporal-contract/client-effect";
 * import { orderContract } from "./contract";
 *
 * const OrderClient = makeTemporalClientTag<typeof orderContract>("OrderClient");
 *
 * const OrderClientLive = makeTemporalClientLayer(OrderClient, orderContract, {
 *   address: "localhost:7233",
 * });
 *
 * // Use in your program:
 * const program = Effect.gen(function* () {
 *   const client = yield* OrderClient;
 *   const result = yield* client.executeWorkflow("processOrder", {
 *     workflowId: "order-123",
 *     args: { orderId: "ORD-123" },
 *   });
 *   return result;
 * });
 *
 * await Effect.runPromise(pipe(program, Effect.provide(OrderClientLive)));
 * ```
 */
export function makeTemporalClientLayer<TContract extends EffectContractDefinition>(
  tag: Context.Tag<EffectTypedClient<TContract>, EffectTypedClient<TContract>>,
  contract: TContract,
  connectOptions?: ConnectionOptions,
): Layer.Layer<EffectTypedClient<TContract>, RuntimeClientError> {
  return Layer.effect(
    tag,
    Effect.gen(function* () {
      const connection = yield* Effect.tryPromise({
        try: () => Connection.connect(connectOptions ?? {}),
        catch: (e) => new RuntimeClientError({ operation: "connect", cause: e }),
      });
      return EffectTypedClient.create(contract, new Client({ connection }));
    }),
  );
}
