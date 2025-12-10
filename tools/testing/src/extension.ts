import { Connection } from "@temporalio/client";
import { NativeConnection } from "@temporalio/worker/lib/connection.js";
import { inject, it as vitestIt } from "vitest";

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
    // fixme
    // await connection.close();
  },
});

/**
 * Get a connection to the Temporal server (for client)
 * Must be called after setupTemporalTestContainer has been executed
 */
function getTemporalConnection(): Promise<Connection> {
  return Connection.connect({
    address: getTemporalAddress(),
  });
}

/**
 * Get a native connection to the Temporal server (for worker)
 * Must be called after setupTemporalTestContainer has been executed
 */
function getTemporalWorkerConnection(): Promise<NativeConnection> {
  return NativeConnection.connect({
    address: getTemporalAddress(),
  });
}

function getTemporalAddress(): string {
  return `${inject("__TESTCONTAINERS_TEMPORAL_IP__")}:${inject("__TESTCONTAINERS_TEMPORAL_PORT_7233__")}`;
}
