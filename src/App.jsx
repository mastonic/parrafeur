import React, { useState, useEffect, useCallback } from 'react'
import { LayoutDashboard, QrCode, Bell, LogOut, Shield, Settings2 } from 'lucide-react'
import Dashboard from './components/Dashboard.jsx'
import NewParapheur from './components/NewParapheur.jsx'
import ParapheurDetail from './components/ParapheurDetail.jsx'
import Scanner from './components/Scanner.jsx'
import AlertsView from './components/AlertsView.jsx'
import SettingsView from './components/Settings.jsx'
import LoginScreen from './components/LoginScreen.jsx'
import AdminPanel from './components/admin/AdminPanel.jsx'
import { useAuth } from './contexts/AuthContext.jsx'
import { api } from './api.js'
import { getAlerts } from './store.js'

const NAV = [
  { key: 'dashboard', label: 'Tableau de bord', Icon: LayoutDashboard },
  { key: 'scanner', label: 'Scanner QR', Icon: QrCode },
  { key: 'alertes', label: 'Alertes', Icon: Bell },
  { key: 'parametres', label: 'Paramètres', Icon: Settings2 },
]

export default function App() {
  const { user, loading, logout } = useAuth()
  const [tab, setTab] = useState('dashboard')
  const [parapheurs, setParapheurs] = useState([])
  const [selected, setSelected] = useState(null)
  const [creating, setCreating] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const list = await api.getParapheurs()
      setParapheurs(list)
    } catch { /* token expired → AuthContext reloads */ }
  }, [])

  useEffect(() => {
    if (!user) return
    refresh()

    const params = new URLSearchParams(window.location.search)
    const idFromUrl = params.get('id')
    if (idFromUrl) {
      api.getParapheur(idFromUrl)
        .then(p => { setSelected(p); window.history.replaceState({}, '', window.location.pathname) })
        .catch(() => setTab('scanner'))
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const interval = setInterval(async () => {
      const list = await api.getParapheurs().catch(() => [])
      const alerts = getAlerts(list)
      if (alerts.length > 0 && Notification.permission === 'granted') {
        const urgent = alerts.filter(a => a.type === 'danger')
        if (urgent.length > 0) {
          new Notification('CAP SUD — Parapheurs en retard', {
            body: `${urgent.length} dossier(s) en retard : ${urgent.map(a => a.par.reference).join(', ')}`,
            icon: '/logo192.png',
            tag: 'parapheur-urgent',
          })
        }
      }
    }, 60_000)

    return () => clearInterval(interval)
  }, [user, refresh])

  if (loading) {
    return <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--cs-bg)', fontSize: 14, color: 'var(--cs-muted)' }}>Chargement...</div>
  }

  if (!user) return <LoginScreen />

  if (showAdmin) {
    return <AdminPanel onBack={() => { setShowAdmin(false); refresh() }} />
  }

  const alerts = getAlerts(parapheurs)
  const alertCount = alerts.length

  const topbar = (
    <div className="topbar">
      <div className="topbar-logo">
        <CAPSUDLogo />
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1 }}>CAP SUD</div>
          <div style={{ fontSize: 10, opacity: .7, lineHeight: 1.2 }}>Parapheur Numérique</div>
        </div>
      </div>
      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', lineHeight: 1.2, textAlign: 'right' }}>
          <div style={{ fontWeight: 700 }}>{user.prenom} {user.nom}</div>
          <div style={{ opacity: 0.7, textTransform: 'uppercase', fontSize: 10 }}>{user.role}</div>
        </div>
        {user.role === 'admin' && (
          <button onClick={() => setShowAdmin(true)} title="Administration" style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 7, padding: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Shield size={18} color="#fff" />
          </button>
        )}
        <button onClick={logout} title="Déconnexion" style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 7, padding: 6, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <LogOut size={18} color="#fff" />
        </button>
      </div>
    </div>
  )

  if (selected) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        {topbar}
        <div className="content">
          <ParapheurDetail
            par={selected}
            onBack={async () => { await refresh(); setSelected(null) }}
            onUpdated={async () => { await refresh(); setSelected(null) }}
          />
        </div>
      </div>
    )
  }

  if (creating) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        {topbar}
        <div className="content">
          <NewParapheur
            onCreated={async (par) => { await refresh(); setCreating(false); setSelected(par) }}
            onCancel={() => setCreating(false)}
          />
        </div>
      </div>
    )
  }

  const canCreate = ['admin', 'instructeur'].includes(user.role)

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {topbar}
      <div className="content">
        {tab === 'dashboard' && (
          <Dashboard
            parapheurs={parapheurs}
            onSelect={setSelected}
            onNew={canCreate ? () => setCreating(true) : null}
          />
        )}
        {tab === 'scanner' && (
          <Scanner onFound={(par) => { setSelected(par) }} />
        )}
        {tab === 'alertes' && (
          <AlertsView parapheurs={parapheurs} onSelect={(par) => { setSelected(par) }} />
        )}
        {tab === 'parametres' && (
          <SettingsView onDataChanged={refresh} />
        )}
      </div>

      <nav className="bottom-nav">
        {NAV.map(({ key, label, Icon }) => (
          <button key={key} className={`nav-item ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            <div style={{ position: 'relative' }}>
              <Icon />
              {key === 'alertes' && alertCount > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -6, background: 'var(--cs-rouge)', color: '#fff', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </div>
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}

function CAPSUDLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="6" fill="#D4AC0D" />
      <text x="16" y="22" textAnchor="middle" fill="#1A5276" fontSize="11" fontWeight="800" fontFamily="Inter, sans-serif">CS</text>
    </svg>
  )
}
