import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

/**
 * Unit tests for the pure and server-side logic (Stage 15). `server-only`
 * throws when imported outside a React Server Components build, which is
 * exactly its job in the app — here it's replaced with an empty stub so
 * the modules that import it can be tested directly in Node.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": root,
      "server-only": `${root}tests/stubs/server-only.ts`,
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
