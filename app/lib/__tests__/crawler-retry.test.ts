/**
 * crawler-retry.test.ts
 *
 * fetchWithRetry 의 지수 백오프 재시도 동작 검증.
 * 외부 공공 API(기업마당)의 간헐적 5xx/네트워크 오류 흡수 회귀 방지.
 *   - 첫 시도 성공 → 1회만 호출
 *   - 일시적 실패 후 성공 → 재시도 후 성공 응답 반환
 *   - 지속 실패(5xx) → 최대 재시도 소진 후 마지막 응답 반환
 *   - 지속 네트워크 오류 → 최종 throw
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithRetry } from "../crawler";

const MAX_RETRIES = 3; // crawler.ts 와 동일 (총 시도 = MAX_RETRIES + 1 = 4)

function res(ok: boolean, status = ok ? 200 : 500): Response {
  return { ok, status } as Response;
}

describe("fetchWithRetry - 지수 백오프 재시도", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("첫 시도에 성공하면 fetch 를 1회만 호출한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(res(true));
    vi.stubGlobal("fetch", fetchMock);

    const p = fetchWithRetry("https://example.com");
    await vi.runAllTimersAsync();
    const r = await p;

    expect(r.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("일시적 실패 후 성공하면 재시도하여 성공 응답을 반환한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(res(false))
      .mockResolvedValueOnce(res(true));
    vi.stubGlobal("fetch", fetchMock);

    const p = fetchWithRetry("https://example.com");
    await vi.runAllTimersAsync();
    const r = await p;

    expect(r.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("지속 5xx 면 최대 재시도까지 시도하고 마지막 응답을 반환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(res(false, 503));
    vi.stubGlobal("fetch", fetchMock);

    const p = fetchWithRetry("https://example.com");
    await vi.runAllTimersAsync();
    const r = await p;

    expect(r.ok).toBe(false);
    expect(r.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(MAX_RETRIES + 1);
  });

  it("지속 네트워크 오류면 최종적으로 throw 한다", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("ECONNRESET"));
    vi.stubGlobal("fetch", fetchMock);

    const p = fetchWithRetry("https://example.com");
    const assertion = expect(p).rejects.toThrow("ECONNRESET");
    await vi.runAllTimersAsync();
    await assertion;

    expect(fetchMock).toHaveBeenCalledTimes(MAX_RETRIES + 1);
  });
});
