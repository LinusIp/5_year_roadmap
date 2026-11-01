import { describe, expect, it } from 'vitest';
import { linkPolicy, MANUAL_OK } from '../../scripts/lib/link-policy.ts';
import { loadSeedOrThrow } from '../../scripts/lib/load-seed.ts';

describe('the link checker\'s policy (ATLAS-LIBRARY, after the 3,386-row import)', () => {
  it('leaves alone a link opened by hand: marked manual-ok, or on a listed address', () => {
    expect(linkPolicy('https://example.org/page', 'manual-ok')).toBe('skip');
    expect(linkPolicy('https://crd.lbl.gov/assets/Uploads/ECP21-Roofline-2-NVIDIA.pdf')).toBe('skip');
    expect(linkPolicy('https://docs.libp2p.io/')).toBe('skip');
    expect(linkPolicy('https://www.cs.umd.edu/~amchilds/qa/')).toBe('skip');
    // Only the listed page of a large host: the rest of MIT OCW is still checked.
    expect(linkPolicy('https://ocw.mit.edu/courses/2-008-design-and-manufacturing-ii-spring-2004/')).toBe('skip');
    expect(linkPolicy('https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/')).toBe('check');
  });

  it('counts a failure on a host that turns scripts away as one to open by hand', () => {
    expect(linkPolicy('https://www.tensorflow.org/guide/data')).toBe('script-side');
    expect(linkPolicy('https://mywiki.wooledge.org/BashGuide')).toBe('script-side');
    expect(linkPolicy('https://pdos.csail.mit.edu/6.824/labs/lab-raft1.html')).toBe('script-side');
    expect(linkPolicy('https://people.csail.mit.edu/nickolai/papers/gilad-algorand.pdf')).toBe('script-side');
    expect(linkPolicy('https://notatensorflow.org/')).toBe('check');
  });

  it('marks in the data every link on a listed address, and lists every link the data marks', () => {
    const seed = loadSeedOrThrow();
    const linked = [...seed.resources, ...seed.papers].filter((r) => r.url);
    const listed = linked.filter((r) => MANUAL_OK.some((prefix) => linkPolicy(r.url!) === 'skip' && r.url!.includes(prefix)));
    // Nine after the 3,386-row import; the "four stars and up" pass (7,640 rows) removed the 2.008, libp2p and STAT 414
    // rows and one of the three roofline pages, and their addresses stay listed in case a row comes back.
    expect(listed.length).toBe(5);
    for (const r of listed) expect(r.linkCheck, r.id).toBe('manual-ok');
    for (const r of linked.filter((r) => r.linkCheck === 'manual-ok')) expect(linkPolicy(r.url!), r.id).toBe('skip');
  });
});
