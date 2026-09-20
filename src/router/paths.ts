/**
 * Hash routing, pure part. Atlas is served as static files from GitHub Pages, where a path like
 * /roadmap would 404 on reload; "#/roadmap" always works, offline included.
 */

export interface RouteLocation {
  /** Always starts with "/", never ends with one (except the root). */
  path: string;
  query: URLSearchParams;
}

export function parseLocation(hash: string): RouteLocation {
  const raw = hash.replace(/^#/, '');
  const q = raw.indexOf('?');
  let path = q === -1 ? raw : raw.slice(0, q);
  if (!path.startsWith('/')) path = '/' + path;
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return { path: path || '/', query: new URLSearchParams(q === -1 ? '' : raw.slice(q + 1)) };
}

/** matchPath('/library/:id', '/library/mit-18-06') -> { id: 'mit-18-06' }. Returns null when it does not match. */
export function matchPath(pattern: string, path: string): Record<string, string> | null {
  const pp = pattern.split('/').filter(Boolean);
  const ap = path.split('/').filter(Boolean);
  if (pp.length !== ap.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pp.length; i++) {
    const p = pp[i]!;
    const a = ap[i]!;
    if (p.startsWith(':')) {
      try {
        params[p.slice(1)] = decodeURIComponent(a);
      } catch {
        return null;
      }
    } else if (p !== a) {
      return null;
    }
  }
  return params;
}

/** buildPath('/activity', { year: 2027, track: undefined }) -> '/activity?year=2027' */
export function buildPath(path: string, query?: Record<string, string | number | boolean | null | undefined>): string {
  if (!query) return path;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '' || v === false) continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? path + '?' + s : path;
}

/** True when `path` is `base` or lies beneath it; used for the active state of nav links. */
export function isWithin(base: string, path: string): boolean {
  if (base === '/') return path === '/';
  return path === base || path.startsWith(base + '/');
}
