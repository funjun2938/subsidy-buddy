import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry } from '../crawler';

const ok = (status = 200) => new Response('', { status });

describe('fetchWithRetry', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('returns immediately on first success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(200)));
    const res = await fetchWithRetry('https://test.com');
    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('retries on non-ok and succeeds on second attempt', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(ok(500))
      .mockResolvedValue(ok(200))
    );
    const promise = fetchWithRetry('https://test.com');
    await vi.runAllTimersAsync();
    expect((await promise).status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('exhausts all 3 retries (4 total attempts) and returns last response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(503)));
    const promise = fetchWithRetry('https://test.com');
    await vi.runAllTimersAsync();
    expect((await promise).status).toBe(503);
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('throws after all retries on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const promise = fetchWithRetry('https://test.com');
    promise.catch(() => {}); // prevent unhandled rejection before rejects.toThrow attaches
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toThrow('Network error');
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('logs failure count on each failed attempt', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(500)));
    const promise = fetchWithRetry('https://test.com');
    await vi.runAllTimersAsync();
    await promise;
    expect(warn).toHaveBeenCalledTimes(4);
    expect(warn.mock.calls[0][0]).toContain('failures: 1');
    expect(warn.mock.calls[1][0]).toContain('failures: 2');
    expect(warn.mock.calls[2][0]).toContain('failures: 3');
    expect(warn.mock.calls[3][0]).toContain('failures: 4');
  });

  it('applies exponential backoff: 1s → 2s → 4s between retries', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok(500)));
    const promise = fetchWithRetry('https://test.com');

    // 1st attempt done; waiting 1000ms for 2nd
    await vi.advanceTimersByTimeAsync(999);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(2);

    // 2nd attempt done; waiting 2000ms for 3rd
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(3);

    // 3rd attempt done; waiting 4000ms for 4th
    await vi.advanceTimersByTimeAsync(3999);
    expect(fetch).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(4);

    await promise;
  });
});
