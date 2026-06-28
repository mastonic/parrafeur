import React, { useState } from 'react'
import { Users, Settings, Bell, ArrowLeft } from 'lucide-react'
import UsersManager from './UsersManager.jsx'
import ConfigManager from './ConfigManager.jsx'
import NotificationsAdmin from './NotificationsAdmin.jsx'

const TABS = [
  { key: 'users', label: 'Utilisateurs', Icon: Users },
  { key: 'notifications', label: 'Notifications', Icon: Bell },
  { key: 'config', label: 'Configuration', Icon: Settings },
]

export default function AdminPanel({ onBack }) {
  const [tab, setTab] = useState('users')

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--cs-bg)' }}>
      {/* Header */}
      <div style={{ background: 'var(--cs-bleu)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Administration</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Gestion des accès et configuration</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#fff', borderBottom: '2px solid #eee' }}>
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTab(key)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '12px 8px', border: 'none', borderBottom: `3px solid ${tab === key ? 'var(--cs-bleu)' : 'transparent'}`, background: 'none', color: tab === key ? 'var(--cs-bleu)' : '#888', fontWeight: tab === key ? 700 : 500, fontSize: 13, cursor: 'pointer' }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
        {tab === 'users' && <UsersManager />}
        {tab === 'notifications' && <NotificationsAdmin />}
        {tab === 'config' && <ConfigManager />}
      </div>
    </div>
  )
}
