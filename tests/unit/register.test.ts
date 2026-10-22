import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (event: { data?: unknown }) => void;

/** A service worker as the page sees it: a state that changes, and the listeners told when it does. */
class FakeWorker {
  listeners: Handler[] = [];
  sent: unknown[] = [];
  state: string;
  constructor(state: string) {
    this.state = state;
  }
  addEventListener(_type: string, handler: Handler): void {
    this.listeners.push(handler);
  }
  postMessage(message: unknown, ports?: MessagePort[]): void {
    this.sent.push(message);
    if (message === 'version') ports?.[0]?.postMessage('v-running');
  }
  become(state: string): void {
    this.state = state;
    for (const l of this.listeners) l({});
  }
}

class FakeRegistration {
  installing: FakeWorker | null = null;
  waiting: FakeWorker | null = null;
  handlers = new Map<string, Handler>();
  updates = 0;
  /** What the next `update()` finds: a worker to install, or nothing. */
  next: FakeWorker | null = null;
  addEventListener(type: string, handler: Handler): void {
    this.handlers.set(type, handler);
  }
  async update(): Promise<void> {
    this.updates += 1;
    if (this.next) {
      this.installing = this.next;
      this.next = null;
      this.handlers.get('updatefound')?.({});
    }
  }
  async unregister(): Promise<boolean> {
    return true;
  }
}

function setUp(controller: FakeWorker | null) {
  const swListeners = new Map<string, Handler>();
  const reloads: number[] = [];
  const registrations = [new FakeRegistration()];
  const deleted: string[] = [];
  vi.stubGlobal('navigator', {
    serviceWorker: {
      controller,
      addEventListener: (type: string, handler: Handler) => swListeners.set(type, handler),
      getRegistrations: async () => registrations,
    },
  });
  vi.stubGlobal('document', { visibilityState: 'visible', addEventListener: () => undefined });
  vi.stubGlobal('window', { location: { reload: () => reloads.push(Date.now()) } });
  vi.stubGlobal('caches', { keys: async () => ['atlas-old', 'someone-else'], delete: async (k: string) => deleted.push(k) });
  return { swListeners, reloads, registrations, deleted };
}

async function load() {
  vi.resetModules();
  return import('../../src/pwa/register.ts');
}

