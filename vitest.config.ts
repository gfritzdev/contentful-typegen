// vitest.config.ts
import { defineConfig } from "vitest/config";
import "@vitest/coverage-v8";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
    setupFiles: ["__tests__/setup.ts"],
    update: process.env.UPDATE_SNAP === "1",
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      all: true,
      include: ["src/**/*.ts"],
      exclude: [
        "src/cli.ts",
        "src/types.ts",
        "src/index.ts",
        "src/**/*.d.ts",
        "**/__tests__/**",
        "**/node_modules/**",
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
        perFile: true,
      },
    },
  },
});
