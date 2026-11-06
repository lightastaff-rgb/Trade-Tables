/* Trade Stand offline cache. Pages are network-first so updates show up; files are cache-first. */
const CACHE = "trade-stand-e3f73195af";
const PRECACHE = ["./", "app.js?v=92767c873f", "css/style.css?v=9f103e5d6f", "manifest.webmanifest", "assets/favicon.png", "assets/fonts/pixelify-sans-400.woff2", "assets/fonts/pixelify-sans-500.woff2", "assets/fonts/pixelify-sans-600.woff2", "assets/fonts/pixelify-sans-700.woff2", "assets/fonts/vt323-400.woff2", "assets/items/aerolatas.png", "assets/items/bones.png", "assets/items/bottles.png", "assets/items/brains.png", "assets/items/crab.png", "assets/items/emeralds.png", "assets/items/eyes.png", "assets/items/golddia.png", "assets/items/mushrooms.png", "assets/items/newspaper.png", "assets/items/ores.png", "assets/items/paper.png", "assets/items/rubys.png", "assets/items/sanddollars.png", "assets/items/sandscall.png", "assets/items/starfish.png", "assets/items/tires.png", "assets/ui/btn0.png", "assets/ui/btn1.png", "assets/ui/btn2.png", "assets/ui/f_frame.png", "assets/ui/f_slot.png", "assets/ui/f_slotgold.png", "assets/ui/f_well.png", "assets/ui/f_welldark.png", "assets/ui/gralat.png", "assets/ui/grass.png", "assets/ui/keeper.png", "assets/ui/nail.png", "assets/ui/scene.png", "assets/ui/tro.png", "assets/ui/wood.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("trade-stand-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put("./", copy)); }
      return res;
    }).catch(() => caches.match("./")));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok && res.type === "basic") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
