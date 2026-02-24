import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@temporal-contract/contract-effect": fileURLToPath(
        new URL("../contract-effect/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    name: "unit",
    reporters: ["default"],
    include: ["src/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html"],
      include: ["src/**"],
    },
  },
});
