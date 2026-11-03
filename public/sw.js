// Service worker del POS: guarda la aplicación (no los datos) para poder abrirla sin conexión.
// Los datos sin conexión viven en IndexedDB (ver src/utils/offlineDb.ts).
const CACHE = "pos-app-v1";

self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(["/", "/index.html"])));
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const req = event.request;
    const url = new URL(req.url);

    // Solo la propia aplicación: la API (otro puerto u origen) nunca se guarda
    if (req.method !== "GET" || url.origin !== self.location.origin) return;

    // Navegación (rutas de React): primero la red; sin conexión, la app guardada
    if (req.mode === "navigate") {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    const copia = res.clone();
                    caches.open(CACHE).then((cache) => cache.put("/index.html", copia));
                    return res;
                })
                .catch(() => caches.match("/index.html"))
        );
        return;
    }

    // Archivos de la app (JS/CSS con hash, imágenes): se sirven de la caché y se actualizan detrás
    event.respondWith(
        caches.match(req).then((guardado) => {
            const deRed = fetch(req)
                .then((res) => {
                    if (res.ok) {
                        const copia = res.clone();
                        caches.open(CACHE).then((cache) => cache.put(req, copia));
                    }
                    return res;
                })
                .catch(() => guardado);
            return guardado || deRed;
        })
    );
});
