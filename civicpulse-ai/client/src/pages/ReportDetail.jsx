import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, GitMerge, Layers, Search, Sparkles } from 'lucide-react';
import { api } from '../services/api.js';
import { useFetch } from '../hooks/useFetch.js';
import { useApp } from '../context.jsx';
import { ErrorBox, Loading } from '../components/States.jsx';
import { AiTag, SeverityBadge, StatusBadge, UserTag } from '../components/Badges.jsx';
import { fmtDateTime, pct } from '../utils/format.js';

export default function ReportDetail() {
  const { id } = useParams();
  const { refresh, toast } = useApp();
  const { data, error, loading, reload } = useFetch(() => api.report(id), [id]);
  const [related, setRelated] = useState(null);
  const [busy, setBusy] = useState('');
  if (error) return <ErrorBox error={error} retry={reload} />;
  if (loading || !data) return <Loading rows={4} />;
  const { report: r, issue } = data;
  const a = r.aiAnalysis;
  const run = async (key, fn, msg) => { setBusy(key); try { const out = await fn(); if (msg) toast(msg); return out; } catch (e) { toast(e.message, 'err'); } finally { setBusy(''); } };

  return (
    <>
      <Link to="/reports" className="muted row" style={{ marginBottom: 12 }}><ArrowLeft size={15} /> All reports</Link>
      <div className="page-head"><div><h1>Report details</h1><div className="row" style={{ marginTop: 8 }}><StatusBadge status={r.status} /><span className="muted">{fmtDateTime(r.timestamp)}</span></div></div>
        {issue && <Link className="btn primary" to={`/issues/${issue.id}`}><Layers size={16} /> View related issue <ArrowRight size={14} /></Link>}</div>
      <div className="split">
        <div className="grid">
          <section className="user-panel">
            <div className="card-head"><h2>Original report</h2><UserTag /></div>
            <p className="wrap" style={{ fontSize: 16 }}>{r.description || '(no text; voice report)'}</p>
            <dl className="kv" style={{ margin: '14px 0 0' }}>
              <dt>Location given</dt><dd>{r.location || 'Not provided'}</dd>
              <dt>Category given</dt><dd>{r.category || 'Not provided (auto-detect)'}</dd>
            </dl>
            {r.imageUrl && <img className="photo" style={{ marginTop: 14 }} src={r.imageUrl} alt="Photo attached to the report" />}
            {r.audioUrl && <audio controls src={r.audioUrl} style={{ width: '100%', marginTop: 14 }} />}
          </section>
          <section className="ai-panel">
            <div className="card-head"><h2>AI extracted information</h2><AiTag /></div>
            {!a ? <p className="muted">Not analyzed yet. Use "Analyze report".</p> : <>
              <dl className="kv" style={{ margin: 0 }}>
                <dt>Title</dt><dd>{a.title}</dd><dt>Category</dt><dd>{a.category}</dd>
                <dt>Severity</dt><dd><SeverityBadge level={a.severity} /></dd>
                <dt>Location</dt><dd>{a.location || 'Not identified'}</dd>
                <dt>Affected area</dt><dd>{a.affectedArea || '-'}</dd>
                <dt>Key entities</dt><dd><div className="chips">{a.keyEntities.length ? a.keyEntities.map((k) => <span className="chip" key={k}>{k}</span>) : '-'}</div></dd>
                <dt>Evidence noted</dt><dd><ul style={{ margin: 0, paddingLeft: 18 }}>{a.evidence.map((e) => <li key={e}>{e}</li>)}</ul></dd>
                {a.transcript && <><dt>Transcript</dt><dd>{a.transcript}</dd></>}
                <dt>AI confidence</dt><dd><div className="row"><div className="bar" style={{ width: 120 }}><i style={{ width: pct(a.confidence) }} /></div>{pct(a.confidence)}</div></dd>
                <dt>Produced by</dt><dd>{a.source === 'gemini' ? 'Gemini' : a.source === 'demo-rules' ? 'Demo Mode rules (no AI call)' : 'Fallback rules (Gemini unavailable)'}</dd>
              </dl>
              {a.note && <p className="muted" style={{ marginTop: 10 }}>{a.note}</p>}</>}
          </section>
        </div>

        <div className="grid">
          <section className="card">
            <div className="card-head"><h2>Processing</h2></div>
            <div className="grid" style={{ gap: 10 }}>
              <button className="btn" disabled={!!busy} onClick={async () => { await run('a', () => api.analyze(r.id), 'Report analyzed'); refresh(); }}><Sparkles size={16} /> {a ? 'Re-analyze report' : 'Analyze report'}</button>
              <button className="btn" disabled={!!busy || !a} onClick={async () => { const out = await run('f', () => api.related(r.id)); if (out) setRelated(out); }}><Search size={16} /> Find related reports</button>
              <button className="btn primary" disabled={!!busy || !a || !!r.issueId} onClick={async () => { const out = await run('c', () => api.cluster(r.id), 'Issue ready'); if (out) refresh(); }}><GitMerge size={16} /> {r.issueId ? 'Already in an issue' : 'Create or join issue'}</button>
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>Each step calls the backend. Matching uses {a?.source === 'gemini' ? 'Gemini embeddings' : 'Demo Mode concept vectors'} plus location similarity.</p>
          </section>
          {related && (
            <section className="card">
              <div className="card-head"><h2>Similar reports</h2><span className="muted">threshold {related.threshold}</span></div>
              {related.related.length === 0 ? <p className="muted">No other analyzed reports to compare.</p> : related.related.slice(0, 8).map((x) => (
                <Link key={x.reportId} to={`/reports/${x.reportId}`} style={{ display: 'block', padding: '10px 0', borderTop: '1px solid var(--line)' }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}><span className="chip" style={x.related ? { color: 'var(--accent)', borderColor: '#2d6b55' } : {}}>{x.related ? 'Related' : 'Not related'}</span><span className="mono">{x.score.toFixed(2)}</span></div>
                  <div className="clamp wrap" style={{ marginTop: 6 }}>{x.report.description}</div>
                  <div className="bar" style={{ marginTop: 6 }}><i style={{ width: `${Math.round(x.score * 100)}%`, background: x.related ? 'var(--accent)' : '#4b5f57' }} /></div>
                </Link>))}
            </section>)}
        </div>
      </div>
    </>
  );
}
