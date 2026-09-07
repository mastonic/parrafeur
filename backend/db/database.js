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

export default driver
