import { useEffect, useState } from 'react';

export type RouteId = 'hem' | 'karta' | 'om' | 'konto' | 'plus' | 'okand';

export const ROUTES: Record<Exclude<RouteId, 'okand'>, string> = {
  hem: '#/',
  karta: '#/karta',
  om: '#/om',
  konto: '#/konto',
  plus: '#/plus',
};

/** A section of a page, as `#/om/kontakt`: the page is `om`, the section the element with id `kontakt`. */
export const section = (route: Exclude<RouteId, 'okand'>, id: string) => `${ROUTES[route]}/${id}`;

const parse = (hash: string): RouteId => {
  const path = (hash.replace(/^#\/?/, '').split('?')[0] ?? '').split('/')[0] ?? '';
  if (path === '') return 'hem';
  return path in ROUTES ? (path as RouteId) : 'okand';
};

/** After a render, scroll to the section named in the hash, if any. */
function scrollToSection() {
  const id = location.hash.split('?')[0]?.split('/')[2];
  if (id) requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
}

/** The page from the URL hash: no router library, no server rewrite rules. A route change starts at the top of the page. */
export function useRoute(): RouteId {
  const [route, setRoute] = useState(() => parse(location.hash));
  useEffect(() => {
    scrollToSection();
    const onChange = () => { setRoute(parse(location.hash)); scrollTo(0, 0); scrollToSection(); };
    addEventListener('hashchange', onChange);
    return () => removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
