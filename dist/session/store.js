"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionStore = void 0;
const fs_1 = require("fs");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const Database = require('better-sqlite3');
function defaultDbPath() {
    return path_1.default.join(os_1.default.homedir(), '.amp', 'sessions.db');
}
function rowToSession(row) {
    return {
        id: row.id,
        timestamp: row.timestamp,
        prompt: row.prompt,
        compiledPrompt: row.compiled_prompt,
        response: row.response,
        backend: row.backend,
        branch: row.branch,
        filesChanged: JSON.parse(row.files_changed || '[]'),
    };
}
class SessionStore {
    constructor(dbPath = defaultDbPath()) {
        (0, fs_1.mkdirSync)(path_1.default.dirname(dbPath), { recursive: true });
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.exec(`CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      prompt TEXT NOT NULL,
      compiled_prompt TEXT NOT NULL,
      response TEXT NOT NULL,
      backend TEXT NOT NULL,
      branch TEXT NOT NULL,
      files_changed TEXT NOT NULL
    )`);
    }
    save(session) {
        const stmt = this.db.prepare(`INSERT OR REPLACE INTO sessions
      (id, timestamp, prompt, compiled_prompt, response, backend, branch, files_changed)
      VALUES (@id, @timestamp, @prompt, @compiledPrompt, @response, @backend, @branch, @filesChanged)`);
        stmt.run({
            ...session,
            filesChanged: JSON.stringify(session.filesChanged || []),
        });
    }
    getLatest() {
        const row = this.db.prepare(`SELECT * FROM sessions ORDER BY timestamp DESC LIMIT 1`).get();
        return row ? rowToSession(row) : null;
    }
    getById(id) {
        const row = this.db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(id);
        return row ? rowToSession(row) : null;
    }
    list(limit = 20) {
        const rows = this.db.prepare(`SELECT * FROM sessions ORDER BY timestamp DESC LIMIT ?`).all(limit);
        return rows.map(rowToSession);
    }
    listByBranch(branch) {
        const rows = this.db.prepare(`SELECT * FROM sessions WHERE branch = ? ORDER BY timestamp ASC`).all(branch);
        return rows.map(rowToSession);
    }
}
exports.SessionStore = SessionStore;
