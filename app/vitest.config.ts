import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}", "**/__tests__/**/*.{ts,tsx}"],
    // tests/ 는 bun:test 전용(npm run test:bun) — vitest가 집어가면 import 에러.
    exclude: ["node_modules", ".next", "e2e/**", "tests/**"],
    css: false,
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts", "components/**/*.tsx"],
      exclude: ["lib/supabase/**", "**/*.test.{ts,tsx}"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
