import Database from 'better-sqlite3';
try {
  const db = new Database('unlockpro.db');
  const row = db.prepare('SELECT count(*) as count FROM devices').get();
  console.log('Database check:', row);
} catch (e) {
  console.error('Database failed:', e);
}
