import { defineConfig } from "vite";

export default defineConfig({
  root: "./src",
  base: process.env.BUILD_BASE ?? "/",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: "./src/index.html",
        node: "./src/node.html",
      },
    },
  },
  server: {
    fs: {
      // WASMファイルへのアクセスを許可
      allow: [".."],
    },
  },
  assetsInclude: ["**/*.wasm"], // WASMファイルをアセットとして含める
});
