import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    globalSetup: ["../../packages/testing/dist/global-setup.mjs"],
    setupFiles: [],
    testTimeout: 60000,
  },
});
