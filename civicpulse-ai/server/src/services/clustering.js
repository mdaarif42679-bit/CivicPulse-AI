import { config } from '../config.js';
import { store, uid } from './store.js';
import { analyzeReport } from './analysis.js';
import { generateEmbedding, embeddingText, findRelatedReports } from './similarity.js';
import { generateBrief } from './brief.js';
import { httpError } from '../utils/errors.js';
import { SEVERITIES } from '../utils/text.js';

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const mode = (a) => { const m = new Map(); a.filter(Boolean).forEach((x) => m.set(x, (m.get(x) || 0) + 1)); return [...m.entries()].sort((x, y) => y[1] - x[1])[0]?.[0]; };

/** Step 1: AI analysis + embedding for one report. */
export async function analyzeAndStore(reportId) {
  const report = store.get('reports', reportId);
  if (!report) throw httpError(404, 'Report not found');
  const analysis = await analyzeReport(report);
  if (analysis.transcript && !report.description) report.description = analysis.transcript;
  const { vector, source } = await generateEmbedding(embeddingText(report, analysis));
  return store.update('reports', reportId, {
    description: report.description, aiAnalysis: analysis, embedding: vector, embeddingSource: source,
    status: report.issueId ? 'clustered' : 'analyzed',
  });
}

/** Step 2: rank other reports by similarity. */
export async function relatedFor(reportId) {
  const report = store.get('reports', reportId);
  if (!report) throw httpError(404, 'Report not found');
  if (!report.aiAnalysis) throw httpError(409, 'Analyze this report first');
  return findRelatedReports(report);
}

/** Step 3: join the best matching issue or open a new one, then rebuild evidence + brief. */
const inflight = new Map();
/** Serialized per report so double-clicks or retries cannot create duplicate issues. */
export function assignToIssue(reportId) {
  if (inflight.has(reportId)) return inflight.get(reportId);
  const p = assignOnce(reportId).finally(() => inflight.delete(reportId));
  inflight.set(reportId, p);
  return p;
}

async function assignOnce(reportId) {
  const report = store.get('reports', reportId);
  if (!report) throw httpError(404, 'Report not found');
  if (!report.aiAnalysis) throw httpError(409, 'Analyze this report first');
  if (report.issueId) return { issue: store.get('issues', report.issueId), created: false, alreadyAssigned: true, score: report.clusterScore ?? null };

  const related = await findRelatedReports(report);
  const byIssue = new Map();
  related.forEach((r) => { if (r.issueId) byIssue.set(r.issueId, [...(byIssue.get(r.issueId) || []), r.score]); });
  let best = null;
  for (const [issueId, scores] of byIssue) {
    const issue = store.get('issues', issueId);
    if (!issue || issue.status === 'Resolved') continue;
    const s = 0.6 * Math.max(...scores) + 0.4 * mean(scores);
    if (!best || s > best.s) best = { issue, s };
  }
  const now = new Date().toISOString();
  const a = report.aiAnalysis;
  let issue, created = false, score = null;
  if (best && best.s >= config.similarityThreshold) {
    issue = best.issue; score = +best.s.toFixed(3);
    issue.reportIds.push(report.id);
    issue.events.push({ ts: now, type: 'report_added', text: `Report grouped into this issue (similarity ${score.toFixed(2)})` });
  } else {
    created = true;
    issue = store.insert('issues', {
      id: uid('iss'), title: a.title, topic: a.topic, category: a.category, location: a.location || report.location || 'Unspecified location',
      severity: a.severity, reportIds: [report.id], evidenceIds: [], summary: null, status: 'Needs Verification',
      createdAt: now, updatedAt: now, confidence: a.confidence,
      events: [{ ts: now, type: 'created', text: 'Issue opened by AI grouping (unverified)' }],
    });
  }
  store.update('reports', report.id, { issueId: issue.id, status: 'clustered', clusterScore: score });
  await refreshIssue(issue.id);
  return { issue: store.get('issues', issue.id), created, score, matched: related.filter((r) => r.related).slice(0, 5) };
}

/** Recomputes severity, location, confidence, evidence and the AI brief from the member reports. */
export async function refreshIssue(issueId) {
  const issue = store.get('issues', issueId);
  const reports = issue.reportIds.map((id) => store.get('reports', id)).filter(Boolean);
  const an = reports.map((r) => r.aiAnalysis).filter(Boolean);
  let sev = Math.max(...an.map((x) => SEVERITIES.indexOf(x.severity)), 0);
  if (reports.length >= 5) sev = Math.max(sev, 2);
  issue.severity = SEVERITIES[sev];
  issue.location = mode(an.map((x) => x.location)) || issue.location;
  issue.category = mode(an.map((x) => x.category)) || issue.category;
  const scores = reports.map((r) => r.clusterScore).filter((n) => typeof n === 'number');
  issue.confidence = +(scores.length ? mean(scores) : mean(an.map((x) => x.confidence))).toFixed(2);

  for (const r of reports) {
    for (const [type, url] of [['image', r.imageUrl], ['audio', r.audioUrl]]) {
      if (!url || store.all('evidence').some((e) => e.reportId === r.id && e.type === type)) continue;
      const ev = store.insert('evidence', { id: uid('ev'), issueId, reportId: r.id, type, url, createdAt: r.timestamp });
      issue.evidenceIds.push(ev.id);
    }
  }
  issue.summary = await generateBrief(issue, reports);
  issue.updatedAt = new Date().toISOString();
  store.save();
  return issue;
}

/** Runs all three steps. Used by report submission and the demo pipeline. */
export async function processReport(reportId) {
  await analyzeAndStore(reportId);
  return assignToIssue(reportId);
}
