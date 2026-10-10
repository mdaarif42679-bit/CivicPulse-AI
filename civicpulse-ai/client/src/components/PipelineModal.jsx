import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle, GitMerge, Loader2, X } from 'lucide-react';
import { api } from '../services/api.js';
import { SeverityBadge } from './Badges.jsx';

const STEPS = ['Analyze', 'Find related', 'Group'];
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

export default function PipelineModal({ reports, onClose, onDone }) {
  const queue = useRef([...reports].sort((a, b) => a.timestamp.localeCompare(b.timestamp)));
  const [rows, setRows] = useState(() => queue.current.map((r) => ({ id: r.id, text: r.description, step: -1, note: '', state: 'wait' })));
  const [running, setRunning] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const started = useRef(false);
  const patch = (id, p) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

  useEffect(() => {
    // React StrictMode runs effects twice in dev; run the pipeline only once.
    if (started.current) return undefined;
    started.current = true;
    const cancelled = false;
    (async () => {
      const issueIds = new Set(); let joined = 0;
      try {
        for (const rep of queue.current) {
          if (cancelled) return;
          patch(rep.id, { state: 'run', step: 0 });
          await api.analyze(rep.id); await pause(180);
          patch(rep.id, { step: 1 });
          const rel = await api.related(rep.id);
          const matches = rel.related.filter((x) => x.related).length; await pause(180);
          patch(rep.id, { step: 2 });
          const res = await api.cluster(rep.id);
          issueIds.add(res.issue.id); if (!res.created) joined++;
          patch(rep.id, { state: 'done', step: 3, note: res.created ? `New issue: ${res.issue.title}` : `Matched ${matches} related report${matches === 1 ? '' : 's'} and joined "${res.issue.title}" (similarity ${res.score?.toFixed(2)})` });
          await pause(120);
        }
        const { issues } = await api.issues();
        const mine = issues.filter((i) => issueIds.has(i.id)).sort((a, b) => b.reportCount - a.reportCount);
        if (!cancelled) setResult({ joined, top: mine[0], total: queue.current.length });
      } catch (e) { if (!cancelled) setError(e); }
      finally { if (!cancelled) setRunning(false); onDone?.(); }
    })();
    return undefined;
    // eslint-disable-next-line
  }, []);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="AI pipeline">
      <div className="modal">
        <div className="card-head">
          <h2>{running ? 'Running AI pipeline' : 'Pipeline finished'}</h2>
          <button className="btn sm ghost" onClick={onClose} disabled={running} aria-label="Close"><X size={16} /></button>
        </div>
        <p className="muted" style={{ marginBottom: 12 }}>Each report is analyzed, compared with the others, and grouped into an issue. Steps: {STEPS.join(' > ')}.</p>
        <div style={{ maxHeight: 280, overflow: 'auto' }}>
          {rows.map((r) => (
            <div className="step" key={r.id}>
              {r.state === 'done' ? <CheckCircle2 size={16} color="#34d399" /> : r.state === 'run' ? <Loader2 size={16} className="spin" color="#34d399" /> : <Circle size={16} color="#25463a" />}
              <div><div className="clamp wrap">{r.text}</div>{r.note && <div className="muted">{r.note}</div>}</div>
              <span className="muted">{r.state === 'run' ? STEPS[r.step] : r.state === 'done' ? 'Done' : ''}</span>
            </div>
          ))}
        </div>
        {error && <div className="notice err" style={{ marginTop: 14 }} role="alert">Pipeline stopped: {error.message}</div>}
        {result?.top && (
          <div className="notice ok" style={{ marginTop: 16, flexDirection: 'column' }}>
            <div className="row"><GitMerge size={16} color="#34d399" /><b>Related reports detected: {result.joined} reports were grouped with earlier ones</b></div>
            <div className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
              <div><div style={{ fontWeight: 600 }}>{result.top.title}</div><div className="muted">{result.top.reportCount} reports · {result.top.evidenceCount} evidence files · AI-grouped, needs verification</div></div>
              <div className="row"><SeverityBadge level={result.top.severity} /><Link className="btn primary sm" to={`/issues/${result.top.id}`} onClick={onClose}>View consolidated issue <ArrowRight size={14} /></Link></div>
            </div>
          </div>
        )}
        {!running && <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}><button className="btn" onClick={onClose}>Close</button></div>}
      </div>
    </div>
  );
}
