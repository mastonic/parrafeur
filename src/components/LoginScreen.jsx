import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function LoginScreen() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--cs-bg)', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: '100%', maxWidth: 380, boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill="#D4AC0D" />
            <text x="16" y="22" textAnchor="middle" fill="#1A5276" fontSize="11" fontWeight="800" fontFamily="Inter, sans-serif">CS</text>
          </svg>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--cs-bleu)' }}>CAP SUD</div>
            <div style={{ fontSize: 11, color: 'var(--cs-muted)' }}>Parapheur Numérique</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--cs-muted)', display: 'block', marginBottom: 4 }}>Identifiant</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="nom.prenom ou identifiant"
              autoComplete="username"
              required
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--cs-muted)', display: 'block', marginBottom: 4 }}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {error && (
            <div style={{ background: '#fff0f0', border: '1px solid var(--cs-rouge)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--cs-rouge)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ background: 'var(--cs-bleu)', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: 4 }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p style={{ fontSize: 11, color: 'var(--cs-muted)', textAlign: 'center', marginTop: 20, marginBottom: 0 }}>
          Compte par défaut : <strong>admin / admin</strong>
        </p>
      </div>
    </div>
  )
}
