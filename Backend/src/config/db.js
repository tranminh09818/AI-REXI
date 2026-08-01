/**
 * AI REXI Multi-Database Adapter
 * Supports: sqlite | sqlserver | postgresql
 * Mode: single | parallel
 */
const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '..', '..', '..', '.env');
if (fs.existsSync(envPath)) require('dotenv').config({ path: envPath });

const DB_TYPE = (process.env.DB_TYPE || 'sqlite').toLowerCase();
const DB_MODE = (process.env.DB_MODE || 'single').toLowerCase();
const log = (msg) => console.log('[DB] ' + msg);

// ─── SQLite ────────────────────────────────────────────────
class SQLiteAdapter {
  constructor() {
    this.type = 'sqlite';
    this.ready = false;
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.join(__dirname, '..', '..', '..', 'Database', 'tro_ly_ai.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) log('SQLite error: ' + err.message);
      else { log('SQLite connected: ' + dbPath); this.ready = true; this._init(); }
    });
  }
  _init() { this.db.run("PRAGMA foreign_keys = ON;"); }
  _wait(cb) {
    if (this.ready) return cb();
    const check = setInterval(() => { if (this.ready) { clearInterval(check); cb(); } }, 50);
    setTimeout(() => { clearInterval(check); cb(); }, 5000);
  }
  get(sql, params = [], cb) { this._wait(() => this.db.get(sql, params, cb)); }
  all(sql, params = [], cb) { this._wait(() => this.db.all(sql, params, cb)); }
  run(sql, params = [], cb) {
    if (typeof params === 'function') { cb = params; params = []; }
    this._wait(() => this.db.run(sql, params, function(err) { if (cb) cb.call(this, err); }));
  }
  close(cb) { if (this.db) this.db.close(cb); }
}

