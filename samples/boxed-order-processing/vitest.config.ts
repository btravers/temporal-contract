import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: "@temporal-contract/testing/global-setup",
    testTimeout: 10_000,
  },
});
