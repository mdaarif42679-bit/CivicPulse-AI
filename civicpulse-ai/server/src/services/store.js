import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config.js';

fs.mkdirSync(config.dataDir, { recursive: true });
fs.mkdirSync(config.uploadDir, { recursive: true });
const file = path.join(config.dataDir, 'db.json');
const empty = () => ({ reports: [], issues: [], evidence: [] });
let db = empty();
try {
  if (fs.existsSync(file)) db = { ...empty(), ...JSON.parse(fs.readFileSync(file, 'utf8')) };
} catch { console.warn('[store] db.json unreadable, starting with an empty database'); }

export const uid = (prefix) => `${prefix}_${crypto.randomBytes(5).toString('hex')}`;
function persist() {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, file);
}
// Simple JSON-file store behind a tiny interface; swap this module for Firebase/Supabase later.
export const store = {
  all: (c) => db[c],
  get: (c, id) => db[c].find((x) => x.id === id) || null,
  insert(c, item) { db[c].push(item); persist(); return item; },
  update(c, id, patch) { const it = this.get(c, id); if (!it) return null; Object.assign(it, patch); persist(); return it; },
  save: persist,
  reset() { db = empty(); persist(); },
};
