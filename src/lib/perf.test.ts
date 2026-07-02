import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { PerformanceTrace } from 'firebase/performance';

// Mock the SDK at the boundary — never touch a real Performance instance or the
// network. `initializePerformance` returns a sentinel; `trace` returns a fresh
// spy trace each call so we can assert start/stop ordering.
vi.mock('firebase/performance', () => ({
  initializePerformance: vi.fn(() => ({ __perf: true })),
  trace: vi.fn(),
}));

vi.mock('./firebase', () => ({ app: { __app: true } }));

import { initializePerformance, trace as fbTrace } from 'firebase/performance';

/** A spy PerformanceTrace with just the methods our helpers touch. */
function makeTrace(): PerformanceTrace {
  return {
    start: vi.fn(),
    stop: vi.fn(),
    record: vi.fn(),
    incrementMetric: vi.fn(),
    putMetric: vi.fn(),
    getMetric: vi.fn(() => 0),
    putAttribute: vi.fn(),
    getAttribute: vi.fn(() => undefined),
    removeAttribute: vi.fn(),
    getAttributes: vi.fn(() => ({})),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  // Default: a browser env where Performance initializes successfully.
  vi.stubGlobal('window', {});
  vi.mocked(initializePerformance).mockReturnValue({
    __perf: true,
  } as unknown as ReturnType<typeof initializePerformance>);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Re-import the module fresh so its memoized init state is reset per test. */
async function freshPerf(): Promise<typeof import('./perf')> {
  vi.resetModules();
  return import('./perf');
}

describe('initPerformance', () => {
  it('initializes Performance with auto-collection enabled', async () => {
    const perf = await freshPerf();
    const instance = perf.initPerformance();

    expect(initializePerformance).toHaveBeenCalledWith(
      { __app: true },
      { dataCollectionEnabled: true, instrumentationEnabled: true },
    );
    expect(instance).toEqual({ __perf: true });
  });

  it('memoizes the instance — inits at most once across calls', async () => {
    const perf = await freshPerf();
    perf.initPerformance();
    perf.initPerformance();
    perf.startTrace('speakers_fetch');

    expect(initializePerformance).toHaveBeenCalledTimes(1);
  });

  it('returns null and never throws when init throws', async () => {
    vi.mocked(initializePerformance).mockImplementation(() => {
      throw new Error('unsupported');
    });
    const perf = await freshPerf();

    expect(perf.initPerformance()).toBeNull();
    // Memoized failure: does not retry init on the next call.
    expect(perf.initPerformance()).toBeNull();
    expect(initializePerformance).toHaveBeenCalledTimes(1);
  });

  it('no-ops in a non-browser environment (no window)', async () => {
    vi.stubGlobal('window', undefined);
    const perf = await freshPerf();

    expect(perf.initPerformance()).toBeNull();
    expect(initializePerformance).not.toHaveBeenCalled();
  });
});

describe('startTrace / stopTrace', () => {
  it('creates, starts, and returns a named trace', async () => {
    const t = makeTrace();
    vi.mocked(fbTrace).mockReturnValue(t);
    const perf = await freshPerf();

    const started = perf.startTrace('photo_upload');

    expect(fbTrace).toHaveBeenCalledWith({ __perf: true }, 'photo_upload');
    expect(t.start).toHaveBeenCalledTimes(1);
    expect(started).toBe(t);
  });

  it('stops a trace returned by startTrace', async () => {
    const t = makeTrace();
    vi.mocked(fbTrace).mockReturnValue(t);
    const perf = await freshPerf();

    const started = perf.startTrace('auth_signin');
    perf.stopTrace(started);

    expect(t.stop).toHaveBeenCalledTimes(1);
  });

  it('startTrace returns null when Performance is unavailable', async () => {
    vi.stubGlobal('window', undefined);
    const perf = await freshPerf();

    expect(perf.startTrace('speakers_fetch')).toBeNull();
    expect(fbTrace).not.toHaveBeenCalled();
  });

  it('startTrace returns null (never throws) when trace() throws', async () => {
    vi.mocked(fbTrace).mockImplementation(() => {
      throw new Error('boom');
    });
    const perf = await freshPerf();

    expect(() => perf.startTrace('photo_upload')).not.toThrow();
    expect(perf.startTrace('photo_upload')).toBeNull();
  });

  it('stopTrace no-ops on null', async () => {
    const perf = await freshPerf();
    expect(() => perf.stopTrace(null)).not.toThrow();
  });

  it('stopTrace swallows errors thrown by stop()', async () => {
    const t = makeTrace();
    vi.mocked(t.stop).mockImplementation(() => {
      throw new Error('stop failed');
    });
    const perf = await freshPerf();

    expect(() => perf.stopTrace(t)).not.toThrow();
  });
});

describe('measureTrace (sync)', () => {
  it('starts before and stops after a synchronous fn, returning its value', async () => {
    const t = makeTrace();
    const order: string[] = [];
    vi.mocked(t.start).mockImplementation(() => void order.push('start'));
    vi.mocked(t.stop).mockImplementation(() => void order.push('stop'));
    vi.mocked(fbTrace).mockReturnValue(t);
    const perf = await freshPerf();

    const result = perf.measureTrace('speakers_fetch', () => {
      order.push('fn');
      return 42;
    });

    expect(result).toBe(42);
    expect(order).toEqual(['start', 'fn', 'stop']);
  });

  it('stops the trace and rethrows when a sync fn throws', async () => {
    const t = makeTrace();
    vi.mocked(fbTrace).mockReturnValue(t);
    const perf = await freshPerf();

    expect(() =>
      perf.measureTrace('speakers_fetch', () => {
        throw new Error('sync boom');
      }),
    ).toThrow('sync boom');
    expect(t.stop).toHaveBeenCalledTimes(1);
  });

  it('runs the fn even when Performance is unavailable (no-op wrapper)', async () => {
    vi.stubGlobal('window', undefined);
    const perf = await freshPerf();

    const result = perf.measureTrace('photo_upload', () => 'ok');

    expect(result).toBe('ok');
    expect(fbTrace).not.toHaveBeenCalled();
  });
});

describe('measureTrace (async)', () => {
  it('stops only after the promise resolves, passing the value through', async () => {
    const t = makeTrace();
    vi.mocked(fbTrace).mockReturnValue(t);
    const perf = await freshPerf();

    let resolveFn: (v: string) => void = () => {};
    const promise = perf.measureTrace(
      'photo_upload',
      () => new Promise<string>((resolve) => (resolveFn = resolve)),
    );

    // Trace started, but not stopped while the promise is still pending.
    expect(t.start).toHaveBeenCalledTimes(1);
    expect(t.stop).not.toHaveBeenCalled();

    resolveFn('done');
    await expect(promise).resolves.toBe('done');
    expect(t.stop).toHaveBeenCalledTimes(1);
  });

  it('stops the trace and propagates rejection when the promise rejects', async () => {
    const t = makeTrace();
    vi.mocked(fbTrace).mockReturnValue(t);
    const perf = await freshPerf();

    const promise = perf.measureTrace('auth_signin', () =>
      Promise.reject(new Error('async boom')),
    );

    await expect(promise).rejects.toThrow('async boom');
    expect(t.stop).toHaveBeenCalledTimes(1);
  });

  it('awaits an async fn even when Performance is unavailable', async () => {
    vi.stubGlobal('window', undefined);
    const perf = await freshPerf();

    await expect(
      perf.measureTrace('speakers_fetch', () => Promise.resolve('v')),
    ).resolves.toBe('v');
  });
});
