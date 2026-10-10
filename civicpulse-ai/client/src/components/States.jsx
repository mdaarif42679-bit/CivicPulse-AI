import { AlertTriangle, Inbox } from 'lucide-react';

export const Loading = ({ rows = 4 }) => (
  <div className="grid" aria-busy="true" aria-label="Loading">
    {Array.from({ length: rows }, (_, i) => <div key={i} className="skel" style={{ height: 54 }} />)}
  </div>
);
export const EmptyState = ({ title, text, action }) => (
  <div className="empty"><Inbox size={28} /><h3>{title}</h3><p>{text}</p>{action && <div style={{ marginTop: 14 }}>{action}</div>}</div>
);
export const ErrorBox = ({ error, retry }) => (
  <div className="notice err" role="alert">
    <AlertTriangle size={18} style={{ flex: 'none', marginTop: 2 }} />
    <div style={{ flex: 1 }}><b>Could not load data.</b><div>{error?.message || String(error)}</div></div>
    {retry && <button className="btn sm" onClick={retry}>Try again</button>}
  </div>
);
