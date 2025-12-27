// Operium - Service Worker para Modo Offline (TWA-ready)
// Version 3.0 - Enhanced Field App Support
const CACHE_NAME = "operium-v3"
const FIELD_APP_CACHE = "operium-field-v1"
const OFFLINE_URL = "/offline"

// Recursos para cache imediato (app shell)
const STATIC_ASSETS = [
  "/",
  "/app",
  "/login",
  "/offline",
  "/manifest.webmanifest",
  "/app/manifest.webmanifest",
  "/icons/icon-72.png",
  "/icons/icon-96.png",
  "/icons/icon-128.png",
  "/icons/icon-144.png",
  "/icons/icon-152.png",
  "/icons/icon-192.png",
  "/icons/icon-384.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
]

// Rotas específicas do app de campo para cache prioritário
const FIELD_APP_ROUTES = [
  "/app",
]

// Instalação - Cachear recursos estáticos
self.addEventListener("install", (event) => {
  console.log("🔧 Service Worker v3: Instalando...")
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => {
        console.log("📦 Service Worker: Cacheando recursos estáticos")
        return cache.addAll(STATIC_ASSETS.filter(url => !url.startsWith("/app")))
      }),
      caches.open(FIELD_APP_CACHE).then((cache) => {
        console.log("📱 Service Worker: Cacheando app de campo")
        return cache.addAll(FIELD_APP_ROUTES)
      })
    ])
  )
  // Ativar imediatamente sem esperar
  self.skipWaiting()
})

// Ativação - Limpar caches antigos
self.addEventListener("activate", (event) => {
  console.log("✅ Service Worker v3: Ativado")
  const validCaches = [CACHE_NAME, FIELD_APP_CACHE]
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !validCaches.includes(name))
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

  // Estratégia especial para rotas /app - Cache First para melhor UX offline
  if (url.pathname.startsWith("/app")) {
    event.respondWith(
      caches.open(FIELD_APP_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone())
            }
            return networkResponse
          }).catch(() => cachedResponse)

          return cachedResponse || fetchPromise
        })
      })
    )
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
            .catch(() => { })
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

// Background Sync para envio de dados offline
self.addEventListener("sync", (event) => {
  console.log("🔄 Background Sync:", event.tag)

  if (event.tag === "sync-field-reports") {
    event.waitUntil(syncFieldReports())
  }

  if (event.tag === "sync-expenses") {
    event.waitUntil(syncExpenses())
  }
})

// Função para sincronizar relatórios pendentes
async function syncFieldReports() {
  try {
    const db = await openIndexedDB()
    const pendingReports = await getAllFromStore(db, "pending-reports")

    for (const report of pendingReports) {
      try {
        const response = await fetch("/api/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(report.data)
        })

        if (response.ok) {
          await deleteFromStore(db, "pending-reports", report.id)
          console.log("✅ Relatório sincronizado:", report.id)
        }
      } catch (err) {
        console.log("⚠️ Falha ao sincronizar relatório:", report.id)
      }
    }
  } catch (err) {
    console.log("⚠️ Background Sync falhou:", err)
  }
}

// Função para sincronizar despesas pendentes
async function syncExpenses() {
  try {
    const db = await openIndexedDB()
    const pendingExpenses = await getAllFromStore(db, "pending-expenses")

    for (const expense of pendingExpenses) {
      try {
        const response = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(expense.data)
        })

        if (response.ok) {
          await deleteFromStore(db, "pending-expenses", expense.id)
          console.log("✅ Despesa sincronizada:", expense.id)
        }
      } catch (err) {
        console.log("⚠️ Falha ao sincronizar despesa:", expense.id)
      }
    }
  } catch (err) {
    console.log("⚠️ Background Sync falhou:", err)
  }
}

// IndexedDB helpers
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("operium-offline", 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains("pending-reports")) {
        db.createObjectStore("pending-reports", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("pending-expenses")) {
        db.createObjectStore("pending-expenses", { keyPath: "id" })
      }
    }
  })
}

function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly")
    const store = transaction.objectStore(storeName)
    const request = store.getAll()
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

function deleteFromStore(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite")
    const store = transaction.objectStore(storeName)
    const request = store.delete(id)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

// Mensagem do cliente
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting()
  }

  // Registrar para Background Sync
  if (event.data?.type === "QUEUE_SYNC") {
    self.registration.sync.register(event.data.tag).catch((err) => {
      console.log("⚠️ Background Sync não suportado:", err)
    })
  }
})

console.log("📱 Operium Service Worker v3 carregado - Field App Ready")