describe('service worker registration on the page', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('offers an update already waiting when the page opens, and one found later once it has installed', async () => {
    setUp(new FakeWorker('activated'));
    const sw = await load();
    const reg = new FakeRegistration();
    reg.waiting = new FakeWorker('installed');
    let offered = 0;
    sw.onUpdateReady(() => offered++);
    sw.attach(reg as unknown as ServiceWorkerRegistration);
    expect(offered).toBe(1);
    expect(reg.updates).toBe(1); // asked the site on open

    const fresh = await load();
    const reg2 = new FakeRegistration();
    fresh.attach(reg2 as unknown as ServiceWorkerRegistration);
    let offered2 = 0;
    fresh.onUpdateReady(() => offered2++);
    const worker = new FakeWorker('installing');
    reg2.installing = worker;
    reg2.handlers.get('updatefound')!({});
    expect(offered2).toBe(0);
    worker.become('installed');
    expect(offered2).toBe(1);
    await expect(fresh.checkForUpdate()).resolves.toBe('ready');
  });

  it('follows an install that was under way when the page loaded: updatefound fired for the page before', async () => {
    setUp(new FakeWorker('activated'));
    const sw = await load();
    const reg = new FakeRegistration();
    const worker = new FakeWorker('installing');
    reg.installing = worker;
    let offered = 0;
    sw.onUpdateReady(() => offered++);
    sw.attach(reg as unknown as ServiceWorkerRegistration);
    worker.become('installed');
    expect(offered).toBe(1);
  });

  it('never offers a first install as an update, and says so on a check', async () => {
    setUp(null);
    const sw = await load();
    const reg = new FakeRegistration();
    sw.attach(reg as unknown as ServiceWorkerRegistration);
    let offered = 0;
    sw.onUpdateReady(() => offered++);
    const worker = new FakeWorker('installing');
    reg.next = worker;
    const result = sw.checkForUpdate();
    await Promise.resolve();
    await Promise.resolve();
    worker.become('installed');
    await expect(result).resolves.toBe('latest');
    expect(offered).toBe(0);
  });

  it('reports a failed install with the reason the worker gave, and tries again a little later', async () => {
    const { swListeners } = setUp(new FakeWorker('activated'));
    const sw = await load();
    const reg = new FakeRegistration();
    sw.attach(reg as unknown as ServiceWorkerRegistration);
    const worker = new FakeWorker('installing');
    reg.next = worker;
    const result = sw.checkForUpdate();
    await Promise.resolve();
    await Promise.resolve();
    swListeners.get('message')!({ data: { installFailed: './brand/atlas-favicon-dark-16.png answered 503' } });
    worker.become('redundant');
    await expect(result).resolves.toBe('failed');
    expect(sw.failure()).toBe('./brand/atlas-favicon-dark-16.png answered 503');
    const before = reg.updates;
    await vi.advanceTimersByTimeAsync(20_000);
    expect(reg.updates).toBe(before + 1);
  });

  it('is unavailable before a registration, and the latest version when the site has nothing newer', async () => {
    setUp(new FakeWorker('activated'));
    const sw = await load();
    await expect(sw.checkForUpdate()).resolves.toBe('unavailable');
    const reg = new FakeRegistration();
    sw.attach(reg as unknown as ServiceWorkerRegistration);
    await expect(sw.checkForUpdate()).resolves.toBe('latest');
  });

  it('tries a failed registration again: on a check, on a timer, and uses one the browser already holds', async () => {
    const { swListeners } = setUp(new FakeWorker('activated'));
    const attempts: number[] = [];
    let fails = 2;
    const fresh = new FakeRegistration();
    Object.assign(navigator.serviceWorker, {
      getRegistration: async () => undefined,
      register: async () => {
        attempts.push(Date.now());
        if (fails > 0) {
          fails -= 1;
          throw new TypeError('Failed to fetch');
        }
        return fresh;
      },
    });
    const sw = await load();
    // Opened from the cache with the network away: register rejects, the reason is kept, nothing is attached.
    await expect(sw.ensureRegistration()).resolves.toBeNull();
    expect(sw.failure()).toBe('Failed to fetch');
    expect(attempts).toHaveLength(1);
    // The Settings check registers first and reports the failure, with its reason.
    await expect(sw.checkForUpdate()).resolves.toBe('failed');
    expect(attempts).toHaveLength(2);
    // The timer tries again; this time the site answers, the registration is attached and checked.
    await vi.advanceTimersByTimeAsync(20_000);
    expect(attempts).toHaveLength(3);
    expect(fresh.updates).toBe(1);
    await expect(sw.checkForUpdate()).resolves.toBe('latest');
    expect(attempts).toHaveLength(3);
    expect(swListeners.has('message')).toBe(true);
  });

  it('attaches to the registration the browser already holds rather than registering again', async () => {
    setUp(new FakeWorker('activated'));
    const held = new FakeRegistration();
    held.waiting = new FakeWorker('installed');
    let registered = 0;
    Object.assign(navigator.serviceWorker, {
      getRegistration: async () => held,
      register: async () => {
        registered += 1;
        return held;
      },
    });
    const sw = await load();
    const ready = vi.fn();
    sw.onUpdateReady(ready);
    await expect(sw.ensureRegistration()).resolves.toBe(held);
    expect(registered).toBe(0);
    expect(ready).toHaveBeenCalled();
    await expect(sw.checkForUpdate()).resolves.toBe('ready');
  });

  it('asks the running worker for its version, and has none without a worker', async () => {
    vi.useRealTimers();
    setUp(new FakeWorker('activated'));
    const sw = await load();
    await expect(sw.runningVersion()).resolves.toBe('v-running');
    setUp(null);
    const bare = await load();
    await expect(bare.runningVersion()).resolves.toBeNull();
  });

  it('resets the offline copy: every registration and Atlas cache goes, then the page reloads from the site', async () => {
    const { reloads, deleted } = setUp(new FakeWorker('activated'));
    const sw = await load();
    await sw.resetOfflineCopy();
    expect(deleted).toEqual(['atlas-old']);
    expect(reloads).toHaveLength(1);
  });
});
