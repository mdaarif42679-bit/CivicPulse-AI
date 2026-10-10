export function timeAgo(iso) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}
export const fmtDateTime = (iso) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const pct = (n) => `${Math.round((n || 0) * 100)}%`;
export const sevRank = { low: 0, medium: 1, high: 2, critical: 3 };
export const pluralize = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
