import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import routes from './routes/index.js';
import { HttpError } from './utils/errors.js';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/] }));
app.use(express.json({ limit: '100kb' }));
app.use('/uploads', express.static(config.uploadDir, { setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff') }));
app.use('/api', routes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

if (fs.existsSync(path.join(config.clientDist, 'index.html'))) {
  app.use(express.static(config.clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(config.clientDist, 'index.html')));
}

// Safe error messages: details go to the server log, never to the client.
app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: `File too large (max ${config.maxUploadMb} MB).` });
  if (err.name === 'MulterError') return res.status(400).json({ error: 'Invalid upload.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body.' });
  console.error('[error]', err);
  res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
});

app.listen(config.port, () => {
  console.log(`CivicPulse AI server on http://localhost:${config.port}`);
  console.log(config.demoMode
    ? `Mode: DEMO (${config.keyMissing ? 'no GEMINI_API_KEY' : 'DEMO_MODE=true'}), similarity threshold ${config.similarityThreshold}`
    : `Mode: GEMINI (${config.geminiModel}), similarity threshold ${config.similarityThreshold}`);
});
