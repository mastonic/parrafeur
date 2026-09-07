import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import db from '../db/database.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

function genRef() {
  const y = new Date().getFullYear()
  const n = String(Math.floor(Math.random() * 9000) + 1000)
  return `PAR-${y}-${n}`
}

router.get('/', async (req, res) => {
  const rows = await db.all('SELECT * FROM parapheurs ORDER BY created_at DESC')
  res.json(rows.map(r => JSON.parse(r.data)))
})

router.post('/', requireRole('admin', 'instructeur'), async (req, res) => {
  const { objet, service, priorite, deadline, circuit, notes } = req.body
  const id = uuid()
  const user = req.user
  const par = {
    id,
    reference: genRef(),
    objet,
    service,
    priorite: priorite || 'normal',
    notes: notes || '',
    createdAt: new Date().toISOString(),
    deadline: deadline || null,
    circuit: circuit.map((step, i) => ({
      ...step,
      ordre: i,
      statut: i === 0 ? 'en_cours' : 'en_attente',
      date: null,
      commentaire: '',
    })),
    statut: 'en_cours',
    history: [{ action: 'Création', date: new Date().toISOString(), auteur: `${user.prenom} ${user.nom}` }],
    created_by: user.id,
  }
  await db.run('INSERT INTO parapheurs (id, data, created_by) VALUES (?, ?, ?)', [id, JSON.stringify(par), user.id])
  res.status(201).json(par)
})

router.get('/:id', async (req, res) => {
  const row = await db.get('SELECT data FROM parapheurs WHERE id = ?', [req.params.id])
  if (!row) return res.status(404).json({ error: 'Introuvable' })
  res.json(JSON.parse(row.data))
})

router.put('/:id/step', requireRole('admin', 'instructeur', 'signataire'), async (req, res) => {
  const { stepOrdre, statut, commentaire } = req.body
  const row = await db.get('SELECT data FROM parapheurs WHERE id = ?', [req.params.id])
  if (!row) return res.status(404).json({ error: 'Introuvable' })

  const par = JSON.parse(row.data)
  const step = par.circuit[stepOrdre]
  if (!step) return res.status(400).json({ error: 'Étape invalide' })

  step.statut = statut
  step.date = new Date().toISOString()
  step.commentaire = commentaire || ''

  const auteur = `${req.user.prenom} ${req.user.nom}`
  par.history.push({
    action: `Étape ${stepOrdre + 1} — ${statut === 'valide' ? 'Validé' : 'Refusé'}`,
    date: new Date().toISOString(),
    auteur,
  })

  if (statut === 'refuse') {
    par.statut = 'refuse'
  } else if (statut === 'valide') {
    const next = par.circuit[stepOrdre + 1]
    if (next) {
      next.statut = 'en_cours'
    } else {
      par.statut = 'valide'
      par.history.push({ action: 'Parapheur validé complet', date: new Date().toISOString(), auteur: 'Système' })
    }
  }

  await db.run("UPDATE parapheurs SET data=?, updated_at=datetime('now') WHERE id=?", [JSON.stringify(par), req.params.id])
  res.json(par)
})

router.put('/:id/archive', requireRole('admin', 'instructeur'), async (req, res) => {
  const row = await db.get('SELECT data FROM parapheurs WHERE id = ?', [req.params.id])
  if (!row) return res.status(404).json({ error: 'Introuvable' })
  const par = JSON.parse(row.data)
  par.statut = 'archive'
  par.history.push({ action: 'Archivé', date: new Date().toISOString(), auteur: `${req.user.prenom} ${req.user.nom}` })
  await db.run("UPDATE parapheurs SET data=?, updated_at=datetime('now') WHERE id=?", [JSON.stringify(par), req.params.id])
  res.json(par)
})

router.delete('/:id', requireRole('admin'), async (req, res) => {
  const result = await db.run('DELETE FROM parapheurs WHERE id = ?', [req.params.id])
  if (result.changes === 0) return res.status(404).json({ error: 'Introuvable' })
  res.json({ ok: true })
})

export default router
