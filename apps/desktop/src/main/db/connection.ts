import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { app } from 'electron';
import path from 'node:path';
import * as schema from './schema.js';

let db: ReturnType<typeof drizzle<typeof schema>>;
let sqlite: Database.Database;

export function initializeDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'attensa.db');
  sqlite = new Database(dbPath);

  // Enable WAL mode for better concurrent read/write performance
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  db = drizzle(sqlite, { schema });

  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      planned_duration_ms INTEGER NOT NULL,
      actual_duration_ms INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      total_focus_time_ms INTEGER NOT NULL DEFAULT 0,
      app_switch_count INTEGER NOT NULL DEFAULT 0,
      avg_recovery_time_ms INTEGER NOT NULL DEFAULT 0,
      focus_fragmentation_score INTEGER NOT NULL DEFAULT 0,
      interruption_count INTEGER NOT NULL DEFAULT 0,
      context_switch_count INTEGER NOT NULL DEFAULT 0,
      idle_time_ms INTEGER NOT NULL DEFAULT 0,
      ai_insights_json TEXT
    );

    CREATE TABLE IF NOT EXISTS app_events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      timestamp INTEGER NOT NULL,
      app_name TEXT NOT NULL,
      window_title TEXT NOT NULL,
      bundle_id TEXT NOT NULL,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      is_idle INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS context_blocks (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      cluster_id TEXT NOT NULL,
      start_timestamp INTEGER NOT NULL,
      end_timestamp INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL,
      app_names_json TEXT NOT NULL,
      event_count INTEGER NOT NULL,
      was_interrupted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS monthly_summaries (
      id TEXT PRIMARY KEY,
      year_month TEXT NOT NULL UNIQUE,
      generated_at INTEGER NOT NULL,
      session_count INTEGER NOT NULL,
      total_focus_time_ms INTEGER NOT NULL,
      avg_focus_time_per_session_ms INTEGER NOT NULL,
      avg_app_switches_per_session INTEGER NOT NULL,
      avg_recovery_time_ms INTEGER NOT NULL,
      avg_fragmentation_score INTEGER NOT NULL,
      total_interruptions INTEGER NOT NULL,
      top_apps_json TEXT NOT NULL,
      top_interruption_sources_json TEXT NOT NULL,
      focus_trend_json TEXT NOT NULL,
      ai_recap_json TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_app_events_session ON app_events(session_id);
    CREATE INDEX IF NOT EXISTS idx_app_events_timestamp ON app_events(timestamp);
    CREATE INDEX IF NOT EXISTS idx_context_blocks_session ON context_blocks(session_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);
  `);

  return db;
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export function closeDatabase() {
  if (sqlite) {
    sqlite.close();
  }
}
