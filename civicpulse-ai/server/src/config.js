import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../');
dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, 'server', '.env') });

const rawKey = (process.env.GEMINI_API_KEY || '').trim();
const keyLooksReal = rawKey.length > 15 && !/your|here|xxx/i.test(rawKey);
const demoForced = String(process.env.DEMO_MODE ?? 'true').toLowerCase() === 'true';
const demoMode = demoForced || !keyLooksReal;

const thrEnv = parseFloat(process.env.SIMILARITY_THRESHOLD);

export const config = {
  port: Number(process.env.PORT) || 5050,
  geminiKey: keyLooksReal ? rawKey : '',
  demoMode,
  keyMissing: !keyLooksReal,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
  similarityThreshold: Number.isFinite(thrEnv) ? thrEnv : demoMode ? 0.55 : 0.74,
  dataDir: path.join(root, 'server', 'data'),
  uploadDir: path.join(root, 'server', 'uploads'),
  clientDist: path.join(root, 'client', 'dist'),
  maxUploadMb: 8,
};
