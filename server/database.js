import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'database.sqlite');

// Créer / ouvrir la base SQLite locale
const db = new Database(DB_PATH);

// Activer le mode WAL pour de meilleures performances
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Création des tables si elles n'existent pas
function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      login TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'coach',
      adherent_id TEXT,
      nom TEXT DEFAULT '',
      prenom TEXT DEFAULT '',
      created_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS adherents (
      id TEXT PRIMARY KEY,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      email TEXT,
      fiche_renseignement INTEGER DEFAULT 0,
      paiement_global INTEGER DEFAULT 0,
      manque_paiement INTEGER DEFAULT 0,
      manque_yeps INTEGER DEFAULT 0,
      manque_passsport INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  console.log(`Base SQLite ouverte : ${DB_PATH}`);
  console.log('Tables users et adherents vérifiées/créées.');
}

export { db, initDB };
