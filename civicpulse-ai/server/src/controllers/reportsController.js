import { config } from '../config.js';
import { store, uid } from '../services/store.js';
import { analyzeAndStore, relatedFor, assignToIssue, processReport } from '../services/clustering.js';
import { httpError } from '../utils/errors.js';
import { CATEGORIES } from '../utils/text.js';

export const publicReport = (r) => { if (!r) return r; const { embedding, imageFile, audioFile, imageMime, audioMime, ...rest } = r; return { ...rest, hasEmbedding: !!embedding }; };
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

export function list(req, res) {
  const reports = [...store.all('reports')].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  res.json({ reports: reports.map(publicReport) });
}

export function getOne(req, res) {
  const r = store.get('reports', req.params.id);
  if (!r) throw httpError(404, 'Report not found');
  const issue = r.issueId ? store.get('issues', r.issueId) : null;
  res.json({ report: publicReport(r), issue: issue ? { id: issue.id, title: issue.title, severity: issue.severity, status: issue.status, reportCount: issue.reportIds.length } : null });
}

export async function create(req, res) {
  const f = req.files || {};
  const image = f.image?.[0], audio = f.audio?.[0];
  const description = clean(req.body.description, 1500);
  const location = clean(req.body.location, 120);
  const category = CATEGORIES.includes(req.body.category) ? req.body.category : '';
  const canTranscribe = !config.demoMode && !!audio;
  if (description.length < 10 && !canTranscribe) throw httpError(400, 'Please describe the problem in at least 10 characters.');
  const report = store.insert('reports', {
    id: uid('rep'), description, location, category, timestamp: new Date().toISOString(),
    imageUrl: image ? `/uploads/${image.filename}` : null, imageFile: image?.filename || null, imageMime: image?.mimetype || null,
    audioUrl: audio ? `/uploads/${audio.filename}` : null, audioFile: audio?.filename || null, audioMime: audio?.mimetype || null,
    aiAnalysis: null, embedding: null, embeddingSource: null, issueId: null, status: 'received', clusterScore: null, isDemo: false,
  });
  if (String(req.body.autoProcess) === 'false') return res.status(201).json({ report: publicReport(report) });
  const result = await processReport(report.id);
  res.status(201).json({ report: publicReport(store.get('reports', report.id)), issue: result.issue, created: result.created, score: result.score });
}

// POST /api/analyze  { reportId } stores the analysis; { text, location } returns a preview without saving.
export async function analyze(req, res) {
  const { reportId, text, location } = req.body || {};
  if (reportId) { const r = await analyzeAndStore(reportId); return res.json({ report: publicReport(r) }); }
  const t = clean(text, 1500);
  if (t.length < 10) throw httpError(400, 'Provide reportId, or text of at least 10 characters.');
  const { analyzeReport } = await import('../services/analysis.js');
  res.json({ analysis: await analyzeReport({ description: t, location: clean(location, 120), category: '' }) });
}

export async function related(req, res) {
  const scores = await relatedFor(req.params.id);
  const rows = scores.map((s) => ({ ...s, report: publicReport(store.get('reports', s.reportId)) }));
  res.json({ threshold: config.similarityThreshold, related: rows });
}

export async function cluster(req, res) {
  const { reportId } = req.body || {};
  if (!reportId) throw httpError(400, 'reportId is required');
  res.json(await assignToIssue(reportId));
}
