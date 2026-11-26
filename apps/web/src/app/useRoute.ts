import { useEffect, useState } from 'react';

export type RouteId = 'hem' | 'karta' | 'om' | 'logga-in' | 'skapa-konto' | 'integritet' | 'villkor' | 'okand';

export const ROUTES: Record<Exclude<RouteId, 'okand'>, string> = {
  hem: '#/',
  karta: '#/karta',
  om: '#/om',
  'logga-in': '#/logga-in',
  'skapa-konto': '#/skapa-konto',
  integritet: '#/integritet',
  villkor: '#/villkor',
};

const parse = (hash: string): RouteId => {
  const path = hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  if (path === '') return 'hem';
  return path in ROUTES ? (path as RouteId) : 'okand';
};

/** The page from the URL hash: no router library, no server rewrite rules. A route change starts at the top of the page. */
export function useRoute(): RouteId {
  const [route, setRoute] = useState(() => parse(location.hash));
  useEffect(() => {
    const onChange = () => { setRoute(parse(location.hash)); scrollTo(0, 0); };
    addEventListener('hashchange', onChange);
    return () => removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
