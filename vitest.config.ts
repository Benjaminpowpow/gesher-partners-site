import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  // tsconfig says "jsx": "preserve" for Vite; the page tests need it compiled.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    // shared/ holds the rules the page and the server both run (the gate, the
    // contact rules, the revenue check), so its tests run here too. The page
    // tests under client/src/pages run in jsdom (a comment at the top of each
    // file says so). The old tests in client/src/components/__tests__ are not
    // included: they test Manus-era components the site no longer uses.
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "shared/**/*.test.ts",
      "client/src/pages/**/*.test.tsx",
      "client/src/hooks/**/*.test.ts",
    ],
  },
});
