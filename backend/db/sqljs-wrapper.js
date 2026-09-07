import initSqlJs from 'sql.js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

const wasmUrl = new URL('../../node_modules/sql.js/dist/sql-wasm.wasm', import.meta.url)
const wasmBinary = readFileSync(fileURLToPath(wasmUrl))
const SQL = await initSqlJs({ wasmBinary })
const _db = new SQL.Database()

function prepare(sql) {
  return {
    get(...args) {
      const stmt = _db.prepare(sql)
      stmt.bind(args)
      const row = stmt.step() ? stmt.getAsObject() : undefined
      stmt.free()
      return row
    },
    all(...args) {
      const stmt = _db.prepare(sql)
      stmt.bind(args)
      const rows = []
      while (stmt.step()) rows.push(stmt.getAsObject())
      stmt.free()
      return rows
    },
    run(...args) {
      const stmt = _db.prepare(sql)
      stmt.run(args)
      stmt.free()
    },
  }
}

const wrapper = {
  pragma() {},
  exec(sql) { _db.run(sql) },
  prepare,
  transaction(fn) {
    return (...args) => {
      _db.run('BEGIN')
      try {
        const result = fn(...args)
        _db.run('COMMIT')
        return result
      } catch (e) {
        _db.run('ROLLBACK')
        throw e
      }
    }
  },
}

export default wrapper
