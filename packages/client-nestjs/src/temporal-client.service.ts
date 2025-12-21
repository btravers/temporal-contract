import { Injectable, Inject, OnModuleDestroy, Logger } from "@nestjs/common";
import { TypedClient } from "@temporal-contract/client";
import type { ContractDefinition } from "@temporal-contract/contract";
import { MODULE_OPTIONS_TOKEN } from "./temporal-client.module-definition.js";
import type { TemporalClientModuleOptions } from "./interfaces.js";

/**
 * Service managing the Temporal typed client lifecycle
 */
@Injectable()
export class TemporalClientService<
  TContract extends ContractDefinition = ContractDefinition,
> implements OnModuleDestroy {
  private readonly logger = new Logger(TemporalClientService.name);
  private readonly typedClient: TypedClient<TContract>;

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN)
    private readonly options: TemporalClientModuleOptions<TContract>,
  ) {
    this.logger.log("Initializing Temporal typed client...");
    this.typedClient = TypedClient.create(this.options.contract, this.options.client);
    this.logger.log("Temporal typed client initialized");
  }

  /**
   * Clean up resources on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log("Temporal client service shutting down...");
    // The connection is managed externally, so we just log
    this.logger.log("Temporal client service shut down");
  }

  /**
   * Get the typed client instance
   */
  getClient(): TypedClient<TContract> {
    return this.typedClient;
  }
}
