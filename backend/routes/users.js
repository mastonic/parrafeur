import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import db from '../db/database.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

const ROLES = ['admin', 'instructeur', 'signataire', 'lecteur']

function safeUser(u) {
  const { password, ...rest } = u
  return rest
}

router.get('/', requireRole('admin'), async (req, res) => {
  const users = await db.all('SELECT * FROM users ORDER BY nom, prenom')
  res.json(users.map(safeUser))
})

router.post('/', requireRole('admin'), async (req, res) => {
  const { username, password, nom, prenom, email, service, role } = req.body
  if (!username || !nom || !prenom || !role) return res.status(400).json({ error: 'Champs obligatoires manquants' })
  if (!ROLES.includes(role)) return res.status(400).json({ error: 'Rôle invalide' })

  const exists = await db.get('SELECT id FROM users WHERE username = ?', [username])
  if (exists) return res.status(409).json({ error: "Nom d'utilisateur déjà utilisé" })

  const id = uuid()
  const hash = password ? await bcrypt.hash(password, 10) : null

  await db.run(
    `INSERT INTO users (id, username, password, nom, prenom, email, service, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, username, hash, nom, prenom, email || null, service || null, role]
  )

  const user = await db.get('SELECT * FROM users WHERE id = ?', [id])
  res.status(201).json(safeUser(user))
})

router.put('/:id', requireRole('admin'), async (req, res) => {
  const { nom, prenom, email, service, role, actif, password } = req.body
  const user = await db.get('SELECT * FROM users WHERE id = ?', [req.params.id])
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

  if (role && !ROLES.includes(role)) return res.status(400).json({ error: 'Rôle invalide' })
  if (req.params.id === req.user.id && role && role !== 'admin') {
    return res.status(400).json({ error: 'Vous ne pouvez pas retirer vos propres droits administrateur' })
  }

  const updates = {
    nom: nom ?? user.nom,
    prenom: prenom ?? user.prenom,
    email: email ?? user.email,
    service: service ?? user.service,
    role: role ?? user.role,
    actif: actif !== undefined ? (actif ? 1 : 0) : user.actif,
  }

  if (password) {
    const hash = await bcrypt.hash(password, 10)
    await db.run(
      `UPDATE users SET nom=?, prenom=?, email=?, service=?, role=?, actif=?, password=? WHERE id=?`,
      [updates.nom, updates.prenom, updates.email, updates.service, updates.role, updates.actif, hash, req.params.id]
    )
  } else {
    await db.run(
      `UPDATE users SET nom=?, prenom=?, email=?, service=?, role=?, actif=? WHERE id=?`,
      [updates.nom, updates.prenom, updates.email, updates.service, updates.role, updates.actif, req.params.id]
    )
  }

  const updated = await db.get('SELECT * FROM users WHERE id = ?', [req.params.id])
  res.json(safeUser(updated))
})

router.delete('/:id', requireRole('admin'), async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Impossible de supprimer votre propre compte' })
  const result = await db.run('DELETE FROM users WHERE id = ?', [req.params.id])
  if (result.changes === 0) return res.status(404).json({ error: 'Utilisateur introuvable' })
  res.json({ ok: true })
})

export default router
