import { describe, expect, it } from 'vitest';
import { buildPath, isWithin, matchPath, parseLocation } from '../../src/router/paths.ts';

describe('hash routing', () => {
  it('parses an empty hash as the root', () => {
    expect(parseLocation('').path).toBe('/');
    expect(parseLocation('#').path).toBe('/');
    expect(parseLocation('#/').path).toBe('/');
  });

  it('normalises the path and keeps the query', () => {
    const loc = parseLocation('#/activity/?year=2027&track=ai');
    expect(loc.path).toBe('/activity');
    expect(loc.query.get('year')).toBe('2027');
    expect(loc.query.get('track')).toBe('ai');
    expect(parseLocation('#roadmap').path).toBe('/roadmap');
  });

  it('matches patterns and decodes params', () => {
    expect(matchPath('/library/:id', '/library/mit-18-06')).toEqual({ id: 'mit-18-06' });
    expect(matchPath('/library/:id', '/library/a%20b')).toEqual({ id: 'a b' });
    expect(matchPath('/', '/')).toEqual({});
    expect(matchPath('/library/:id', '/library')).toBeNull();
    expect(matchPath('/library', '/papers')).toBeNull();
    expect(matchPath('/library/:id', '/library/%E0%A4%A')).toBeNull();
  });

  it('builds paths, dropping empty query values', () => {
    expect(buildPath('/activity', { year: 2027, track: undefined, all: false, q: '' })).toBe('/activity?year=2027');
    expect(buildPath('/activity')).toBe('/activity');
    expect(buildPath('/library', { q: 'linear algebra' })).toBe('/library?q=linear+algebra');
  });

  it('knows when a path lies within a nav section', () => {
    expect(isWithin('/', '/')).toBe(true);
    expect(isWithin('/', '/roadmap')).toBe(false);
    expect(isWithin('/library', '/library/mit-18-06')).toBe(true);
    expect(isWithin('/lib', '/library')).toBe(false);
  });
});
