import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config/index.js';

// 确保数据目录存在
const dbDir = path.dirname(config.databasePath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(config.databasePath);

// 启用 WAL 模式以提高并发性能
db.pragma('journal_mode = WAL');

// 初始化表结构
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS text_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code VARCHAR(10) NOT NULL UNIQUE,
      content TEXT NOT NULL,
      password_hash VARCHAR(64),
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      view_count INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_text_shares_code ON text_shares(code);
    CREATE INDEX IF NOT EXISTS idx_text_shares_expires_at ON text_shares(expires_at);
  `);
}
