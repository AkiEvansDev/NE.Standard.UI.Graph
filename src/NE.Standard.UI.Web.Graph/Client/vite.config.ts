import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
    build: {
        emptyOutDir: true,
        outDir: "dist",
        lib: {
            entry: resolve(__dirname, "src/graph.ts"),
            formats: ["es"],
            fileName: () => "ui-graph.js",
            cssFileName: "ui-graph"
        }
    }
});
