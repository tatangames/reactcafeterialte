// Service worker del POS: guarda la aplicación (no los datos) para poder abrirla sin conexión.
// Los datos sin conexión viven en IndexedDB (ver src/utils/offlineDb.ts).
// v2: borra las cachés v1, que en producción guardaron respuestas de /api por error
const CACHE = "pos-app-v2";

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

    // Solo la propia aplicación. La API nunca se guarda: en desarrollo está en otro origen y en
    // producción en el mismo dominio bajo /api (y /up), así que se excluye por ruta también.
    if (req.method !== "GET" || url.origin !== self.location.origin) return;
    if (url.pathname.startsWith("/api/") || url.pathname === "/api" || url.pathname === "/up") return;

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
