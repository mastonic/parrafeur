import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import bcrypt from 'bcryptjs'

const __dir = dirname(fileURLToPath(import.meta.url))

// Interface async unifiée : get / all / run / exec
let driver

if (process.env.TURSO_URL) {
  // --- Turso (SQLite distant, sync entre appareils) ---
  const { createClient } = await import('@libsql/client')
  const client = createClient({
    url: process.env.TURSO_URL,
    authToken: process.env.TURSO_AUTH_TOKEN || '',
  })

  driver = {
    async get(sql, args = []) {
      const r = await client.execute({ sql, args })
      return r.rows[0] ? Object.fromEntries(Object.entries(r.rows[0])) : undefined
    },
    async all(sql, args = []) {
      const r = await client.execute({ sql, args })
      return r.rows.map(row => Object.fromEntries(Object.entries(row)))
    },
    async run(sql, args = []) {
      const r = await client.execute({ sql, args })
      return { changes: r.rowsAffected }
    },
    async exec(sql) {
      for (const stmt of sql.split(';').map(s => s.trim()).filter(Boolean)) {
        await client.execute(stmt)
      }
    },
    async transaction(statements) {
      await client.batch(statements, 'write')
    },
  }
} else {
  // --- better-sqlite3 (self-hosted) ou sql.js (Vercel sans Turso) ---
  let rawDb

  try {
    const { default: Database } = await import('better-sqlite3')
    const { mkdirSync } = await import('fs')
    const DB_PATH = join(__dir, '..', 'data', 'parapheur.db')
    mkdirSync(join(__dir, '..', 'data'), { recursive: true })
    rawDb = new Database(DB_PATH)
    rawDb.pragma('journal_mode = WAL')
    rawDb.pragma('foreign_keys = ON')
  } catch {
    const { default: wrapper } = await import('./sqljs-wrapper.js')
    rawDb = wrapper
  }

  driver = {
    async get(sql, args = []) { return rawDb.prepare(sql).get(...args) },
    async all(sql, args = []) { return rawDb.prepare(sql).all(...args) },
    async run(sql, args = []) { return rawDb.prepare(sql).run(...args) },
    async exec(sql) { rawDb.exec(sql) },
    async transaction(statements) {
      const tx = rawDb.transaction(() => {
        for (const { sql, args = [] } of statements) rawDb.prepare(sql).run(...args)
      })
      tx()
    },
  }
}

// Schéma
await driver.exec(`
  CREATE TABLE IF NOT EXISTS config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    id         TEXT PRIMARY KEY,
    username   TEXT UNIQUE NOT NULL,
    password   TEXT,
    nom        TEXT NOT NULL,
    prenom     TEXT NOT NULL,
    email      TEXT,
    service    TEXT,
    role       TEXT NOT NULL DEFAULT 'lecteur',
    actif      INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login TEXT
  );
  CREATE TABLE IF NOT EXISTS parapheurs (
    id         TEXT PRIMARY KEY,
    data       TEXT NOT NULL,
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

// Config par défaut
const defaults = {
  auth_mode: 'local',
  ldap_url: '',
  ldap_base_dn: '',
  ldap_bind_dn: '',
  ldap_bind_password: '',
  ldap_user_filter: '(sAMAccountName={{username}})',
  ldap_attr_nom: 'sn',
  ldap_attr_prenom: 'givenName',
  ldap_attr_email: 'mail',
  ldap_attr_service: 'department',
  app_name: 'Parapheur Numérique',
}
for (const [k, v] of Object.entries(defaults)) {
  await driver.run('INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)', [k, v])
}

// Admin par défaut
const count = await driver.get('SELECT COUNT(*) as c FROM users')
if (!count || count.c === 0) {
  const hash = await bcrypt.hash('Mastonic3110!', 10)
  await driver.run(
    `INSERT INTO users (id, username, password, nom, prenom, email, role) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['admin-default', 'admin', hash, 'Administrateur', 'Super', 'Demo1@holdmasto.fr', 'admin']
  )
}

