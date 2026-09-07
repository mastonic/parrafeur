import React, { useState, useEffect } from 'react'
import { Save, TestTube, CheckCircle, XCircle, ToggleLeft, ToggleRight } from 'lucide-react'
import { api } from '../../api.js'

const inputStyle = { width: '100%', padding: '8px 10px', border: '1.5px solid #e0e0e0', borderRadius: 7, fontSize: 13, boxSizing: 'border-box' }
const labelStyle = { fontSize: 11, fontWeight: 600, color: '#666', display: 'block', marginBottom: 4 }

function Field({ label, hint, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 10, color: '#999', marginTop: 3 }}>{hint}</div>}
    </div>
  )
}

export default function ConfigManager() {
  const [cfg, setCfg] = useState(null)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getConfig().then(setCfg).catch(e => setError(e.message))
  }, [])

  const set = (k) => (e) => setCfg(c => ({ ...c, [k]: e.target.value }))
  const isLdap = cfg?.auth_mode === 'ldap'

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.updateConfig(cfg)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleTestLdap() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await api.testLdap({
        ldap_url: cfg.ldap_url,
        ldap_bind_dn: cfg.ldap_bind_dn,
        ldap_bind_password: cfg.ldap_bind_password,
      })
      setTestResult({ ok: true, msg: res.message })
    } catch (err) {
      setTestResult({ ok: false, msg: err.message })
    } finally {
      setTesting(false)
    }
  }

  if (!cfg) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--cs-muted)', fontSize: 13 }}>{error || 'Chargement...'}</div>

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 32 }}>
      <div>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--cs-bleu)', marginBottom: 4 }}>Configuration système</div>
        <div style={{ fontSize: 12, color: 'var(--cs-muted)' }}>Paramètres globaux de l'application</div>
      </div>

      {/* Nom de l'application */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1.5px solid #eee' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#333' }}>Général</div>
        <Field label="Nom de l'organisation">
          <input style={inputStyle} value={cfg.app_name} onChange={set('app_name')} />
        </Field>
      </div>

      {/* Mode d'authentification */}
      <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1.5px solid #eee' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#333' }}>Mode d'authentification</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { value: 'local', label: 'Authentification locale', desc: 'Les comptes sont créés et gérés directement dans cette application.' },
            { value: 'ldap', label: 'Annuaire LDAP / Active Directory', desc: 'Les agents se connectent avec leur compte Windows (Active Directory) ou OpenLDAP.' },
          ].map(opt => (
            <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', border: `2px solid ${cfg.auth_mode === opt.value ? 'var(--cs-bleu)' : '#e0e0e0'}`, borderRadius: 8, cursor: 'pointer', background: cfg.auth_mode === opt.value ? '#eaf0fb' : '#fff' }}>
              <input type="radio" name="auth_mode" value={opt.value} checked={cfg.auth_mode === opt.value} onChange={set('auth_mode')} style={{ marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cs-bleu)' }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: '#666' }}>{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Configuration LDAP */}
      {isLdap && (
        <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '2px solid var(--cs-bleu)40' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: 'var(--cs-bleu)' }}>Configuration LDAP / Active Directory</div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 16 }}>Pour Windows Active Directory, utilisez ldap:// ou ldaps:// avec le port 389 ou 636.</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="URL du serveur LDAP *" hint="Ex : ldap://192.168.1.10:389 ou ldaps://ad.mairie.fr:636">
              <input style={inputStyle} value={cfg.ldap_url} onChange={set('ldap_url')} placeholder="ldap://192.168.1.10:389" />
            </Field>
            <Field label="Base DN *" hint="Ex : DC=mairie,DC=fr ou OU=agents,DC=capsud,DC=fr">
              <input style={inputStyle} value={cfg.ldap_base_dn} onChange={set('ldap_base_dn')} placeholder="DC=mairie,DC=fr" />
            </Field>

            <div style={{ height: 1, background: '#f0f0f0' }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>Compte de service (lecture annuaire)</div>

            <Field label="Bind DN (compte de service)" hint="Ex : CN=svc-parapheur,OU=services,DC=mairie,DC=fr">
              <input style={inputStyle} value={cfg.ldap_bind_dn} onChange={set('ldap_bind_dn')} />
            </Field>
            <Field label="Mot de passe du compte de service">
              <input style={inputStyle} type="password" value={cfg.ldap_bind_password} onChange={set('ldap_bind_password')} placeholder={cfg.ldap_bind_password === '••••••••' ? '(inchangé)' : ''} />
            </Field>

            <div style={{ height: 1, background: '#f0f0f0' }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>Attributs LDAP</div>

            <Field label="Filtre de recherche utilisateur" hint="{{username}} sera remplacé par l'identifiant saisi">
              <input style={inputStyle} value={cfg.ldap_user_filter} onChange={set('ldap_user_filter')} placeholder="(sAMAccountName={{username}})" />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Attribut Nom" hint="Souvent : sn">
                <input style={inputStyle} value={cfg.ldap_attr_nom} onChange={set('ldap_attr_nom')} />
              </Field>
              <Field label="Attribut Prénom" hint="Souvent : givenName">
                <input style={inputStyle} value={cfg.ldap_attr_prenom} onChange={set('ldap_attr_prenom')} />
              </Field>
              <Field label="Attribut Email" hint="Souvent : mail">
                <input style={inputStyle} value={cfg.ldap_attr_email} onChange={set('ldap_attr_email')} />
              </Field>
              <Field label="Attribut Service" hint="Souvent : department">
                <input style={inputStyle} value={cfg.ldap_attr_service} onChange={set('ldap_attr_service')} />
              </Field>
            </div>

            {/* Test LDAP */}
            <div style={{ background: '#f8faff', borderRadius: 8, padding: 12, border: '1px solid #dde' }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: '#333' }}>Tester la connexion</div>
              <button type="button" onClick={handleTestLdap} disabled={testing} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 7, border: '1.5px solid var(--cs-bleu)', background: '#fff', color: 'var(--cs-bleu)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                <TestTube size={14} /> {testing ? 'Test en cours...' : 'Tester la connexion LDAP'}
              </button>
              {testResult && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: testResult.ok ? '#27ae60' : '#e74c3c' }}>
                  {testResult.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  {testResult.msg}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {error && <div style={{ background: '#fff0f0', border: '1px solid #e74c3c', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#e74c3c' }}>{error}</div>}

      <button type="submit" disabled={saving} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 8, border: 'none', background: 'var(--cs-bleu)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
        {saved ? <><CheckCircle size={15} /> Enregistré !</> : saving ? 'Enregistrement...' : <><Save size={15} /> Enregistrer la configuration</>}
      </button>
    </form>
  )
}