// ─── SQL Server ────────────────────────────────────────────
class SQLServerAdapter {
  constructor() {
    this.type = 'sqlserver';
    this.pool = null;
    this.queue = [];
    this.mssql = null;
    this._connect();
  }
  async _connect() {
    const authType = (process.env.SQLSERVER_AUTH || 'windows').toLowerCase();
    try {
    if (authType === 'sa') {
      const sql = require('mssql');
      this.mssql = sql;
      this.pool = await sql.connect({
          server: process.env.SQLSERVER_HOST || 'localhost',
          port: parseInt(process.env.SQLSERVER_PORT) || 1433,
          database: process.env.SQLSERVER_DB || 'AI REXI',
          user: process.env.SQLSERVER_USER || 'sa',
          password: process.env.SQLSERVER_PASS || '',
          options: { encrypt: false, trustServerCertificate: true }
        });
        log('SQL Server connected (SA)');
      } else {
        const sql = require('mssql/msnodesqlv8');
        this.mssql = sql;
        const host = process.env.SQLSERVER_HOST || '.\\SQLEXPRESS';
        const dbName = process.env.SQLSERVER_DB || 'AI REXI';
        this.pool = await sql.connect({
          connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${host};Database={${dbName}};Trusted_Connection=yes;`
        });
        log('SQL Server connected (Windows Auth)');
      }
    } catch (err) {
      log('SQL Server failed: ' + err.message + ' — falling back to SQLite');
      return;
    }
    this._drain();
  }
  _transform(sql, params) {
    let idx = 0;
    let q = sql.replace(/\?/g, () => `@rxi_p${idx++}`);
    // Convert SQLite LIMIT OFFSET syntax to MS SQL Server dialect
    if (q.toUpperCase().includes('LIMIT')) {
      if (/LIMIT\s+@rxi_p\d+\s+OFFSET\s+@rxi_p\d+/i.test(q)) {
        q = q.replace(/LIMIT\s+(@rxi_p\d+)\s+OFFSET\s+(@rxi_p\d+)/i, 'OFFSET $2 ROWS FETCH NEXT $1 ROWS ONLY');
      } else if (/LIMIT\s+@rxi_p\d+/i.test(q)) {
        q = q.replace(/LIMIT\s+(@rxi_p\d+)/i, 'OFFSET 0 ROWS FETCH NEXT $1 ROWS ONLY');
      } else if (/LIMIT\s+(\d+)\s+OFFSET\s+(\d+)/i.test(q)) {
        q = q.replace(/LIMIT\s+(\d+)\s+OFFSET\s+(\d+)/i, 'OFFSET $2 ROWS FETCH NEXT $1 ROWS ONLY');
      } else if (/LIMIT\s+(\d+)/i.test(q)) {
        q = q.replace(/LIMIT\s+(\d+)/i, 'OFFSET 0 ROWS FETCH NEXT $1 ROWS ONLY');
      }
    }
    const req = this.pool.request();
    if (Array.isArray(params)) {
      const mssql = this.mssql || require('mssql');
      params.forEach((p, i) => req.input(`rxi_p${i}`, p === null ? mssql.NVarChar : typeof p === 'number' ? (Number.isInteger(p) ? mssql.Int : mssql.Float) : mssql.NVarChar, p));
    }
    return { req, sql: q };
  }
  _exec(sql, params, cb, mode) {
    if (!this.pool) { this.queue.push([sql, params, cb, mode]); return; }
    const { req, sql: q } = this._transform(sql, params);
    req.query(q).then(r => {
      if (mode === 'get') cb(null, r.recordset[0] || null);
      else if (mode === 'all') cb(null, r.recordset || []);
      else if (cb) cb.call({ changes: r.rowsAffected ? r.rowsAffected.reduce((a, b) => a + b, 0) : 0 }, null);
    }).catch(cb || (() => {}));
  }
  _drain() { this.queue.forEach(([s, p, cb, m]) => this._exec(s, p, cb, m)); this.queue = []; }
  get(sql, params = [], cb) { this._exec(sql, params, cb, 'get'); }
  all(sql, params = [], cb) { this._exec(sql, params, cb, 'all'); }
  run(sql, params = [], cb) {
    if (typeof params === 'function') { cb = params; params = []; }
    this._exec(sql, params, cb, 'run');
  }
  close() { if (this.pool) this.pool.close(); }
}

// ─── PostgreSQL ────────────────────────────────────────────
class PostgreSQLAdapter {
  constructor() {
    this.type = 'postgresql';
    this.pool = null;
    this.queue = [];
    this._connect();
  }
  async _connect() {
    try {
      const { Pool } = require('pg');
      this.pool = new Pool({
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT) || 5432,
        database: process.env.PGDATABASE || 'ai_rexi',
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || '',
        ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
      });
      await this.pool.query('SELECT 1');
      log('PostgreSQL connected');
    } catch (err) { log('PostgreSQL failed: ' + err.message); return; }
    this._drain();
  }
  _exec(sql, params, cb, mode) {
    if (!this.pool) { this.queue.push([sql, params, cb, mode]); return; }
    let idx = 0;
    const text = sql.replace(/\?/g, () => `$${++idx}`);
    const values = Array.isArray(params) ? params : [];
    this.pool.query(text, values).then(r => {
      if (mode === 'get') cb(null, r.rows[0] || null);
      else if (mode === 'all') cb(null, r.rows || []);
      else if (cb) cb.call({ changes: r.rowCount || 0 }, null);
    }).catch(cb || (() => {}));
  }
  _drain() { this.queue.forEach(([s, p, cb, m]) => this._exec(s, p, cb, m)); this.queue = []; }
  get(sql, params = [], cb) { this._exec(sql, params, cb, 'get'); }
  all(sql, params = [], cb) { this._exec(sql, params, cb, 'all'); }
  run(sql, params = [], cb) {
    if (typeof params === 'function') { cb = params; params = []; }
    this._exec(sql, params, cb, 'run');
  }
  close() { if (this.pool) this.pool.end(); }
}

// ─── Parallel ──────────────────────────────────────────────
class ParallelAdapter {
  constructor(adapters) {
    this.adapters = adapters.filter(a => a.pool || a.ready || a.type === 'sqlite');
    this.type = 'parallel';
    log('Parallel mode: ' + this.adapters.map(a => a.type).join(' + '));
  }
  get(sql, params = [], cb) { this.adapters[0].get(sql, params, cb); }
  all(sql, params = [], cb) { this.adapters[0].all(sql, params, cb); }
  run(sql, params = [], cb) {
    let n = 0, err = null;
    const ctx = { changes: 0 };
    const done = () => { n++; if (n >= this.adapters.length && cb) cb.call(ctx, err); };
    this.adapters.forEach(a => a.run(sql, params, function(e) { if (e) err = e; else ctx.changes += this.changes || 0; done(); }));
  }
  close() { this.adapters.forEach(a => a.close()); }
}

// ─── Factory (sync) ────────────────────────────────────────
function createDatabase() {
  if (DB_MODE === 'parallel') {
    const list = [new SQLiteAdapter(), new SQLServerAdapter()];
    try { list.push(new PostgreSQLAdapter()); } catch (e) {}
    return new ParallelAdapter(list);
  }
  if (DB_TYPE === 'sqlserver') {
    const a = new SQLServerAdapter();
    return a;
  }
  if (DB_TYPE === 'postgresql') {
    try { return new PostgreSQLAdapter(); } catch (e) {}
    log('PostgreSQL unavailable, using SQLite');
  }
  return new SQLiteAdapter();
}

module.exports = createDatabase();
