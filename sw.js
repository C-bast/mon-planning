/* Mon Planning — "service worker" : garde la page dans le téléphone pour qu'elle s'ouvre même sans Internet.
   Les tâches, elles, sont gardées par la page elle-même (localStorage). */
const CACHE = "mon-planning-v2";
const FICHIERS = ["./", "./index.html", "./manifest.json", "./icone-192.png", "./icone-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((cles) => Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
function depuisCache(requete) {
  return caches.match(requete, { ignoreSearch: true }).then((r) => r || (requete.mode === "navigate" ? caches.match("./index.html") : null));
}
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;   // GitHub API : pas touché
  // D'abord Internet (pour avoir la dernière version de la page), sinon la copie gardée
  e.respondWith(
    // "no-cache" : on demande toujours à GitHub si la page a changé (mises à jour plus rapides)
    fetch(e.request.url, { cache: "no-cache", credentials: "same-origin" }).then((rep) => {
      if (rep.ok) { const copie = rep.clone(); caches.open(CACHE).then((c) => c.put(e.request, copie)); return rep; }
      return depuisCache(e.request).then((r) => r || rep);     // erreur du serveur : on prend la copie si on l'a
    }).catch(() => depuisCache(e.request).then((r) => r || Response.error()))
  );
});
