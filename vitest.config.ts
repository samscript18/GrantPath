import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias: { "@": path.resolve("src") } },
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" },
      },
      {
        resolve: { alias: { "@": path.resolve("src") } },
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          setupFiles: ["tests/integration/setup.ts"],
          fileParallelism: false,
          testTimeout: 20000,
          environment: "node",
        },
      },
    ],
  },
});
