const CACHE_NAME = "english-quiz-v15";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/app.js",
  "./js/quizEngine.js",
  "./js/reviewEngine.js",
  "./js/storage.js",
  "./js/speech.js",
  "./js/sound.js",
  "./js/animation.js",
  "./data/grammar.json",
  "./data/vocabulary.json",
  "./data/grammar2.json",
  "./data/vocabulary2.json",
  "./data/grammar3.json",
  "./data/vocabulary3.json",
  "./assets/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

// 通信できるときは常に最新を取得し、オフライン時だけキャッシュを使う
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  // 音声は Range リクエストを使うので Service Worker を通さずブラウザーに任せる
  if (url.pathname.includes("/audio/") || event.request.headers.has("range")) return;
  event.respondWith(
    fetch(event.request, { cache: "no-cache" }).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match(event.request)),
  );
});