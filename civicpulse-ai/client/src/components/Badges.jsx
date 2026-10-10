import { CheckCircle2, Sparkles, User } from 'lucide-react';

export const SeverityBadge = ({ level }) => <span className={`badge sev-${level || 'low'}`}>{level || 'unknown'}</span>;

export function StatusBadge({ status }) {
  const cls = { 'Needs Verification': 'st-needs', Verified: 'st-ver', Resolved: 'st-res', received: 'st-rec', analyzed: 'st-ana', clustered: 'st-ver' }[status] || 'st-res';
  const label = { received: 'Awaiting analysis', analyzed: 'Analyzed', clustered: 'Grouped' }[status] || status;
  return <span className={`badge ${cls}`} style={{ textTransform: 'none' }}>{status === 'Verified' && <CheckCircle2 size={13} />}{label}</span>;
}
export const AiTag = ({ children = 'AI-generated' }) => <span className="tag ai"><Sparkles size={12} /> {children}</span>;
export const UserTag = ({ children = 'User-submitted' }) => <span className="tag user"><User size={12} /> {children}</span>;
