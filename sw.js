const CACHE='cineflix-app-v1';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(['./offline.html','./icone-192.png','./icone-512.png','./icone-180.png'])));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('cineflix-app-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match('./offline.html')));return;}
if(/\/icone-(192|512|180)\.png$/.test(url.pathname))event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
});