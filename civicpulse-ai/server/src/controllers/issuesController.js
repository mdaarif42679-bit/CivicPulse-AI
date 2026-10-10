import { store } from '../services/store.js';
import { httpError } from '../utils/errors.js';
import { publicReport } from './reportsController.js';

const STATUSES = ['Needs Verification', 'Verified', 'Resolved'];
const view = (i) => ({ ...i, reportCount: i.reportIds.length, evidenceCount: i.evidenceIds.length });

export function list(req, res) {
  const issues = [...store.all('issues')].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  res.json({ issues: issues.map(view) });
}

export function getOne(req, res) {
  const issue = store.get('issues', req.params.id);
  if (!issue) throw httpError(404, 'Issue not found');
  const reports = issue.reportIds.map((id) => publicReport(store.get('reports', id))).filter(Boolean).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const evidence = issue.evidenceIds.map((id) => store.get('evidence', id)).filter(Boolean);
  res.json({ issue: view(issue), reports, evidence });
}

function setStatus(issue, status, text) {
  const now = new Date().toISOString();
  issue.status = status; issue.updatedAt = now;
  issue.events.push({ ts: now, type: 'status', text });
  store.save();
}
export function verify(req, res) {
  const issue = store.get('issues', req.params.id);
  if (!issue) throw httpError(404, 'Issue not found');
  setStatus(issue, 'Verified', 'Marked as verified by a human reviewer');
  res.json({ issue: view(issue) });
}
export function updateStatus(req, res) {
  const issue = store.get('issues', req.params.id);
  if (!issue) throw httpError(404, 'Issue not found');
  const { status } = req.body || {};
  if (!STATUSES.includes(status)) throw httpError(400, `status must be one of: ${STATUSES.join(', ')}`);
  setStatus(issue, status, status === 'Resolved' ? 'Marked as resolved by a human reviewer' : `Status changed to ${status}`);
  res.json({ issue: view(issue) });
}
