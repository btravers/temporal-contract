import { GenericContainer, Wait, Network } from "testcontainers";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    __TESTCONTAINERS_TEMPORAL_IP__: string;
    __TESTCONTAINERS_TEMPORAL_PORT_7233__: number;
  }
}

/**
 * Setup function for Vitest globalSetup
 * Starts a Temporal server container before all tests
 */
export default async function setup({ provide }: TestProject) {
  console.log("🐳 Starting Temporal test environment...");

  // Create a network for containers to communicate
  const network = await new Network().start();

  // Start PostgreSQL container first
  console.log("🐳 Starting PostgreSQL container...");
  const postgresContainer = await new GenericContainer("postgres:18.1")
    .withNetwork(network)
    .withNetworkAliases("postgres")
    .withExposedPorts(5432)
    .withEnvironment({
      POSTGRES_DB: "temporal",
      POSTGRES_USER: "temporal",
      POSTGRES_PASSWORD: "temporal",
    })
    .withHealthCheck({
      test: ["CMD-SHELL", "pg_isready -U temporal"],
      interval: 1_000,
      retries: 30,
      startPeriod: 1_000,
      timeout: 1_000,
    })
    .withWaitStrategy(Wait.forHealthCheck())
    .start();

  console.log("✅ PostgreSQL container started");

  // Start Temporal container
  console.log("🐳 Starting Temporal container...");
  const temporalContainer = await new GenericContainer("temporalio/auto-setup:1.29.1")
    .withNetwork(network)
    .withExposedPorts(7233)
    .withEnvironment({
      DB: "postgres12",
      DB_PORT: "5432",
      POSTGRES_SEEDS: "postgres",
      POSTGRES_USER: "temporal",
      POSTGRES_PWD: "temporal",
      BIND_ON_IP: "0.0.0.0",
      TEMPORAL_BROADCAST_ADDRESS: "127.0.0.1",
    })
    .withHealthCheck({
      test: ["CMD-SHELL", "tctl --address 127.0.0.1:7233 workflow list"],
      interval: 1_000,
      retries: 30,
      startPeriod: 1_000,
      timeout: 1_000,
    })
    .withWaitStrategy(Wait.forHealthCheck())
    .start();

  console.log("✅ Temporal container started");

  const __TESTCONTAINERS_TEMPORAL_IP__ = temporalContainer.getHost();
  const __TESTCONTAINERS_TEMPORAL_PORT_7233__ = temporalContainer.getMappedPort(7233);

  provide("__TESTCONTAINERS_TEMPORAL_IP__", __TESTCONTAINERS_TEMPORAL_IP__);
  provide("__TESTCONTAINERS_TEMPORAL_PORT_7233__", __TESTCONTAINERS_TEMPORAL_PORT_7233__);

  console.log(
    `🚀 Temporal test environment is ready at ${__TESTCONTAINERS_TEMPORAL_IP__}:${__TESTCONTAINERS_TEMPORAL_PORT_7233__}`,
  );

  // Return teardown function
  return async () => {
    console.log("🧹 Cleaning up Temporal test environment...");

    try {
      await temporalContainer.stop();
      console.log("✅ Temporal container stopped");
    } catch (error) {
      console.error("⚠️  Error stopping container:", error);
    }

    try {
      await postgresContainer.stop();
      console.log("✅ PostgreSQL container stopped");
    } catch (error) {
      console.error("⚠️  Error stopping PostgreSQL container:", error);
    }

    try {
      await network.stop();
      console.log("✅ Network stopped");
    } catch (error) {
      console.error("⚠️  Error stopping network:", error);
    }
  };
}
