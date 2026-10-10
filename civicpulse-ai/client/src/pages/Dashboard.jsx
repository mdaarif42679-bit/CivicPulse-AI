import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, Database, FileText, GitMerge, Layers, Play, Trash2 } from 'lucide-react';
import { api } from '../services/api.js';
import { useFetch } from '../hooks/useFetch.js';
import { useApp } from '../context.jsx';
import { ErrorBox, EmptyState, Loading } from '../components/States.jsx';
import { IssueRow, ReportRow, StatCard } from '../components/Cards.jsx';
import { AiTag, SeverityBadge } from '../components/Badges.jsx';
import CampusMap from '../components/CampusMap.jsx';
import PipelineModal from '../components/PipelineModal.jsx';
import { pluralize, timeAgo } from '../utils/format.js';

export default function Dashboard() {
  const { refresh, toast } = useApp();
  const nav = useNavigate();
  const stats = useFetch(api.stats);
  const issues = useFetch(api.issues);
  const reports = useFetch(api.reports);
  const [busy, setBusy] = useState(false);
  const [pipeline, setPipeline] = useState(null);

  const act = async (fn, okMsg) => {
    setBusy(true);
    try { await fn(); toast(okMsg); refresh(); } catch (e) { toast(e.message, 'err'); } finally { setBusy(false); }
  };
  const loading = stats.loading || issues.loading || reports.loading;
  const error = stats.error || issues.error || reports.error;
  const s = stats.data, list = issues.data?.issues || [], reps = reports.data?.reports || [];
  const pending = reps.filter((r) => !r.issueId);
  const featured = [...list].filter((i) => i.reportCount > 1 && i.status !== 'Resolved').sort((a, b) => b.reportCount - a.reportCount)[0];
  const featuredReports = featured ? reps.filter((r) => r.issueId === featured.id).sort((a, b) => a.timestamp.localeCompare(b.timestamp)) : [];
  const cats = Object.entries(s?.categories || {}).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...cats.map((c) => c[1]));

  return (
    <>
      <div className="page-head">
        <div><h1>Operations overview</h1><p>Scattered reports, grouped into issues with their evidence.</p></div>
        <div className="row">
          <button className="btn" disabled={busy} onClick={() => act(api.loadDemo, 'Demo data loaded. Run the AI pipeline to analyze it.')}><Database size={16} /> Load demo data</button>
          {pending.length > 0 && <button className="btn primary" disabled={busy} onClick={() => setPipeline(pending)}><Play size={16} /> Run AI pipeline ({pending.length})</button>}
          {reps.length > 0 && <button className="btn ghost danger" disabled={busy} onClick={() => confirm('Delete all reports and issues?') && act(api.resetData, 'All data cleared.')}><Trash2 size={16} /> Clear</button>}
        </div>
      </div>

      {error && <ErrorBox error={error} retry={refresh} />}
      {loading && !s && <Loading rows={5} />}

      {s && reps.length === 0 && (
        <div className="card"><EmptyState title="No reports yet" text="Load the waterlogging demo, or submit your own report." action={
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn primary" onClick={() => act(api.loadDemo, 'Demo data loaded.')}><Database size={16} /> Load demo data</button>
            <Link className="btn" to="/submit">Submit a report</Link>
          </div>} /></div>
      )}

      {s && reps.length > 0 && (
        <div className="grid">
          {pending.length > 0 && (
            <div className="notice warn">
              <AlertTriangle size={18} style={{ flex: 'none', marginTop: 2 }} />
              <div style={{ flex: 1 }}><b>{pluralize(pending.length, 'report')} received, not yet analyzed.</b> They are listed separately below. Run the pipeline to extract details, detect related reports and group them into issues.</div>
              <button className="btn sm primary" onClick={() => setPipeline(pending)}><Play size={14} /> Run AI pipeline</button>
            </div>
          )}

          <div className="grid g5">
            <StatCard icon={FileText} label="Total reports" value={s.totalReports} />
            <StatCard icon={Layers} label="Active issues" value={s.activeIssues} />
            <StatCard icon={AlertTriangle} label="High priority" value={s.highPriority} tone="#f08a4b" />
            <StatCard icon={CheckCircle2} label="Resolved" value={s.resolvedIssues} tone="#34d399" />
            <StatCard icon={GitMerge} label="Awaiting analysis" value={s.pendingReports} tone="#e3b341" />
          </div>

          {featured && (
            <section aria-label="Consolidated issue">
              <div className="row" style={{ marginBottom: 8 }}><GitMerge size={16} color="#34d399" /><h2>Related reports detected</h2><AiTag>AI-grouped, unverified</AiTag></div>
              <div className="moment">
                <div className="src">
                  <div className="muted" style={{ marginBottom: 6 }}>{pluralize(featuredReports.length, 'separate report')}</div>
                  {featuredReports.slice(0, 4).map((r) => <div className="snip clamp wrap" key={r.id}>{r.description} <span className="muted">· {timeAgo(r.timestamp)}</span></div>)}
                  {featuredReports.length > 4 && <div className="snip muted">+ {featuredReports.length - 4} more</div>}
                </div>
                <div className="join"><ArrowRight size={22} /></div>
                <div className="out">
                  <div className="muted">Consolidated issue</div>
                  <h2 style={{ fontSize: 22 }}>{featured.title}</h2>
                  <div className="nums">
                    <div><b>{featured.reportCount}</b><span>reports</span></div>
                    <div><b>{featured.evidenceCount}</b><span>evidence files</span></div>
                    <div><b>{Math.round(featured.confidence * 100)}%</b><span>grouping confidence</span></div>
                  </div>
                  <div className="row"><SeverityBadge level={featured.severity} /><span className="muted">{featured.location} · {featured.status}</span></div>
                  <div><button className="btn primary" onClick={() => nav(`/issues/${featured.id}`)}>View consolidated issue <ArrowRight size={14} /></button></div>
                </div>
              </div>
            </section>
          )}

          <div className="split">
            <div className="card">
              <div className="card-head"><h2>Issues</h2><Link className="muted" to="/issues">View all</Link></div>
              {list.length === 0 ? <EmptyState title="No issues yet" text="Issues appear after reports are analyzed and grouped." /> :
                <div className="list">{[...list].sort((a, b) => b.reportCount - a.reportCount).slice(0, 6).map((i) => <IssueRow key={i.id} issue={i} />)}</div>}
            </div>
            <div className="card">
              <div className="card-head"><h2>Campus map</h2></div>
              <CampusMap issues={list} />
            </div>
          </div>

          <div className="split" style={{ gridTemplateColumns: '1fr 1.5fr' }}>
            <div className="card">
              <div className="card-head"><h2>Active issues by category</h2></div>
              {cats.length === 0 ? <p className="muted">No grouped issues yet.</p> : cats.map(([c, n]) => (
                <div key={c} style={{ marginBottom: 12 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}><span>{c}</span><span className="mono muted">{n}</span></div>
                  <div className="bar"><i style={{ width: `${(n / maxCat) * 100}%` }} /></div>
                </div>))}
            </div>
            <div className="card">
              <div className="card-head"><h2>Recent reports</h2><Link className="muted" to="/reports">View all</Link></div>
              <div className="list">{reps.slice(0, 6).map((r) => <ReportRow key={r.id} report={r} />)}</div>
            </div>
          </div>
        </div>
      )}
      {pipeline && <PipelineModal reports={pipeline} onDone={refresh} onClose={() => { setPipeline(null); refresh(); }} />}
    </>
  );
}
