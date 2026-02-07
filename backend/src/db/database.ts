import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

let db: Database | null = null;

const dbPath = path.join(__dirname, '../../data/revenue.db');

export async function initDatabase(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();

  // Try to load existing database
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      account_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      industry TEXT NOT NULL,
      segment TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reps (
      rep_id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS deals (
      deal_id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      rep_id TEXT NOT NULL,
      stage TEXT NOT NULL,
      amount REAL,
      created_at TEXT NOT NULL,
      closed_at TEXT,
      FOREIGN KEY (account_id) REFERENCES accounts(account_id),
      FOREIGN KEY (rep_id) REFERENCES reps(rep_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS activities (
      activity_id TEXT PRIMARY KEY,
      deal_id TEXT NOT NULL,
      type TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (deal_id) REFERENCES deals(deal_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS targets (
      month TEXT PRIMARY KEY,
      target REAL NOT NULL
    )
  `);

  // Create indexes
  try { db.run(`CREATE INDEX idx_deals_stage ON deals(stage)`); } catch { }
  try { db.run(`CREATE INDEX idx_deals_rep_id ON deals(rep_id)`); } catch { }
  try { db.run(`CREATE INDEX idx_deals_account_id ON deals(account_id)`); } catch { }
  try { db.run(`CREATE INDEX idx_deals_created_at ON deals(created_at)`); } catch { }
  try { db.run(`CREATE INDEX idx_activities_deal_id ON activities(deal_id)`); } catch { }
  try { db.run(`CREATE INDEX idx_activities_timestamp ON activities(timestamp)`); } catch { }

  return db;
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function saveDatabase(): void {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);

    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(dbPath, buffer);
  }
}

export default { initDatabase, getDatabase, saveDatabase };
