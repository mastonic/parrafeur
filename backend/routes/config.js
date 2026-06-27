import { Router } from 'express'
import db from '../db/database.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { testLdapConnection } from '../services/ldap.js'

const router = Router()
router.use(requireAuth, requireRole('admin'))

const PUBLIC_KEYS = ['auth_mode', 'app_name', 'ldap_url', 'ldap_base_dn', 'ldap_bind_dn', 'ldap_user_filter', 'ldap_attr_nom', 'ldap_attr_prenom', 'ldap_attr_email', 'ldap_attr_service']
const SECRET_KEYS = ['ldap_bind_password']

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM config').all()
  const cfg = Object.fromEntries(rows.map(r => [r.key, SECRET_KEYS.includes(r.key) ? (r.value ? '••••••••' : '') : r.value]))
  res.json(cfg)
})

router.put('/', (req, res) => {
  const allowed = [...PUBLIC_KEYS, ...SECRET_KEYS]
  const update = db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)')
  const tx = db.transaction((data) => {
    for (const [k, v] of Object.entries(data)) {
      if (!allowed.includes(k)) continue
      // Ne pas écraser le mot de passe si envoyé masqué
      if (k === 'ldap_bind_password' && v === '••••••••') continue
      update.run(k, v)
    }
  })
  tx(req.body)
  res.json({ ok: true })
})

router.post('/test-ldap', async (req, res) => {
  try {
    const cfg = req.body
    await testLdapConnection(cfg)
    res.json({ ok: true, message: 'Connexion LDAP réussie' })
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message })
  }
})

export default router
