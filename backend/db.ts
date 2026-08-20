import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// Path can be overridden (e.g. by the desktop shell, pointing to the OS user-data directory).
const DB_PATH = process.env['DB_PATH'] || `${import.meta.dir}/data/app.db`;
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    isFavorite INTEGER NOT NULL DEFAULT 0,
    items TEXT NOT NULL DEFAULT '[]',
    groupId TEXT,
    groupOrder INTEGER,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS session_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '[]',
    isGlobal INTEGER NOT NULL DEFAULT 0,
    isFavorite INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS study_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    isFavorite INTEGER NOT NULL DEFAULT 0,
    milestones TEXT NOT NULL DEFAULT '[]',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY DEFAULT 'local',
    theme TEXT NOT NULL DEFAULT 'light',
    fretboardStyleIndex INTEGER NOT NULL DEFAULT 0,
    audioInstrument TEXT,
    audioVolume REAL,
    audioReverb REAL,
    audioDetune REAL,
    audioSustain INTEGER,
    playMetronome INTEGER,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`);
