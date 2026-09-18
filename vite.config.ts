// Standalone Vite configuration for Smart Investment Planner.
//
// Every plugin is declared explicitly here — no editor/platform wrapper package
// is involved, so `npm install && npm run build && npm start` works on any host
// (Railway, Render, Fly, a VM, plain Docker).
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv, type PluginOption } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Production target. `node-server` is the portable default so that a plain
// `npm run build && npm start` produces a standard Node HTTP server. Override
// with NITRO_PRESET for any other host (e.g. NITRO_PRESET=vercel).
const serverPreset = process.env["NITRO_PRESET"] || process.env["SERVER_PRESET"] || "node-server";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig(({ mode, command }) => {
  // Inline VITE_* values so the browser bundle carries the client-safe backend
  // settings. These must exist at BUILD time (see Dockerfile build args).
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const define: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    define[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  const plugins: PluginOption[] = [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // Keep the SSR entry pointing at src/server.ts (the error-handling wrapper).
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    react(),
  ];

  if (command === "build") {
    plugins.push(
      nitro({
        preset: serverPreset,
        // Stable output layout: dist/server/index.mjs + dist/client, matching
        // `npm start`, the Dockerfile and the deployment docs.
        output: { dir: "dist", serverDir: "dist/server", publicDir: "dist/client" },
      }),
    );
  }

  return {
    define,
    css: { transformer: "lightningcss" },
    server: { host: true, port: 8080 },
    preview: { port: 8080 },
    resolve: {
      alias: { "@": srcDir },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
    },
    plugins,
  };
});
