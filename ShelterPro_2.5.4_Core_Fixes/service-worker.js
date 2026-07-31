const CACHE='shelter-pro-2.5.4';
const CORE=['./','./index.html','./manifest.webmanifest','./js/csv-import.js','./js/app-foundation.js','./js/route-manager.js','./js/shelter-data-core.js','./js/navigation-pro.js','./js/route-share.js','./js/updater.js','./css/app.css'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data&&event.data.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.pathname.endsWith('/version.json')||url.pathname.endsWith('version.json')){
   event.respondWith(fetch(event.request,{cache:'no-store'}));return;
 }
 event.respondWith(fetch(event.request).then(response=>{
   if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
   return response;
 }).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html'))));
});
