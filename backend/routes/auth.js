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

  const authMode = db.prepare("SELECT value FROM config WHERE key='auth_mode'").get()?.value || 'local'

  let userData = null

  if (authMode === 'ldap') {
    try {
      const ldapUser = await ldapAuthenticate(username, password)
      // Chercher ou créer l'utilisateur local lié à ce compte LDAP
      let user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
      if (!user) {
        const id = `ldap-${Date.now()}`
        db.prepare(`
          INSERT INTO users (id, username, nom, prenom, email, service, role)
          VALUES (?, ?, ?, ?, ?, ?, 'lecteur')
        `).run(id, username, ldapUser.nom, ldapUser.prenom, ldapUser.email, ldapUser.service)
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
      }
      if (!user.actif) return res.status(403).json({ error: 'Compte désactivé' })
      userData = user
    } catch (err) {
      return res.status(401).json({ error: err.message })
    }
  } else {
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND actif = 1').get(username)
    if (!user || !user.password) return res.status(401).json({ error: 'Identifiants incorrects' })
    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(401).json({ error: 'Identifiants incorrects' })
    userData = user
  }

  db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(userData.id)

  const token = jwt.sign(
    { id: userData.id, username: userData.username, nom: userData.nom, prenom: userData.prenom, role: userData.role, service: userData.service },
    JWT_SECRET,
    { expiresIn: '8h' }
  )

  res.json({ token, user: { id: userData.id, username: userData.username, nom: userData.nom, prenom: userData.prenom, role: userData.role, service: userData.service, email: userData.email } })
})

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, nom, prenom, email, service, role, last_login FROM users WHERE id = ?').get(req.user.id)
  res.json(user)
})

export default router
