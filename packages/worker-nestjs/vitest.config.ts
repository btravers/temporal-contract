import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/*.unit.spec.ts"],
    environment: "node",
  },
});
