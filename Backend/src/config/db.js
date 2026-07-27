/**
 * AI REXI Database Adapter
 * Supports SQLite (default) + SQL Server (auto-fallback)
 * 
 * Config via environment variables or .env:
 *   DB_TYPE        = sqlite | sqlserver
 *   SQLSERVER_HOST = localhost
 *   SQLSERVER_PORT = 1433
 *   SQLSERVER_USER = sa
 *   SQLSERVER_PASS = YourPassword123!
 *   SQLSERVER_DB   = AI_REXI
 */

const path = require('path');
const fs = require('fs');

// Load environment variables from .env
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });


// ─── SQLite Adapter ────────────────────────────────────────
class SQLiteAdapter {
  constructor() {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.join(__dirname, '..', '..', '..', 'Database', 'tro_ly_ai.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) console.error('[DB] SQLite error:', err.message);
      else {
        console.log('[DB] SQLite connected:', dbPath);
        this._init();
      }
    });
    this.type = 'sqlite';
  }

  _init() {
    this.db.run("PRAGMA foreign_keys = ON;");
    this.db.run("ALTER TABLE cuoc_hoi_thoai ADD COLUMN ngay_xoa DATETIME", () => {});
    this.db.run("ALTER TABLE nguoi_dung ADD COLUMN anh_dai_dien TEXT", () => {});
    this.db.run("ALTER TABLE nguoi_dung ADD COLUMN otp_code TEXT", () => {});
    this.db.run("ALTER TABLE nguoi_dung ADD COLUMN otp_expiry INTEGER", () => {});
    this.db.run("ALTER TABLE nguoi_dung ADD COLUMN trang_thai TEXT DEFAULT 'active'", () => {});
  }

  get(sql, params = [], callback) {
    this.db.get(sql, params, callback);
  }

  all(sql, params = [], callback) {
    this.db.all(sql, params, callback);
  }

  run(sql, params = [], callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    this.db.run(sql, params, function(err) {
      if (callback) callback.call(this, err);
    });
  }
}

// ─── SQL Server Adapter ────────────────────────────────────
class SQLServerAdapter {
  constructor() {
    this.type = 'sqlserver';
    this.pool = null;
    this._connect();
  }

  async _connect() {
    const sql = require('mssql/msnodesqlv8');
    const rawHost = process.env.SQLSERVER_HOST || '(localdb)\\MSSQLLocalDB';
    const dbName  = process.env.SQLSERVER_DB   || 'AI_REXI';

    const config = {
      connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${rawHost};Database=${dbName};Trusted_Connection=yes;`
    };

    try {
      this.pool = await sql.connect(config);
      console.log('[DB] SQL Server connected successfully to:', rawHost + '/' + dbName);
      await this._seed();
    } catch (err) {
      console.error('[DB] SQL Server connection failed:', err.message);
      console.log('[DB] Falling back to SQLite...');
      return null;
    }
  }

  async _seed() {
    try {
      await this.pool.request().query(`
        IF NOT EXISTS (SELECT 1 FROM nguoi_dung WHERE ma_nguoi_dung = 'u1111111-1111-1111-1111-111111111111')
        BEGIN
          INSERT INTO nguoi_dung (ma_nguoi_dung, email, mat_khau_ma_hoa, ten_day_du, phan_quyen)
          VALUES ('u1111111-1111-1111-1111-111111111111', 'user@rexi.ai', 'hashed_pass', N'Nguoi Dung Thu Nghiem', 'admin');
        END
      `);
    } catch (e) { /* table may not exist yet */ }
  }

  get(sql, params = [], callback) {
    if (!this.pool) return callback(new Error('Not connected'));
    const req = this._buildRequest(sql, params);
    req.query(sql).then(r => callback(null, r.recordset[0] || null)).catch(callback);
  }

  all(sql, params = [], callback) {
    if (!this.pool) return callback(new Error('Not connected'));
    const req = this._buildRequest(sql, params);
    req.query(sql).then(r => callback(null, r.recordset || [])).catch(callback);
  }

  run(sql, params = [], callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }
    if (!this.pool) return callback(new Error('Not connected'));

    // SQLite-compatible placeholders ? -> @p0, @p1, ...
    let idx = 0;
    const mssql = sql.replace(/\?/g, () => `@p${idx++}`);

    const req = this._buildRequest(mssql, params);
    req.query(mssql).then(r => {
      if (callback) {
        // Mimic SQLite's this.changes
        const ctx = { changes: r.rowsAffected ? r.rowsAffected.reduce((a, b) => a + b, 0) : 0 };
        callback.call(ctx, null);
      }
    }).catch(callback);
  }

  _buildRequest(sql, params) {
    const req = this.pool.request();
    if (Array.isArray(params)) {
      params.forEach((p, i) => {
        req.input(`p${i}`, this._guessType(p), p);
      });
    }
    return req;
  }

  _guessType(val) {
    const sql = require('mssql');
    if (val === null || val === undefined) return sql.NVarChar;
    if (typeof val === 'number') return Number.isInteger(val) ? sql.Int : sql.Float;
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return sql.DateTime2;
    return sql.NVarChar;
  }
}

// ─── Auto-fallback Factory ─────────────────────────────────
function createDatabase() {
  const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();

  if (dbType === 'sqlserver') {
    const adapter = new SQLServerAdapter();
    if (adapter.pool) return adapter;
    console.log('[DB] SQL Server unavailable, using SQLite');
  }

  return new SQLiteAdapter();
}

module.exports = createDatabase();
