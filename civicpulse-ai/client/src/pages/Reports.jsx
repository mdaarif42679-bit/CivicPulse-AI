import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '../services/api.js';
import { useFetch } from '../hooks/useFetch.js';
import { useApp } from '../context.jsx';
import { EmptyState, ErrorBox, Loading } from '../components/States.jsx';
import { ReportRow } from '../components/Cards.jsx';

export default function Reports() {
  const { refresh } = useApp();
  const { data, error, loading } = useFetch(api.reports);
  const [q, setQ] = useState('');
  const [f, setF] = useState('all');
  const rows = useMemo(() => (data?.reports || []).filter((r) =>
    (f === 'all' || (f === 'pending' ? !r.issueId : !!r.issueId)) &&
    `${r.description} ${r.location} ${r.aiAnalysis?.title || ''}`.toLowerCase().includes(q.toLowerCase())), [data, q, f]);
  return (
    <>
      <div className="page-head">
        <div><h1>Reports</h1><p>Every submitted report, before and after AI grouping.</p></div>
        <Link className="btn primary" to="/submit">Submit report</Link>
      </div>
      <div className="row" style={{ marginBottom: 14, justifyContent: 'space-between' }}>
        <div className="pill-row">{[['all', 'All'], ['pending', 'Awaiting grouping'], ['grouped', 'Grouped']].map(([k, l]) => <button key={k} className={`pill ${f === k ? 'on' : ''}`} onClick={() => setF(k)}>{l}</button>)}</div>
        <div className="search"><Search size={16} /><input className="input" placeholder="Search reports" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search reports" /></div>
      </div>
      <div className="card">
        {error ? <ErrorBox error={error} retry={refresh} /> : loading ? <Loading /> : rows.length === 0 ?
          <EmptyState title="No reports found" text={data?.reports.length ? 'Try a different search or filter.' : 'Load demo data from the dashboard or submit a report.'} /> :
          <div className="list">{rows.map((r) => <ReportRow key={r.id} report={r} />)}</div>}
      </div>
    </>
  );
}
