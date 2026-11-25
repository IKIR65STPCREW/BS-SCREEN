import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// Минимальный declare, чтобы не тянуть @types/node ради одной переменной.
// process в Node-окружении сборки доступен всегда, тут нужны только типы.
declare const process: { env: Record<string, string | undefined> };

// GitHub Pages base path.
// When deploying to https://<user>.github.io/<repo>/, set REPO_NAME=led-screen-builder
// (or whatever your repo is called) when running `npm run build`.
//
//   REPO_NAME=led-screen-builder npm run build
//
// Locally `npm run dev` uses "/" so nothing breaks.
const repoName = process.env.REPO_NAME ?? "";
const base = repoName ? `/${repoName}/` : "/";

/**
 * Генерирует dist/sw-assets.js со списком build-артефактов (JS/CSS/ассеты с
 * хэшем) и BUILD_ID. service-worker.js подключает его через importScripts и
 * предкэширует эти файлы при install — иначе при ПЕРВОМ визите они не попадают
 * в кэш (SW регистрируется после загрузки страницы) и офлайн открывается белый
 * экран. Без внешних зависимостей (vite-plugin-pwa / @types/node не нужны).
 */
function swPrecache(): Plugin {
  return {
    name: "sw-precache",
    apply: "build",
    generateBundle(_opts, bundle) {
      const files = Object.keys(bundle)
        .filter((f) => !f.endsWith(".map") && f !== "index.html")
        .sort();
      // Простой детерминированный хэш списка файлов (имена уже содержат хэши).
      let h = 0;
      for (const ch of files.join("|")) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0;
      const buildId = (h >>> 0).toString(36);
      this.emitFile({
        type: "asset",
        fileName: "sw-assets.js",
        source:
          `self.__BUILD_ID__ = ${JSON.stringify(buildId)};\n` +
          `self.__BUILD_ASSETS__ = ${JSON.stringify(files)};\n`
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), swPrecache()],
  base,
  build: {
    outDir: "dist",
    sourcemap: false,
    assetsInlineLimit: 0
  },
  server: {
    host: true
  }
});
