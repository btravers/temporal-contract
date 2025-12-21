import type { ContractDefinition } from "@temporal-contract/contract";
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
