import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './services/api.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState(null);
  const [toasts, setToasts] = useState([]);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const toast = useCallback((text, type = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, text, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  useEffect(() => { api.status().then(setStatus).catch(() => setStatus({ mode: 'offline' })); }, [version]);
  const value = useMemo(() => ({ version, refresh, status, toast }), [version, refresh, status, toast]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.type}`}>{t.text}</div>)}
      </div>
    </Ctx.Provider>
  );
}
