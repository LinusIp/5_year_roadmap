/**
 * What `check:links` does with a link before it requests it. Pure; the checker and its tests use it.
 *
 * Some servers refuse a script what they serve a browser: a 403 or 404 for an unknown client, a redirect loop, a
 * certificate chain Node's runtime rejects, a connection that times out from a CI runner. A link opened by hand and
 * found fine is marked `linkCheck: manual-ok` in the data, and its address is listed here so later rows on the same
 * pages stay quiet too; neither is requested. A failure on a host known to turn scripts away is one to open by hand,
 * never a broken link. Nothing here edits the data.
 */

/**
 * Opened by hand on 2026-10-20 and found fine, after the 3,386-row import's check reported them (ATLAS-LIBRARY): the
 * three Berkeley Lab roofline pages, the NCFMF films, MIT OCW 2.008 (2004), Orfanidis's Electromagnetic Waves and
 * Antennas, the libp2p docs, Penn State's STAT 414 and Andrew Childs's quantum algorithms notes. An address prefix,
 * without scheme or `www.`.
 */
export const MANUAL_OK: readonly string[] = [
  'crd.lbl.gov/',
  'web.mit.edu/hml/ncfmf.html',
  'ocw.mit.edu/courses/2-008-design-and-manufacturing-ii-spring-2004',
  'ece.rutgers.edu/~orfanidi/ewa',
  'docs.libp2p.io/',
  'online.stat.psu.edu/stat414',
  'cs.umd.edu/~amchilds/qa',
  // NVIDIA's CUB documentation (ATLAS-STAR-RATING): the audit's canonical URL, verified live; the page's own canonical
  // link points to it. The checker's 404 is a false positive.
  'nvidia.github.io/cccl/cub/index.html',
];

/** Hosts whose failures are the script's, not the page's: tensorflow.org loops a script's redirects, Greg Wooledge's
 * wiki answers it 502, MIT CSAIL's servers time out from a CI runner. */
export const SCRIPT_SIDE: readonly string[] = ['tensorflow.org', 'mywiki.wooledge.org', 'pdos.csail.mit.edu', 'people.csail.mit.edu'];

/** `skip`: opened by hand, not requested; `script-side`: requested, but a failure is one to open by hand; `check`. */
export type LinkPolicy = 'skip' | 'script-side' | 'check';

/** An address as the lists compare it: no scheme, no `www.`, lowercase host. */
function bare(url: string): string {
  const rest = url.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  const slash = rest.indexOf('/');
  return slash < 0 ? rest.toLowerCase() + '/' : rest.slice(0, slash).toLowerCase() + rest.slice(slash);
}

export function linkPolicy(url: string, linkCheck?: string | undefined): LinkPolicy {
  const address = bare(url);
  if (linkCheck === 'manual-ok' || MANUAL_OK.some((prefix) => address.startsWith(prefix))) return 'skip';
  const host = address.slice(0, address.indexOf('/'));
  if (SCRIPT_SIDE.some((h) => host === h || host.endsWith('.' + h))) return 'script-side';
  return 'check';
}
