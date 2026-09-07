import React, { useState, useEffect } from 'react'
import { UserPlus, Edit2, Trash2, Check, X, ShieldCheck, Eye, PenTool, User } from 'lucide-react'
import { api } from '../../api.js'
import { useAuth } from '../../contexts/AuthContext.jsx'

const ROLES = [
  { value: 'admin', label: 'Administrateur', icon: ShieldCheck, desc: 'Accès complet : configuration, utilisateurs, tous les parapheurs' },
  { value: 'instructeur', label: 'Instructeur', icon: PenTool, desc: 'Crée et instruit les parapheurs, valide les étapes' },
  { value: 'signataire', label: 'Signataire', icon: Check, desc: 'Valide ou refuse les étapes qui lui sont assignées' },
  { value: 'lecteur', label: 'Lecteur', icon: Eye, desc: 'Consultation uniquement, aucune modification' },
]

const ROLE_COLORS = { admin: '#1A5276', instructeur: '#1a7a3c', signataire: '#7a5a1a', lecteur: '#555' }

function RoleBadge({ role }) {
  const r = ROLES.find(x => x.value === role)
  return (
    <span style={{ background: ROLE_COLORS[role] + '18', color: ROLE_COLORS[role], border: `1px solid ${ROLE_COLORS[role]}40`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
      {r?.label || role}
    </span>
  )
}

function UserForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    username: '', password: '', nom: '', prenom: '', email: '', service: '', role: 'lecteur',
    ...initial,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const isEdit = !!initial?.id

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave(form)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { width: '100%', padding: '8px 10px', border: '1.5px solid #e0e0e0', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#666', display: 'block', marginBottom: 3 }}>Prénom *</label>
          <input style={inputStyle} value={form.prenom} onChange={set('prenom')} required />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#666', display: 'block', marginBottom: 3 }}>Nom *</label>
          <input style={inputStyle} value={form.nom} onChange={set('nom')} required />
        </div>
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#666', display: 'block', marginBottom: 3 }}>Identifiant (login) *</label>
        <input style={inputStyle} value={form.username} onChange={set('username')} required disabled={isEdit} />
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#666', display: 'block', marginBottom: 3 }}>
          {isEdit ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe *'}
        </label>
        <input style={inputStyle} type="password" value={form.password} onChange={set('password')} required={!isEdit} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#666', display: 'block', marginBottom: 3 }}>Email</label>
          <input style={inputStyle} type="email" value={form.email} onChange={set('email')} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#666', display: 'block', marginBottom: 3 }}>Service</label>
          <input style={inputStyle} value={form.service} onChange={set('service')} />
        </div>
      </div>
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#666', display: 'block', marginBottom: 6 }}>Profil *</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ROLES.map(r => (
            <label key={r.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', border: `2px solid ${form.role === r.value ? ROLE_COLORS[r.value] : '#e0e0e0'}`, borderRadius: 8, cursor: 'pointer', background: form.role === r.value ? ROLE_COLORS[r.value] + '10' : '#fff' }}>
              <input type="radio" name="role" value={r.value} checked={form.role === r.value} onChange={set('role')} style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: ROLE_COLORS[r.value] }}>{r.label}</div>
                <div style={{ fontSize: 11, color: '#666' }}>{r.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
      {error && <div style={{ background: '#fff0f0', border: '1px solid #e74c3c', borderRadius: 7, padding: '8px 10px', fontSize: 12, color: '#e74c3c' }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        <button type="button" onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 7, border: '1.5px solid #ddd', background: '#fff', fontSize: 13, cursor: 'pointer' }}>Annuler</button>
        <button type="submit" disabled={saving} style={{ padding: '8px 18px', borderRadius: 7, border: 'none', background: 'var(--cs-bleu)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          {saving ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer le compte'}
        </button>
      </div>
    </form>
  )
}

export default function UsersManager() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try { setUsers(await api.getUsers()) } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleSave(form) {
    if (editing) {
      await api.updateUser(editing.id, form)
    } else {
      await api.createUser(form)
    }
    setShowForm(false)
    setEditing(null)
    load()
  }

  async function handleToggleActive(u) {
    await api.updateUser(u.id, { actif: !u.actif })
    load()
  }

  async function handleDelete(u) {
    if (!confirm(`Supprimer le compte de ${u.prenom} ${u.nom} ?`)) return
    try { await api.deleteUser(u.id); load() } catch (e) { alert(e.message) }
  }

  return (
    <div style={{ padding: '0 0 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--cs-bleu)' }}>Gestion des utilisateurs</div>
          <div style={{ fontSize: 12, color: 'var(--cs-muted)' }}>{users.length} compte{users.length > 1 ? 's' : ''}</div>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--cs-bleu)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <UserPlus size={15} /> Nouveau compte
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', border: '1.5px solid #dde', borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, color: 'var(--cs-bleu)' }}>
            {editing ? `Modifier — ${editing.prenom} ${editing.nom}` : 'Nouveau compte utilisateur'}
          </div>
          <UserForm initial={editing} onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null) }} />
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--cs-muted)', fontSize: 13 }}>Chargement...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map(u => (
            <div key={u.id} style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, opacity: u.actif ? 1 : 0.55, border: '1.5px solid #eee' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: ROLE_COLORS[u.role] + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={18} color={ROLE_COLORS[u.role]} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#222' }}>
                  {u.prenom} {u.nom}
                  {u.id === me?.id && <span style={{ fontSize: 10, color: 'var(--cs-muted)', marginLeft: 6 }}>(vous)</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--cs-muted)' }}>@{u.username}{u.service ? ` · ${u.service}` : ''}</div>
              </div>
              <RoleBadge role={u.role} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => { setEditing(u); setShowForm(true) }} style={{ padding: '6px 8px', borderRadius: 7, border: '1.5px solid #ddd', background: '#fff', cursor: 'pointer' }} title="Modifier">
                  <Edit2 size={13} />
                </button>
                <button onClick={() => handleToggleActive(u)} style={{ padding: '6px 8px', borderRadius: 7, border: '1.5px solid #ddd', background: u.actif ? '#fff' : '#f5f5f5', cursor: 'pointer' }} title={u.actif ? 'Désactiver' : 'Activer'}>
                  {u.actif ? <X size={13} color="#e74c3c" /> : <Check size={13} color="#27ae60" />}
                </button>
                {u.id !== me?.id && (
                  <button onClick={() => handleDelete(u)} style={{ padding: '6px 8px', borderRadius: 7, border: '1.5px solid #fcc', background: '#fff8f8', cursor: 'pointer' }} title="Supprimer">
                    <Trash2 size={13} color="#e74c3c" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
