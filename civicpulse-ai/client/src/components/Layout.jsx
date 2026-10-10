import { NavLink, Outlet } from 'react-router-dom';
import { Activity, FileText, Layers, LayoutDashboard, PlusCircle } from 'lucide-react';
import { useApp } from '../context.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/issues', label: 'Issues', icon: Layers },
  { to: '/submit', label: 'Submit report', icon: PlusCircle },
];

function ModeIndicator() {
  const { status } = useApp();
  if (!status) return null;
  let color = '#e3b341', title = 'Demo Mode', sub = 'Simulated AI, no API calls';
  if (status.mode === 'gemini' && status.aiConnected) { color = '#34d399'; title = 'AI Connected'; sub = `Gemini (${status.model})`; }
  else if (status.mode === 'gemini') { color = '#ef5b5b'; title = 'AI unavailable'; sub = 'Gemini failed; fallback logic in use'; }
  else if (status.mode === 'offline') { color = '#ef5b5b'; title = 'Server offline'; sub = 'Start the backend on port 5050'; }
  return (
    <div className="mode" title={status.lastError || ''}>
      <span className="dot" style={{ background: color }} />
      <div><b>{title}</b><span className="muted d">{sub}</span></div>
    </div>
  );
}

export default function Layout() {
  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <Activity size={22} /> CivicPulse AI
        </div>
        <nav className="nav" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}><Icon size={17} /> {label}</NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <ModeIndicator />
          <span className="muted" style={{ fontSize: 11, padding: '0 4px' }}>AI-assisted decision support. Groupings are unverified until a person confirms them.</span>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  );
}
