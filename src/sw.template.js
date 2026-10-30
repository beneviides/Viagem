// Service worker do Viagem. A versão e a lista de arquivos são preenchidas no build (vite.config.ts).
const VERSION = "__VERSION__";
const CACHE = "viagem-" + VERSION;
const PRECACHE = __PRECACHE__;
// Os arquivos são estáticos: ignorar o cabeçalho Vary evita que o cache "não reconheça" pedidos do navegador (ex.: Vary: Origin).
const MATCH = { ignoreVary: true };
const SHELL = new URL("./", self.registration.scope).href;
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (event) => {
  // Não assume o controle sozinho: a página avisa que há versão nova e o usuário decide quando atualizar.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("viagem-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function staleWhileRevalidate(request, cacheKey) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(cacheKey || request, MATCH);
  const update = fetch(request)
    .then((res) => {
      if (res && (res.ok || res.type === "opaque")) cache.put(cacheKey || request, res.clone());
      return res;
    })
    .catch(() => undefined);
  return cached || (await update) || Response.error();
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Página: mostra a versão guardada na hora (funciona sem internet) e atualiza em segundo plano.
  if (request.mode === "navigate") {
    event.respondWith(staleWhileRevalidate(new Request(SHELL), SHELL));
    return;
  }
  // Fontes do Google: guarda para o visual não mudar offline.
  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  // Arquivos do próprio app (nomes com hash, não mudam): primeiro o cache.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request, MATCH).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            if (res.ok) caches.open(CACHE).then((c) => c.put(request, res.clone()));
            return res;
          })
      )
    );
  }
});
