import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import bcrypt from 'bcryptjs'

const __dir = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dir, '..', 'data', 'parapheur.db')

import { mkdirSync } from 'fs'
mkdirSync(join(__dir, '..', 'data'), { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
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

const insertConfig = db.prepare('INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)')
for (const [k, v] of Object.entries(defaults)) {
  insertConfig.run(k, v)
}

// Créer l'admin par défaut si aucun utilisateur
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get()
if (userCount.c === 0) {
  const hash = bcrypt.hashSync('admin', 10)
  db.prepare(`
    INSERT INTO users (id, username, password, nom, prenom, email, role)
    VALUES ('admin-default', 'admin', ?, 'Administrateur', 'Super', 'admin@local', 'admin')
  `).run(hash)
}

export default db
