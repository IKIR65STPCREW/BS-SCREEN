/* LED Scheme Builder — service worker.
 *
 * Стратегии:
 * - precache: при install кладём в кэш базовые корневые ресурсы
 *   (index.html, manifest, иконки) И все build-артефакты Vite (JS/CSS с хэшем).
 *   Список артефактов и BUILD_ID берутся из sw-assets.js, который генерирует
 *   плагин swPrecache в vite.config.ts. Без этого при ПЕРВОМ визите JS/CSS не
 *   попадали в кэш (SW регистрируется уже после загрузки страницы) и офлайн
 *   приложение открывалось белым экраном.
 * - navigate: network-first c фолбэком на кэш и затем на index.html.
 *   Это нужно, чтобы при обновлении сайта пользователь получил свежую версию,
 *   но в офлайне приложение всё равно открывалось.
 * - same-origin GET: stale-while-revalidate. Возвращаем из кэша, в фоне обновляем.
 *
 * Внимание: путь к SW регистрируется относительно BASE_URL, и scope тоже
 * проставляется при регистрации, поэтому в публикации на GitHub Pages всё работает.
 */

const VERSION = "patch-v6";
// Список build-артефактов генерируется при сборке (см. swPrecache в vite.config.ts).
try {
  importScripts("sw-assets.js");
} catch (e) {
  // Нет файла (например, dev) — работаем без предкэша артефактов.
}
const BUILD_ID = self.__BUILD_ID__ || "dev";
const BUILD_ASSETS = Array.isArray(self.__BUILD_ASSETS__) ? self.__BUILD_ASSETS__ : [];
const CACHE_STATIC = `led-builder-static-${VERSION}-${BUILD_ID}`;
const CACHE_RUNTIME = `led-builder-runtime-${VERSION}-${BUILD_ID}`;

// scope SW содержит base path. Используем его для корня.
const ROOT = self.registration.scope; // например "https://user.github.io/led-screen-builder/"

const PRECACHE_URLS = [
  ROOT,                              // index.html через scope
  `${ROOT}index.html`,
  `${ROOT}manifest.webmanifest`,
  `${ROOT}icons/icon-192.png`,
  `${ROOT}icons/icon-512.png`,
  `${ROOT}icons/icon-512-maskable.png`,
  ...BUILD_ASSETS.map((f) => `${ROOT}${f}`)
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) =>
      Promise.allSettled(
        PRECACHE_URLS.map((u) => cache.add(u).catch(() => null))
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_STATIC && k !== CACHE_RUNTIME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Запросы вне нашего origin не кэшируем.
  if (url.origin !== self.location.origin) return;

  // Навигационные запросы (HTML) — network-first.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Кэшируем только успешные ответы (не 404/500).
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_RUNTIME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((r) => r || caches.match(`${ROOT}index.html`))
        )
    );
    return;
  }

  // Прочие same-origin GET — stale-while-revalidate.
  // ignoreVary: предкэш при install делается запросом без заголовка Origin, а
  // <script type="module" crossorigin> шлёт Origin; при «Vary: Origin» на
  // сервере кэш иначе не совпадает. Файлы с хэшем в имени — это безопасно.
  event.respondWith(
    caches.match(req, { ignoreVary: true }).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          // Кэшируем только успешные ответы.
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE_RUNTIME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
