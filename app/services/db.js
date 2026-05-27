let db = null
let SQL = null

async function ensureInitialized() {
  if (db && SQL) return { db, SQL }

  const initSqlJs = require('sql.js')
  SQL = await initSqlJs()

  const { app } = global.electron
  const { join } = require('path')
  const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('fs')

  const userDataPath = app.getPath('userData')
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true })
  }

  const dbPath = join(userDataPath, 'ai-test-factory.db')

  if (existsSync(dbPath)) {
    try {
      const buffer = readFileSync(dbPath)
      db = new SQL.Database(buffer)
    } catch {
      db = new SQL.Database()
    }
  } else {
    db = new SQL.Database()
  }

  initSchema(db)
  return { db, SQL }
}

function saveDb() {
  if (!db) return
  try {
    const { app } = global.electron
    const { join } = require('path')
    const { writeFileSync } = require('fs')
    const userDataPath = app.getPath('userData')
    const dbPath = join(userDataPath, 'ai-test-factory.db')
    const data = db.export()
    writeFileSync(dbPath, Buffer.from(data))
  } catch (err) {
    console.error('Failed to save database:', err)
  }
}

function initSchema(database) {
  database.run('PRAGMA foreign_keys = ON')

  database.run(`
    CREATE TABLE IF NOT EXISTS requirement (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT,
      raw_text    TEXT NOT NULL,
      ai_result   TEXT,
      status      TEXT DEFAULT 'pending',
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS function_point (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      requirement_id  INTEGER NOT NULL,
      seq_no          INTEGER,
      name            TEXT NOT NULL,
      description     TEXT,
      category        TEXT,
      risk_level      TEXT,
      FOREIGN KEY (requirement_id) REFERENCES requirement(id) ON DELETE CASCADE
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS test_point (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      function_point_id INTEGER NOT NULL,
      seq_no            INTEGER,
      name              TEXT NOT NULL,
      test_type         TEXT,
      preconditions     TEXT,
      FOREIGN KEY (function_point_id) REFERENCES function_point(id) ON DELETE CASCADE
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS test_case (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      requirement_id  INTEGER NOT NULL,
      case_id         TEXT NOT NULL,
      module          TEXT NOT NULL,
      sub_module      TEXT,
      case_name       TEXT NOT NULL,
      test_level      TEXT,
      test_type       TEXT,
      test_stage      TEXT,
      preconditions   TEXT,
      test_steps      TEXT NOT NULL,
      expected_result TEXT NOT NULL,
      actual_result   TEXT,
      status          TEXT DEFAULT 'UNTESTED',
      FOREIGN KEY (requirement_id) REFERENCES requirement(id) ON DELETE CASCADE
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS artifact (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      requirement_id  INTEGER,
      artifact_type   TEXT NOT NULL,
      file_name       TEXT NOT NULL,
      file_path       TEXT NOT NULL,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requirement_id) REFERENCES requirement(id) ON DELETE CASCADE
    )
  `)

  database.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    )
  `)

  saveDb()
}

function queryAll(sql, params = []) {
  if (!db) throw new Error('Database not initialized')
  try {
    const stmt = db.prepare(sql)
    if (params.length > 0) stmt.bind(params)
    const results = []
    while (stmt.step()) {
      results.push(stmt.getAsObject())
    }
    stmt.free()
    return results
  } catch (err) {
    console.error('Query error:', sql, err)
    return []
  }
}

function runAndGetId(sql, params = []) {
  if (!db) throw new Error('Database not initialized')
  db.run(sql, params)
  const result = db.exec('SELECT last_insert_rowid() as id')
  const id = result[0] && result[0].values[0] ? result[0].values[0][0] : 0
  saveDb()
  return id
}

function run(sql, params = []) {
  if (!db) throw new Error('Database not initialized')
  db.run(sql, params)
  saveDb()
}

function getOne(sql, params = []) {
  const rows = queryAll(sql, params)
  return rows[0]
}

function tx(fn) {
  if (!db) throw new Error('Database not initialized')
  run('BEGIN TRANSACTION')
  try {
    fn()
    run('COMMIT')
  } catch (err) {
    run('ROLLBACK')
    throw err
  }
}

const dbService = {
  init: ensureInitialized,
  queryAll,
  getOne,
  run,
  runAndGetId,
  transaction: tx,
  saveDb
}

module.exports = { dbService }
