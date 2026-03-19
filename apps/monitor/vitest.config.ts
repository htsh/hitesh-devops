import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    root: ".",
  },
  resolve: {
    alias: {
      "@server": path.resolve(import.meta.dirname, "src/server"),
    },
  },
});
