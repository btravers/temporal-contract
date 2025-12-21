import type { ContractDefinition } from "@temporal-contract/contract";
import type { TypedClient } from "@temporal-contract/client";
import type { Client } from "@temporalio/client";

/**
 * Options for configuring the Temporal client module
 */
export interface TemporalClientModuleOptions<
  TContract extends ContractDefinition = ContractDefinition,
> {
  /**
   * The contract definition for this client
   */
  contract: TContract;

  /**
   * Temporal client instance or configuration to create one
   */
  client: Client;
}

/**
 * Injectable typed client wrapper
 * Provides access to the TypedClient instance
 */
export interface InjectableTypedClient<TContract extends ContractDefinition = ContractDefinition> {
  /**
   * Get the typed client instance
   */
  getClient(): TypedClient<TContract>;
}
