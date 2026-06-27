// Wrapper sql.js → API identique à better-sqlite3 (synchrone après init)
// Charge le WASM depuis le disque pour fonctionner en serverless (Vercel)
import initSqlJs from 'sql.js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join, resolve } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))

// Cherche le WASM dans node_modules depuis la racine du projet
function findWasm() {
  const candidates = [
    join(__dir, '../../node_modules/sql.js/dist/sql-wasm.wasm'),
    join(__dir, '../../../node_modules/sql.js/dist/sql-wasm.wasm'),
    resolve('node_modules/sql.js/dist/sql-wasm.wasm'),
  ]
  for (const p of candidates) {
    try { return readFileSync(p) } catch { /* try next */ }
  }
  throw new Error('sql-wasm.wasm introuvable')
}

const SQL = await initSqlJs({ wasmBinary: findWasm() })
const _db = new SQL.Database()

function flatParams(args) {
  return args.flat()
}

function prepare(sql) {
  return {
    get(...args) {
      const stmt = _db.prepare(sql)
      const params = flatParams(args)
      if (params.length) stmt.bind(params)
      const row = stmt.step() ? stmt.getAsObject() : undefined
      stmt.free()
      return row
    },
    all(...args) {
      const stmt = _db.prepare(sql)
      const params = flatParams(args)
      if (params.length) stmt.bind(params)
      const rows = []
      while (stmt.step()) rows.push(stmt.getAsObject())
      stmt.free()
      return rows
    },
    run(...args) {
      const stmt = _db.prepare(sql)
      const params = flatParams(args)
      if (params.length) stmt.bind(params)
      stmt.step()
      stmt.free()
      return { changes: 1 }
    },
  }
}

function transaction(fn) {
  return (...args) => {
    _db.run('BEGIN')
    try {
      fn(...args)
      _db.run('COMMIT')
    } catch (e) {
      _db.run('ROLLBACK')
      throw e
    }
  }
}

const db = {
  pragma() {},
  exec(sql) { _db.run(sql) },
  prepare,
  transaction,
}

export default db
