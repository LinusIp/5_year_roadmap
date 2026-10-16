import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Soft clay (CLAY-STYLE.md): every colour comes from a token in src/index.css. A component that writes a hex value,
 * or reaches for a token of the old style (block and track colours, accent, surface, canvas, line), fails here.
 */
const SRC = join(__dirname, '..', '..', 'src');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.tsx$/.test(name) ? [path] : [];
  });
}

/** Comments may name a colour; only code counts. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

const components = files(SRC);

describe('colour tokens', () => {
  it('finds the components', () => {
    expect(components.length).toBeGreaterThan(40);
  });

  it('no component hard-codes a hex colour', () => {
    const found = components.flatMap((path) => {
      const hits = code(readFileSync(path, 'utf8')).match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
      return hits.map((hex) => relative(SRC, path) + ': ' + hex);
    });
    expect(found).toEqual([]);
  });

  it('no component uses a token of the old style', () => {
    // Also catches a name built in pieces, such as 'var(--track-' + id + ')'.
    const OLD = /--(?:track|block|accent|surface|canvas|line|behind|rail|stage2)(?:-|\b)[\w-]*/g;
    const found = components.flatMap((path) => (code(readFileSync(path, 'utf8')).match(OLD) ?? []).map((t) => relative(SRC, path) + ': ' + t));
    expect(found).toEqual([]);
  });

  it('index.css defines every clay token for both themes', () => {
    const css = readFileSync(join(SRC, 'index.css'), 'utf8');
    const TOKENS = ['bg', 'hi', 'lo', 'edge', 'ink', 'ink2', 'ink3', 'blue', 'blue-deep', 'blue-soft', 'ice', 'ice-deep', 'ice-soft', 'on-blue', 'on-ice', 'deco', 'dash', 'ramp-0', 'ramp-4'];
    for (const token of TOKENS) expect(css.match(new RegExp('--' + token + ':', 'g'))?.length ?? 0, token).toBeGreaterThanOrEqual(2);
    expect(css).not.toMatch(/--(?:track|block)-[a-z]/);
  });
});
