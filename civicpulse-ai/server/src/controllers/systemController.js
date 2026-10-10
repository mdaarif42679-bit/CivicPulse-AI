import { config } from '../config.js';
import { geminiState } from '../services/gemini.js';
import { store } from '../services/store.js';
import { loadDemo } from '../services/demo.js';

export function status(req, res) {
  const connected = !config.demoMode;
  res.json({
    mode: connected ? 'gemini' : 'demo',
    aiConnected: connected && geminiState.ok !== false,
    degraded: connected && geminiState.ok === false,
    lastError: connected ? geminiState.lastError : null,
    reason: connected ? null : config.keyMissing ? 'GEMINI_API_KEY not set' : 'DEMO_MODE=true',
    model: connected ? config.geminiModel : null,
    similarityThreshold: config.similarityThreshold,
  });
}

export function stats(req, res) {
  const reports = store.all('reports'), issues = store.all('issues');
  const active = issues.filter((i) => i.status !== 'Resolved');
  const count = (arr, fn) => arr.reduce((m, x) => { const k = fn(x); m[k] = (m[k] || 0) + 1; return m; }, {});
  res.json({
    totalReports: reports.length,
    pendingReports: reports.filter((r) => !r.issueId).length,
    activeIssues: active.length,
    highPriority: active.filter((i) => i.severity === 'high' || i.severity === 'critical').length,
    resolvedIssues: issues.length - active.length,
    consolidatedIssues: issues.filter((i) => i.reportIds.length > 1).length,
    categories: count(active, (i) => i.category),
    severities: count(active, (i) => i.severity),
  });
}

export function demoLoad(req, res) { res.json({ loaded: loadDemo() }); }
export function demoReset(req, res) { store.reset(); res.json({ ok: true }); }
