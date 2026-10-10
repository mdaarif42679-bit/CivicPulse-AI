import { useNavigate } from 'react-router-dom';
import { ZONES, matchZone } from '../data/locations.js';

const COLORS = { low: '#6ea8c9', medium: '#e3b341', high: '#f08a4b', critical: '#ef5b5b' };

export default function CampusMap({ issues }) {
  const nav = useNavigate();
  const used = {};
  const pins = issues.filter((i) => i.status !== 'Resolved').map((i) => {
    const z = matchZone(i.location);
    if (!z) return null;
    const n = used[z.key] = (used[z.key] || 0) + 1;
    return { issue: i, x: z.x + (n - 1) * 26, y: z.y - (n - 1) * 8 };
  }).filter(Boolean);
  const top = [...pins].sort((a, b) => b.issue.reportCount - a.issue.reportCount)[0];
  return (
    <>
      <svg className="map" viewBox="0 0 560 310" role="img" aria-label="Schematic campus map with issue markers">
        <rect x="8" y="8" width="544" height="294" rx="8" fill="#08150f" stroke="#1a3128" />
        <path d="M40 215 H520 M280 215 V302 M280 215 V120 H110" stroke="#16291f" strokeWidth="10" fill="none" strokeLinecap="round" />
        {ZONES.map((z) => <text key={z.key} x={z.x} y={z.y + 30} textAnchor="middle">{z.label}</text>)}
        {pins.map(({ issue, x, y }) => {
          const r = 9 + Math.min(14, issue.reportCount * 2);
          const c = COLORS[issue.severity] || COLORS.low;
          return (
            <g key={issue.id} className="pin" onClick={() => nav(`/issues/${issue.id}`)} tabIndex={0} role="link" aria-label={`${issue.title}, ${issue.reportCount} reports`} onKeyDown={(e) => e.key === 'Enter' && nav(`/issues/${issue.id}`)}>
              {top && top.issue.id === issue.id && issue.reportCount > 1 && <circle className="pulse" cx={x} cy={y} r={r + 8} fill={c} opacity=".3" />}
              <circle className="core" cx={x} cy={y} r={r} fill={c} fillOpacity=".85" stroke="#06100d" strokeWidth="2" />
              <text x={x} y={y + 4} textAnchor="middle" style={{ fill: '#06100d', fontWeight: 700, fontSize: 12 }}>{issue.reportCount}</text>
              <title>{issue.title}</title>
            </g>
          );
        })}
      </svg>
      <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>Schematic layout, not GPS. Marker number = related reports.</p>
    </>
  );
}
