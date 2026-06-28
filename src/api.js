// En dev → backend local ; en production Vercel → même domaine /api
const BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api')

function getToken() {
  return localStorage.getItem('par_token')
}

async function request(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (res.status === 401) {
    localStorage.removeItem('par_token')
    window.location.reload()
    return
  }

  let data
  try {
    data = await res.json()
  } catch (e) {
    throw new Error(`Réponse invalide du serveur: ${res.status} ${res.statusText}`)
  }
  if (!res.ok) throw new Error(data.error || 'Erreur serveur')
  return data
}

export const api = {
  // Auth
  login: (username, password) => request('/auth/login', { method: 'POST', body: { username, password } }),
  me: () => request('/auth/me'),

  // Parapheurs
  getParapheurs: () => request('/parapheurs'),
  createParapheur: (data) => request('/parapheurs', { method: 'POST', body: data }),
  getParapheur: (id) => request(`/parapheurs/${id}`),
  updateStep: (id, stepOrdre, statut, commentaire) => request(`/parapheurs/${id}/step`, { method: 'PUT', body: { stepOrdre, statut, commentaire } }),
  archiveParapheur: (id) => request(`/parapheurs/${id}/archive`, { method: 'PUT' }),
  deleteParapheur: (id) => request(`/parapheurs/${id}`, { method: 'DELETE' }),

  // Utilisateurs (admin)
  getUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: data }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: data }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  // Configuration (admin)
  getConfig: () => request('/config'),
  updateConfig: (data) => request('/config', { method: 'PUT', body: data }),
  testLdap: (data) => request('/config/test-ldap', { method: 'POST', body: data }),

  // Notifications
  getPendingNotifications: () => request('/notifications/pending'),
  testNotifications: () => request('/notifications/test', { method: 'POST', body: {} }),
  subscribeNotifications: (subscription) => request('/notifications/subscribe', { method: 'POST', body: { subscription } }),
}
