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

// Liste tous les utilisateurs (admin seulement)
router.get('/', requireRole('admin'), (req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY nom, prenom').all()
  res.json(users.map(safeUser))
})

// Créer un utilisateur
router.post('/', requireRole('admin'), async (req, res) => {
  const { username, password, nom, prenom, email, service, role } = req.body
  if (!username || !nom || !prenom || !role) return res.status(400).json({ error: 'Champs obligatoires manquants' })
  if (!ROLES.includes(role)) return res.status(400).json({ error: 'Rôle invalide' })

  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (exists) return res.status(409).json({ error: 'Nom d\'utilisateur déjà utilisé' })

  const id = uuid()
  let hash = null
  if (password) hash = await bcrypt.hash(password, 10)

  db.prepare(`
    INSERT INTO users (id, username, password, nom, prenom, email, service, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, username, hash, nom, prenom, email || null, service || null, role)

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  res.status(201).json(safeUser(user))
})

// Modifier un utilisateur
router.put('/:id', requireRole('admin'), async (req, res) => {
  const { nom, prenom, email, service, role, actif, password } = req.body
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

  if (role && !ROLES.includes(role)) return res.status(400).json({ error: 'Rôle invalide' })

  // Empêcher de se retirer ses propres droits admin
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
    updates.password = await bcrypt.hash(password, 10)
    db.prepare(`UPDATE users SET nom=?, prenom=?, email=?, service=?, role=?, actif=?, password=? WHERE id=?`)
      .run(updates.nom, updates.prenom, updates.email, updates.service, updates.role, updates.actif, updates.password, req.params.id)
  } else {
    db.prepare(`UPDATE users SET nom=?, prenom=?, email=?, service=?, role=?, actif=? WHERE id=?`)
      .run(updates.nom, updates.prenom, updates.email, updates.service, updates.role, updates.actif, req.params.id)
  }

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
  res.json(safeUser(updated))
})

// Supprimer un utilisateur
router.delete('/:id', requireRole('admin'), (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Impossible de supprimer votre propre compte' })
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id)
  if (result.changes === 0) return res.status(404).json({ error: 'Utilisateur introuvable' })
  res.json({ ok: true })
})

export default router
