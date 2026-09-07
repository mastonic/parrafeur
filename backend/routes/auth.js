import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from '../db/database.js'
import { JWT_SECRET, requireAuth } from '../middleware/auth.js'
import { ldapAuthenticate } from '../services/ldap.js'

const router = Router()

router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Identifiants manquants' })

  const authMode = (await db.get("SELECT value FROM config WHERE key='auth_mode'"))?.value || 'local'

  let userData = null

  if (authMode === 'ldap') {
    try {
      const ldapUser = await ldapAuthenticate(username, password)
      let user = await db.get('SELECT * FROM users WHERE username = ?', [username])
      if (!user) {
        const id = `ldap-${Date.now()}`
        await db.run(
          `INSERT INTO users (id, username, nom, prenom, email, service, role) VALUES (?, ?, ?, ?, ?, ?, 'lecteur')`,
          [id, username, ldapUser.nom, ldapUser.prenom, ldapUser.email, ldapUser.service]
        )
        user = await db.get('SELECT * FROM users WHERE id = ?', [id])
      }
      if (!user.actif) return res.status(403).json({ error: 'Compte désactivé' })
      userData = user
    } catch (err) {
      return res.status(401).json({ error: err.message })
    }
  } else {
    const user = await db.get('SELECT * FROM users WHERE username = ? AND actif = 1', [username])
    if (!user || !user.password) return res.status(401).json({ error: 'Identifiants incorrects' })
    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(401).json({ error: 'Identifiants incorrects' })
    userData = user
  }

  await db.run("UPDATE users SET last_login = datetime('now') WHERE id = ?", [userData.id])

  const token = jwt.sign(
    { id: userData.id, username: userData.username, nom: userData.nom, prenom: userData.prenom, role: userData.role, service: userData.service },
    JWT_SECRET,
    { expiresIn: '8h' }
  )

  res.json({
    token,
    user: { id: userData.id, username: userData.username, nom: userData.nom, prenom: userData.prenom, role: userData.role, service: userData.service, email: userData.email },
  })
})

router.get('/me', requireAuth, async (req, res) => {
  const user = await db.get(
    'SELECT id, username, nom, prenom, email, service, role, last_login FROM users WHERE id = ?',
    [req.user.id]
  )
  res.json(user)
})

export default router
