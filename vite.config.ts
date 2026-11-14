import { defineConfig } from "vite-plus";
import { voidPlugin } from "void";
import { voidVue } from "@void/vue/plugin";

export default defineConfig({
  plugins: [voidPlugin(), voidVue({ prefetch: { hoverDelay: 75, cacheFor: "60s" } })],
  test: { include: ["tests/**/*.test.ts"] },
});
