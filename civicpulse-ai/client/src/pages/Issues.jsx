import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../services/api.js';
import { useFetch } from '../hooks/useFetch.js';
import { useApp } from '../context.jsx';
import { EmptyState, ErrorBox, Loading } from '../components/States.jsx';
import { IssueRow } from '../components/Cards.jsx';

export default function Issues() {
  const { refresh } = useApp();
  const { data, error, loading } = useFetch(api.issues);
  const [q, setQ] = useState('');
  const [f, setF] = useState('all');
  const rows = useMemo(() => (data?.issues || []).filter((i) =>
    (f === 'all' || (f === 'high' ? ['high', 'critical'].includes(i.severity) : i.status === f)) &&
    `${i.title} ${i.location} ${i.category}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.reportCount - a.reportCount), [data, q, f]);
  return (
    <>
      <div className="page-head"><div><h1>Issues</h1><p>Reports grouped by the underlying problem. Groupings are AI-suggested until verified.</p></div></div>
      <div className="row" style={{ marginBottom: 14, justifyContent: 'space-between' }}>
        <div className="pill-row">{[['all', 'All'], ['high', 'High priority'], ['Needs Verification', 'Needs verification'], ['Verified', 'Verified'], ['Resolved', 'Resolved']].map(([k, l]) => <button key={k} className={`pill ${f === k ? 'on' : ''}`} onClick={() => setF(k)}>{l}</button>)}</div>
        <div className="search"><Search size={16} /><input className="input" placeholder="Search issues" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search issues" /></div>
      </div>
      <div className="card">
        {error ? <ErrorBox error={error} retry={refresh} /> : loading ? <Loading /> : rows.length === 0 ?
          <EmptyState title="No issues to show" text={data?.issues.length ? 'No issue matches this filter.' : 'Issues are created when reports are analyzed. Run the AI pipeline from the dashboard.'} /> :
          <div className="list">{rows.map((i) => <IssueRow key={i.id} issue={i} />)}</div>}
      </div>
    </>
  );
}
