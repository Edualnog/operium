// Almox Fácil - Service Worker para Modo Offline
const CACHE_NAME = "almox-facil-v2"
const OFFLINE_URL = "/offline"

// Recursos para cache imediato (app shell)
const STATIC_ASSETS = [
  "/",
  "/login",
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
]

// Instalação - Cachear recursos estáticos
self.addEventListener("install", (event) => {
  console.log("🔧 Service Worker: Instalando...")
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("📦 Service Worker: Cacheando recursos estáticos")
      return cache.addAll(STATIC_ASSETS)
    })
  )
  // Ativar imediatamente sem esperar
  self.skipWaiting()
})

// Ativação - Limpar caches antigos
self.addEventListener("activate", (event) => {
  console.log("✅ Service Worker: Ativado")
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log("🗑️ Service Worker: Removendo cache antigo:", name)
            return caches.delete(name)
          })
      )
    })
  )
  // Tomar controle de todas as páginas
  self.clients.claim()
})

// Fetch - Estratégia Network First com fallback para cache
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorar requisições que não são HTTP/HTTPS
  if (!url.protocol.startsWith("http")) return

  // Ignorar requisições para APIs externas (Supabase, Stripe, etc)
  if (
    url.hostname.includes("supabase") ||
    url.hostname.includes("stripe") ||
    url.hostname.includes("vercel") ||
    url.hostname.includes("googleapis")
  ) {
    return
  }

  // Para requisições de navegação (páginas HTML)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cachear a resposta para uso offline
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // Se offline, tentar servir do cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse
            }
            // Se não tiver cache, mostrar página offline
            return caches.match("/offline")
          })
        })
    )
    return
  }

  // Para outros recursos (JS, CSS, imagens)
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image" ||
    request.destination === "font"
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Retornar do cache, mas atualizar em background
          fetch(request)
            .then((response) => {
              if (response.ok) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, response)
                })
              }
            })
            .catch(() => {})
          return cachedResponse
        }

        // Se não estiver no cache, buscar da rede
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const responseClone = response.clone()
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone)
              })
            }
            return response
          })
          .catch(() => {
            // Retornar resposta vazia para recursos não encontrados
            return new Response("", { status: 404 })
          })
      })
    )
    return
  }

  // Para requisições de API (dados), usar Network Only
  // Os dados serão tratados pelo React Query/SWR no frontend
  event.respondWith(
    fetch(request).catch(() => {
      return new Response(
        JSON.stringify({ error: "offline", message: "Você está offline" }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      )
    })
  )
})

// Mensagem do cliente
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting()
  }
})

console.log("📱 Almox Fácil Service Worker carregado")

