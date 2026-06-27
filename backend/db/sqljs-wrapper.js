// Wrapper sql.js → API identique à better-sqlite3 (synchrone après init)
// Utilise import.meta.url pour que Vercel NFT trace la dépendance WASM
import initSqlJs from 'sql.js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

// import.meta.url permet à Vercel de détecter et inclure le fichier WASM dans le bundle
const wasmUrl = new URL('../../node_modules/sql.js/dist/sql-wasm.wasm', import.meta.url)
const wasmBinary = readFileSync(fileURLToPath(wasmUrl))

const SQL = await initSqlJs({ wasmBinary })
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

export default {
  pragma() {},
  exec(sql) { _db.run(sql) },
  prepare,
  transaction,
}
