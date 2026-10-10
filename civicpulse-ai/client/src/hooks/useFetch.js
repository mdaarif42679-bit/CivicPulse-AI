import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context.jsx';

/** Loads data on mount and whenever the global refresh counter changes. */
export function useFetch(fn, deps = []) {
  const { version } = useApp();
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const run = useCallback(() => {
    let live = true;
    setState((s) => ({ ...s, loading: s.data === null, error: null }));
    fn().then((data) => live && setState({ data, error: null, loading: false }))
      .catch((error) => live && setState({ data: null, error, loading: false }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...deps]);
  useEffect(() => run(), [run]);
  return { ...state, reload: run };
}