// Données de démonstration (5 parapheurs)
const parCount = await driver.get('SELECT COUNT(*) as c FROM parapheurs')
if (!parCount || parCount.c === 0) {
  const now = new Date()
  const d = (offsetDays) => {
    const dt = new Date(now)
    dt.setDate(dt.getDate() + offsetDays)
    return dt.toISOString()
  }

  const demo = [
    {
      id: 'demo-001',
      reference: 'PAR-2026-4821',
      objet: 'Marché de travaux — Réfection voirie RD7 lot 2',
      service: 'Direction des Travaux',
      priorite: 'urgent',
      notes: 'Délai contractuel impératif. Notification prestataire avant fin de mois.',
      createdAt: d(-8),
      deadline: d(1),
      statut: 'en_cours',
      circuit: [
        { ordre: 0, role: 'Chargé de marchés', nom: 'Martin Dupont', statut: 'valide', date: d(-6), commentaire: 'Dossier complet, pièces vérifiées.' },
        { ordre: 1, role: 'Responsable Travaux', nom: 'Sophie Leroy', statut: 'valide', date: d(-3), commentaire: 'Validé — conforme au programme pluriannuel.' },
        { ordre: 2, role: 'DAF', nom: 'Jean-Pierre Moreau', statut: 'en_cours', date: d(-1), commentaire: '' },
        { ordre: 3, role: 'DGS', nom: 'Claire Fontaine', statut: 'en_attente', date: null, commentaire: '' },
        { ordre: 4, role: 'Président', nom: 'M. le Président', statut: 'en_attente', date: null, commentaire: '' },
      ],
      history: [
        { action: 'Création', date: d(-8), auteur: 'Martin Dupont' },
        { action: 'Étape 1 — Validé', date: d(-6), auteur: 'Martin Dupont' },
        { action: 'Étape 2 — Validé', date: d(-3), auteur: 'Sophie Leroy' },
      ],
      created_by: 'admin-default',
    },
    {
      id: 'demo-002',
      reference: 'PAR-2026-3307',
      objet: 'Convention de partenariat — Médiathèque intercommunale 2026-2029',
      service: 'Direction Générale',
      priorite: 'normal',
      notes: '',
      createdAt: d(-15),
      deadline: d(12),
      statut: 'en_cours',
      circuit: [
        { ordre: 0, role: 'Agent instructeur', nom: 'Isabelle Renard', statut: 'valide', date: d(-13), commentaire: 'Projet de convention relu et annoté.' },
        { ordre: 1, role: 'Responsable juridique', nom: 'Thomas Bernard', statut: 'en_cours', date: d(-10), commentaire: '' },
        { ordre: 2, role: 'DGS', nom: 'Claire Fontaine', statut: 'en_attente', date: null, commentaire: '' },
        { ordre: 3, role: 'Élu référent culture', nom: 'Mme Caucheteux', statut: 'en_attente', date: null, commentaire: '' },
      ],
      history: [
        { action: 'Création', date: d(-15), auteur: 'Isabelle Renard' },
        { action: 'Étape 1 — Validé', date: d(-13), auteur: 'Isabelle Renard' },
      ],
      created_by: 'admin-default',
    },
    {
      id: 'demo-003',
      reference: 'PAR-2026-2194',
      objet: 'Délibération — Budget primitif 2026 et annexes',
      service: 'Direction des Finances',
      priorite: 'normal',
      notes: 'Transmis au contrôle de légalité le 15/02/2026.',
      createdAt: d(-45),
      deadline: d(-30),
      statut: 'valide',
      circuit: [
        { ordre: 0, role: 'Contrôleur de gestion', nom: 'Paul Girard', statut: 'valide', date: d(-43), commentaire: 'Équilibres vérifiés, pas d\'anomalie.' },
        { ordre: 1, role: 'DAF', nom: 'Jean-Pierre Moreau', statut: 'valide', date: d(-40), commentaire: 'Conforme aux orientations budgétaires.' },
        { ordre: 2, role: 'DGS', nom: 'Claire Fontaine', statut: 'valide', date: d(-38), commentaire: 'Validé.' },
        { ordre: 3, role: 'Président', nom: 'M. le Président', statut: 'valide', date: d(-35), commentaire: 'Approuvé pour présentation au conseil.' },
      ],
      history: [
        { action: 'Création', date: d(-45), auteur: 'Paul Girard' },
        { action: 'Étape 1 — Validé', date: d(-43), auteur: 'Paul Girard' },
        { action: 'Étape 2 — Validé', date: d(-40), auteur: 'Jean-Pierre Moreau' },
        { action: 'Étape 3 — Validé', date: d(-38), auteur: 'Claire Fontaine' },
        { action: 'Étape 4 — Validé', date: d(-35), auteur: 'M. le Président' },
        { action: 'Parapheur validé complet', date: d(-35), auteur: 'Système' },
      ],
      created_by: 'admin-default',
    },
    {
      id: 'demo-004',
      reference: 'PAR-2026-1753',
      objet: 'Avenant n°3 — Contrat de maintenance informatique SIAG',
      service: 'Direction des Services Techniques',
      priorite: 'normal',
      notes: 'Avenant contesté : dépassement de seuil à vérifier avec la DAJ.',
      createdAt: d(-20),
      deadline: d(-5),
      statut: 'refuse',
      circuit: [
        { ordre: 0, role: 'Responsable SI', nom: 'Nicolas Petit', statut: 'valide', date: d(-18), commentaire: 'Modifications techniques validées.' },
        { ordre: 1, role: 'DAJ', nom: 'Aurélie Mercier', statut: 'refuse', date: d(-14), commentaire: 'Refus : le cumul des avenants dépasse 50 % du marché initial. Relancer une procédure de mise en concurrence.' },
        { ordre: 2, role: 'DAF', nom: 'Jean-Pierre Moreau', statut: 'en_attente', date: null, commentaire: '' },
      ],
      history: [
        { action: 'Création', date: d(-20), auteur: 'Nicolas Petit' },
        { action: 'Étape 1 — Validé', date: d(-18), auteur: 'Nicolas Petit' },
        { action: 'Étape 2 — Refusé', date: d(-14), auteur: 'Aurélie Mercier' },
      ],
      created_by: 'admin-default',
    },
    {
      id: 'demo-005',
      reference: 'PAR-2025-9912',
      objet: 'Rapport annuel d\'activité 2025 — Direction des Ressources Humaines',
      service: 'Direction des Ressources Humaines',
      priorite: 'normal',
      notes: 'Document transmis aux élus et publié sur le portail citoyen.',
      createdAt: d(-90),
      deadline: d(-60),
      statut: 'archive',
      circuit: [
        { ordre: 0, role: 'DRH', nom: 'Valérie Dubois', statut: 'valide', date: d(-88), commentaire: '' },
        { ordre: 1, role: 'DGS', nom: 'Claire Fontaine', statut: 'valide', date: d(-85), commentaire: 'Rapport complet et bien rédigé.' },
        { ordre: 2, role: 'Président', nom: 'M. le Président', statut: 'valide', date: d(-82), commentaire: 'Approuvé.' },
      ],
      history: [
        { action: 'Création', date: d(-90), auteur: 'Valérie Dubois' },
        { action: 'Étape 1 — Validé', date: d(-88), auteur: 'Valérie Dubois' },
        { action: 'Étape 2 — Validé', date: d(-85), auteur: 'Claire Fontaine' },
        { action: 'Étape 3 — Validé', date: d(-82), auteur: 'M. le Président' },
        { action: 'Parapheur validé complet', date: d(-82), auteur: 'Système' },
        { action: 'Archivé', date: d(-70), auteur: 'Valérie Dubois' },
      ],
      created_by: 'admin-default',
    },
  ]

  for (const par of demo) {
    await driver.run(
      'INSERT OR IGNORE INTO parapheurs (id, data, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [par.id, JSON.stringify(par), par.created_by, par.createdAt, par.createdAt]
    )
  }
}

export default driver
