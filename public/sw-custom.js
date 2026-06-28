// Service Worker personnalisé pour les notifications push
self.addEventListener('push', event => {
  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: data.parapheurId,
    requireInteraction: data.urgent || false,
    actions: [
      { action: 'open', title: 'Ouvrir le dossier' },
      { action: 'dismiss', title: 'Ignorer' }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()

  if (event.action === 'open' || !event.action) {
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (let client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(`/?id=${event.notification.tag}`)
      }
    })
  }
})

// Écouter les messages du client pour les notifications locales
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data
    self.registration.showNotification(title, options)
  }
})

// Synchronisation en arrière-plan pour envoyer les notifications en attente
self.addEventListener('sync', event => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(
      fetch('/api/notifications/pending')
        .then(r => r.json())
        .then(notifications => {
          notifications.forEach(notif => {
            self.registration.showNotification(
              notif.reference,
              {
                body: notif.message,
                icon: '/favicon.svg',
                tag: notif.parapheurId,
              }
            )
          })
        })
        .catch(err => console.error('Notification sync error:', err))
    )
  }
})
