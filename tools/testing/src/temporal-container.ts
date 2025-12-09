import { GenericContainer, type StartedTestContainer, Wait, Network } from "testcontainers";
import { Connection } from "@temporalio/client";
import { NativeConnection } from "@temporalio/worker";
import { it as vitestIt } from "vitest";

let temporalContainer: StartedTestContainer | null = null;
let postgresContainer: StartedTestContainer | null = null;

export const it = vitestIt.extend<{
  clientConnection: Connection;
  workerConnection: NativeConnection;
}>({
  clientConnection: async ({}, use) => {
    const connection = await getTemporalConnection();
    await use(connection);
    await connection.close();
  },
  workerConnection: async ({}, use) => {
    const connection = await getTemporalWorkerConnection();
    await use(connection);
    await connection.close();
  },
});

/**
 * Setup function for Vitest globalSetup
 * Starts a Temporal server container before all tests
 */
export async function setupTemporalTestContainer() {
  console.log("🐳 Starting Temporal test environment...");

  // Create a network for containers to communicate
  const network = await new Network().start();

  // Start PostgreSQL container first
  console.log("🐳 Starting PostgreSQL container...");
  postgresContainer = await new GenericContainer("postgres:18.1")
    .withNetwork(network)
    .withNetworkAliases("postgres")
    .withEnvironment({
      POSTGRES_DB: "temporal",
      POSTGRES_USER: "temporal",
      POSTGRES_PASSWORD: "temporal",
    })
    .withHealthCheck({
      test: ["CMD-SHELL", "pg_isready -U temporal"],
    })
    .withWaitStrategy(Wait.forHealthCheck())
    .start();

  console.log("✅ PostgreSQL container started");

  // Start Temporal container
  console.log("🐳 Starting Temporal container...");
  temporalContainer = await new GenericContainer("temporalio/auto-setup:1.29.1")
    .withNetwork(network)
    .withEnvironment({
      DB: "postgres12",
      DB_PORT: "5432",
      POSTGRES_SEEDS: "postgres",
      POSTGRES_USER: "temporal",
      POSTGRES_PWD: "temporal",
      DYNAMIC_CONFIG_FILE_PATH: "config/dynamicconfig/development-sql.yaml",
      BIND_ON_IP: "0.0.0.0",
      EMPORAL_BROADCAST_ADDRESS: "127.0.0.1",
    })
    .withHealthCheck({
      test: ["CMD-SHELL", "tctl --address 127.0.0.1:7233 workflow list"],
    })
    .withWaitStrategy(Wait.forHealthCheck())
    .start();

  console.log("✅ Temporal container started");

  // Return teardown function
  return async () => {
    console.log("🧹 Cleaning up Temporal test environment...");

    if (temporalContainer) {
      try {
        await temporalContainer.stop();
        console.log("✅ Temporal container stopped");
      } catch (error) {
        console.error("⚠️  Error stopping container:", error);
      }
    }

    if (postgresContainer) {
      try {
        await postgresContainer.stop();
        console.log("✅ PostgreSQL container stopped");
      } catch (error) {
        console.error("⚠️  Error stopping PostgreSQL container:", error);
      }
    }

    if (network) {
      try {
        await network.stop();
        console.log("✅ Network stopped");
      } catch (error) {
        console.error("⚠️  Error stopping network:", error);
      }
    }
  };
}

/**
 * Get a connection to the Temporal server (for client)
 * Must be called after setupTemporalTestContainer has been executed
 */
export function getTemporalConnection(): Promise<Connection> {
  return Connection.connect({
    address: getTemporalAddress(),
  });
}

/**
 * Get a native connection to the Temporal server (for worker)
 * Must be called after setupTemporalTestContainer has been executed
 */
export function getTemporalWorkerConnection(): Promise<NativeConnection> {
  return NativeConnection.connect({
    address: getTemporalAddress(),
  });
}

function getTemporalAddress(): string {
  if (!temporalContainer) {
    throw new Error(
      "Temporal container not started. Make sure setupTemporalTestContainer is configured in globalSetup",
    );
  }
  return `${temporalContainer.getHost()}:${temporalContainer.getMappedPort(7233)}`;
}
