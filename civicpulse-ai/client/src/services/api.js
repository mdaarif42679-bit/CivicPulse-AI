async function req(path, opts) {
  let res;
  try { res = await fetch('/api' + path, opts); }
  catch { throw new Error('Cannot reach the server. Is it running on port 5050?'); }
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON body */ }
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}
const post = (body) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });

export const api = {
  status: () => req('/status'),
  stats: () => req('/stats'),
  reports: () => req('/reports'),
  report: (id) => req(`/reports/${id}`),
  related: (id) => req(`/reports/${id}/related`),
  analyze: (reportId) => req('/analyze', post({ reportId })),
  cluster: (reportId) => req('/cluster', post({ reportId })),
  submit: (formData) => req('/reports', { method: 'POST', body: formData }),
  issues: () => req('/issues'),
  issue: (id) => req(`/issues/${id}`),
  verify: (id) => req(`/issues/${id}/verify`, post()),
  setStatus: (id, status) => req(`/issues/${id}/status`, post({ status })),
  loadDemo: () => req('/demo/load', post()),
  resetData: () => req('/demo/reset', post()),
};
