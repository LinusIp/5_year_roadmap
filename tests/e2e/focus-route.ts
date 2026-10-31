import type { Page, Route } from '@playwright/test';

/**
 * YouTube, stood in for (ATLAS-FOCUS-MUSIC): the IFrame API as a stub that behaves like the real player (ready, play,
 * pause, state changes), oEmbed answering as the real endpoint does (200 with the video's details, 401 for a video
 * that refuses embedding, 404 for one that does not exist), and thumbnails as a tiny image. Nothing reaches
 * youtube.com from the tests.
 */
export const EMBEDDABLE = 'jfKfPfyJRdk';
export const NOT_EMBEDDABLE = 'aaaaaaaaaaa';
export const MISSING = 'bbbbbbbbbbb';

const API_STUB = `
window.YT = {
  PlayerState: { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 },
  Player: class {
    constructor(element, options) {
      this.options = options;
      this.state = -1;
      this.volume = 100;
      this.loaded = null;
      const frame = document.createElement('iframe');
      frame.setAttribute('title', 'YouTube video player (stub)');
      frame.setAttribute('data-yt-stub', '1');
      frame.src = 'about:blank';
      frame.style.width = '100%';
      frame.style.height = '100%';
      frame.style.border = '0';
      element.replaceWith(frame);
      this.frame = frame;
      window.__ytPlayers = (window.__ytPlayers || []).concat(this);
      setTimeout(() => options.events && options.events.onReady && options.events.onReady({ target: this }), 10);
    }
    change(state) { this.state = state; this.frame.setAttribute('data-yt-state', String(state)); const h = this.options.events && this.options.events.onStateChange; if (h) h({ data: state, target: this }); }
    loadVideoById(id) { this.loaded = id; this.frame.setAttribute('data-yt-video', id); setTimeout(() => this.change(1), 20); }
    cueVideoById(id) { this.loaded = id; this.frame.setAttribute('data-yt-video', id); this.change(5); }
    loadPlaylist(o) { this.loaded = o.list; this.frame.setAttribute('data-yt-video', o.list); setTimeout(() => this.change(1), 20); }
    playVideo() { this.change(1); }
    pauseVideo() { this.change(2); }
    stopVideo() { this.change(-1); this.frame.removeAttribute('data-yt-video'); }
    setVolume(v) { this.volume = v; this.frame.setAttribute('data-yt-volume', String(v)); }
    getVolume() { return this.volume; }
    getPlayerState() { return this.state; }
    destroy() { this.frame.remove(); }
  }
};
if (window.onYouTubeIframeAPIReady) window.onYouTubeIframeAPIReady();
`;

// A 1 x 1 PNG.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

/** Serves the stubs for a page and returns the oEmbed addresses asked for. */
export async function serveYouTube(page: Page): Promise<string[]> {
  const asked: string[] = [];
  await page.route('https://www.youtube.com/iframe_api', (route: Route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: API_STUB }));
  await page.route('https://www.youtube.com/oembed**', (route: Route) => {
    const url = new URL(route.request().url());
    const target = url.searchParams.get('url') ?? '';
    asked.push(target);
    const id = /[?&]v=([\w-]{11})/.exec(target)?.[1] ?? /list=([\w-]+)/.exec(target)?.[1] ?? '';
    if (id === NOT_EMBEDDABLE) return route.fulfill({ status: 401, contentType: 'text/plain', body: 'Unauthorized' });
    if (id === MISSING || !id) return route.fulfill({ status: 404, contentType: 'text/plain', body: 'Not Found' });
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        title: id === EMBEDDABLE ? 'lofi hip hop radio · beats to relax/study to' : 'Session ' + id,
        author_name: id === EMBEDDABLE ? 'Lofi Girl' : 'A channel',
        thumbnail_url: 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg',
        html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/' + id + '?feature=oembed" frameborder="0"></iframe>',
        provider_name: 'YouTube',
      }),
    });
  });
  await page.route('https://i.ytimg.com/**', (route: Route) => route.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
  // Anything else at YouTube (the real player's own files) is refused: the stub never asks for them.
  await page.route(/https:\/\/(www\.)?youtube(-nocookie)?\.com\/(?!iframe_api|oembed).*/, (route: Route) => route.abort());
  return asked;
}
