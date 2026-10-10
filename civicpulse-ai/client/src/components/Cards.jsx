import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, MapPin, FileText } from 'lucide-react';
import { SeverityBadge, StatusBadge } from './Badges.jsx';
import { pluralize, timeAgo } from '../utils/format.js';

export function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="card stat">
      <div className="l"><Icon size={15} style={{ color: tone || 'var(--muted)' }} /> {label}</div>
      <div className="n mono">{value ?? '-'}</div>
    </div>
  );
}

export function IssueRow({ issue }) {
  const nav = useNavigate();
  return (
    <div className="item item-issue" role="link" tabIndex={0} onClick={() => nav(`/issues/${issue.id}`)} onKeyDown={(e) => e.key === 'Enter' && nav(`/issues/${issue.id}`)}>
      <div>
        <div className="t">{issue.title}</div>
        <div className="s row" style={{ gap: 12 }}>
          <span className="row" style={{ gap: 4 }}><MapPin size={13} /> {issue.location}</span>
          <span className="row" style={{ gap: 4 }}><FileText size={13} /> {pluralize(issue.reportCount, 'report')}</span>
          <span className="row" style={{ gap: 4 }}><ImageIcon size={13} /> {pluralize(issue.evidenceCount, 'file')}</span>
        </div>
      </div>
      <SeverityBadge level={issue.severity} />
      <StatusBadge status={issue.status} />
    </div>
  );
}

export function ReportRow({ report }) {
  const nav = useNavigate();
  return (
    <div className="item item-report" role="link" tabIndex={0} onClick={() => nav(`/reports/${report.id}`)} onKeyDown={(e) => e.key === 'Enter' && nav(`/reports/${report.id}`)}>
      <div>
        <div className="t clamp wrap">{report.description || '(voice report)'}</div>
        <div className="s">{report.aiAnalysis?.location || report.location || 'No location'} · {timeAgo(report.timestamp)}{report.imageUrl ? ' · photo' : ''}</div>
      </div>
      {report.aiAnalysis ? <span className="chip">{report.aiAnalysis.category}</span> : <span />}
      <StatusBadge status={report.status} />
    </div>
  );
}
