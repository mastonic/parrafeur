import { Router } from 'express'
import db from '../db/database.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { testLdapConnection } from '../services/ldap.js'

const router = Router()
router.use(requireAuth, requireRole('admin'))

const PUBLIC_KEYS = ['auth_mode', 'app_name', 'ldap_url', 'ldap_base_dn', 'ldap_bind_dn', 'ldap_user_filter', 'ldap_attr_nom', 'ldap_attr_prenom', 'ldap_attr_email', 'ldap_attr_service']
const SECRET_KEYS = ['ldap_bind_password']
const ALLOWED = [...PUBLIC_KEYS, ...SECRET_KEYS]

router.get('/', async (req, res) => {
  const rows = await db.all('SELECT key, value FROM config')
  const cfg = Object.fromEntries(
    rows.map(r => [r.key, SECRET_KEYS.includes(r.key) ? (r.value ? '••••••••' : '') : r.value])
  )
  res.json(cfg)
})

router.put('/', async (req, res) => {
  const statements = []
  for (const [k, v] of Object.entries(req.body)) {
    if (!ALLOWED.includes(k)) continue
    if (k === 'ldap_bind_password' && v === '••••••••') continue
    statements.push({ sql: 'INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', args: [k, v] })
  }
  if (statements.length) await db.transaction(statements)
  res.json({ ok: true })
})

router.post('/test-ldap', async (req, res) => {
  try {
    await testLdapConnection(req.body)
    res.json({ ok: true, message: 'Connexion LDAP réussie' })
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message })
  }
})

export default router
