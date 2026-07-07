const CACHE_NAME = 'pokefav-cache-v1';
const ASSETS_TO_CACHE = [
  new URL('../', self.location).toString(),
  new URL('../index.html', self.location).toString(),
  new URL('../favoritos.html', self.location).toString(),
  new URL('../style/style.css', self.location).toString(),
  new URL('../js/app.js', self.location).toString(),
  new URL('../js/appstorage.js', self.location).toString(),
  new URL('../js/service-worker.js', self.location).toString(),
  new URL('../manifest.json', self.location).toString(),
  new URL('../pokeapi_256.png', self.location).toString()
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)));
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => cachedResponse || fetch(event.request))
  );
});

self.addEventListener('push', event => {
  const payload = event.data?.json() || {
    title: 'PokeFav',
    body: 'Tienes un mensaje nuevo.'
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'PokeFav', {
      body: payload.body || 'Tienes un mensaje nuevo.',
      icon: new URL('../pokeapi_256.png', self.location).toString(),
      badge: new URL('../pokeapi_256.png', self.location).toString()
    })
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'TEST_PUSH') {
    event.waitUntil(
      self.registration.showNotification(event.data.title || 'PokeFav', {
        body: event.data.body || 'Mensaje de prueba recibido.',
        icon: new URL('../pokeapi_256.png', self.location).toString(),
        badge: new URL('../pokeapi_256.png', self.location).toString()
      })
    );
  }
});
