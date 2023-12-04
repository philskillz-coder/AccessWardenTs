import path from "path";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
    resolve: {
        alias: {
            "@api" : path.resolve(__dirname, "./src/backend/api"),
            "@models" : path.resolve(__dirname, "./src/backend/database/models"),
            "@components" : path.resolve(__dirname, "./src/frontend/components"),
            "@pages" : path.resolve(__dirname, "./src/frontend/pages"),
            "@typings" : path.resolve(__dirname, "./src/typings"),
            "@shared": path.resolve(__dirname, "./src/shared")
        },
    },
    plugins: [solidPlugin()],
    server: {
        base: "./src/",
        port: 3000
    },
    build: {
        target: "esnext",
        outDir: "dist",
        rollupOptions: {
            input: "./src/frontend/index.tsx"
        }
    },
});
