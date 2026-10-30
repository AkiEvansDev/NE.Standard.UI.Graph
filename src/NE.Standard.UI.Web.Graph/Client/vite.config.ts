import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
    build: {
        emptyOutDir: true,
        outDir: "dist",
        modulePreload: false,
        cssCodeSplit: false,
        rolldownOptions: {
            input: resolve(import.meta.dirname, "src/graph.ts"),
            output: {
                entryFileNames: "ui-graph.js",
                assetFileNames: "ui-graph[extname]"
            }
        }
    }
});
