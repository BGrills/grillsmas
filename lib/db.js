// Tables are created automatically on first use — no SQL console needed.
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS stays (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     person TEXT NOT NULL,
     arrive TEXT NOT NULL,
     depart TEXT NOT NULL,
     note TEXT,
     created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS blocks (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     person TEXT NOT NULL,
     day TEXT NOT NULL,
     slot TEXT NOT NULL,
     label TEXT,
     created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS gifts (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     owner TEXT NOT NULL,
     item TEXT NOT NULL,
     link TEXT,
     notes TEXT,
     claimed_by TEXT,
     claimed_at TEXT,
     created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS requests (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     kind TEXT NOT NULL,
     description TEXT NOT NULL,
     requester TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'requested',
     created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
];

let ready = false;

export async function getDb(env) {
  if (!env.DB) {
    throw new Error('No database connected. In Cloudflare: Settings → Bindings → add a D1 database with the variable name DB.');
  }
  if (!ready) {
    await env.DB.batch(SCHEMA.map((sql) => env.DB.prepare(sql)));
    ready = true;
  }
  return env.DB;
}
