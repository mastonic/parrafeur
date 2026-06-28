import React, { useState, useEffect } from 'react'
import { Bell, Send, CheckCircle, AlertTriangle } from 'lucide-react'
import { api } from '../../api.js'

export default function NotificationsAdmin() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [tested, setTested] = useState(false)

  useEffect(() => {
    loadPendingNotifications()
  }, [])

  async function loadPendingNotifications() {
    try {
      const notifs = await api.getPendingNotifications()
      setNotifications(notifs)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    }
  }

  async function testNotifications() {
    setLoading(true)
    try {
      const result = await api.testNotifications()
      setMessage(`✅ ${result.tested} notification(s) testée(s)`)
      setTested(true)
      loadPendingNotifications()
      setTimeout(() => setMessage(''), 5000)
    } catch (err) {
      setMessage(`❌ Erreur: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fade-in">
      <div className="header-banner" style={{ marginBottom: 16 }}>
        <h2>Gestion des Notifications</h2>
        <p>Rappels automatiques aux points de trigger</p>
      </div>

      {/* Statut des notifications */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title" style={{ marginBottom: 12 }}>Configuration Cron</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: 'var(--cs-gris)', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--cs-muted)', marginBottom: 4 }}>Fréquence</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Chaque jour à 08:00 UTC</div>
          </div>
          <div style={{ background: 'var(--cs-gris)', padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--cs-muted)', marginBottom: 4 }}>Endpoint</div>
            <div style={{ fontSize: 12, fontFamily: 'monospace' }}>/api/cron-notifications</div>
          </div>
        </div>
      </div>

      {/* Triggers configurés */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title" style={{ marginBottom: 12 }}>Points de Trigger</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cs-bleu)', marginBottom: 8 }}>Avant Deadline</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[-7, -5, -2, 0].map(day => (
                <div key={day} style={{ fontSize: 12, color: 'var(--cs-muted)' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>J{day}</span>
                  {day === 0 ? ' — Le jour même' : day === -2 ? ' — 2 jours avant' : day === -5 ? ' — 5 jours avant' : ' — 1 semaine avant'}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cs-rouge)', marginBottom: 8 }}>Après Deadline (Retard)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[3, 6, 10].map(day => (
                <div key={day} style={{ fontSize: 12, color: 'var(--cs-muted)' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>J+{day}</span>
                  {day === 3 ? ' — 3 jours en retard' : day === 6 ? ' — 1 semaine de retard' : ' — 10 jours de retard'}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications en attente */}
      {notifications.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>
            Notifications en Attente ({notifications.length})
          </div>
          {notifications.map((notif, i) => (
            <div key={i} style={{
              padding: 12,
              borderBottom: i < notifications.length - 1 ? '1px solid var(--cs-gris)' : 'none',
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start'
            }}>
              <div style={{ color: notif.type === 'overdue_reminder' ? 'var(--cs-rouge)' : 'var(--cs-or)' }}>
                {notif.type === 'overdue_reminder' ? '🔴' : '🔔'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{notif.reference}</div>
                <div style={{ fontSize: 12, color: 'var(--cs-muted)' }}>{notif.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bouton de test */}
      <div className="card">
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--cs-muted)', marginBottom: 8 }}>
            Cliquez sur le bouton ci-dessous pour déclencher manuellement l'envoi des notifications en attente.
          </div>
        </div>

        {message && (
          <div style={{
            padding: 12,
            background: message.includes('✅') ? 'rgba(16,156,73,0.1)' : 'rgba(205,92,92,0.1)',
            borderRadius: 6,
            marginBottom: 12,
            fontSize: 12,
            color: message.includes('✅') ? 'var(--cs-vert)' : 'var(--cs-rouge)',
          }}>
            {message}
          </div>
        )}

        <button
          onClick={testNotifications}
          disabled={loading}
          style={{
            padding: '10px 16px',
            background: 'var(--cs-bleu)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <Send size={16} />
          {loading ? 'Envoi en cours...' : 'Envoyer les notifications'}
        </button>
      </div>
    </div>
  )
}
