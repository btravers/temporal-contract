import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: "./vitest.global-setup.ts",
    testTimeout: 60_000, // 60 seconds for integration tests
    hookTimeout: 120_000, // 2 minutes for container startup
  },
});
