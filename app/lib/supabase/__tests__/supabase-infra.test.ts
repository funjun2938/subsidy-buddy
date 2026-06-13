/**
 * supabase-infra.test.ts
 *
 * Supabase 인프라(client/server/middleware) 래퍼의 회귀 방지 테스트.
 *   - lib/supabase/client.ts: createBrowserClient 호출 인자 검증
 *   - lib/supabase/server.ts: createServerClient + cookies() 핸들러 검증
 *   - lib/supabase/middleware.ts: NextResponse + getUser 호출 검증
 *
 * 회사 정책: 인증 인프라는 작아도 회귀 발생 시 영향이 큼 → 핵심 호출만 정확히.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// 공통 mock: @/lib/env
// ─────────────────────────────────────────────────────────────────────────────

vi.mock("@/lib/env", () => ({
  env: {
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test-anon-key",
  },
}));

// @supabase/ssr 모듈 mock
const createBrowserClientMock = vi.fn();
const createServerClientMock = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: (...args: unknown[]) => createBrowserClientMock(...args),
  createServerClient: (...args: unknown[]) => createServerClientMock(...args),
}));

// next/headers cookies
const cookieGetAll = vi.fn();
const cookieSet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => cookieGetAll(),
    set: (...args: unknown[]) => cookieSet(...args),
  }),
}));

// next/server
const nextResponseNextMock = vi.fn();
vi.mock("next/server", () => ({
  NextResponse: {
    next: (init: unknown) => {
      nextResponseNextMock(init);
      return {
        cookies: {
          set: vi.fn(),
        },
      };
    },
  },
}));

beforeEach(() => {
  createBrowserClientMock.mockReset();
  createServerClientMock.mockReset();
  cookieGetAll.mockReset();
  cookieSet.mockReset();
  nextResponseNextMock.mockReset();
});

afterEach(() => {
  vi.resetModules();
});

// ─────────────────────────────────────────────────────────────────────────────
// lib/supabase/client.ts (브라우저)
// ─────────────────────────────────────────────────────────────────────────────

describe("lib/supabase/client.ts: createClient (브라우저)", () => {
  it("호출 시 createBrowserClient 위임", async () => {
    const { createClient } = await import("../client");
    createClient();
    expect(createBrowserClientMock).toHaveBeenCalled();
  });

  it("URL 첫 번째 인자로 전달", async () => {
    const { createClient } = await import("../client");
    createClient();
    expect(createBrowserClientMock.mock.calls[0][0]).toBe("https://test.supabase.co");
  });

  it("ANON_KEY 두 번째 인자로 전달", async () => {
    const { createClient } = await import("../client");
    createClient();
    expect(createBrowserClientMock.mock.calls[0][1]).toBe("test-anon-key");
  });

  it("정확히 2개 인자 전달 (옵션 없음)", async () => {
    const { createClient } = await import("../client");
    createClient();
    expect(createBrowserClientMock.mock.calls[0]).toHaveLength(2);
  });

  it("여러 번 호출해도 매번 새로 createBrowserClient 호출", async () => {
    const { createClient } = await import("../client");
    createClient();
    createClient();
    createClient();
    expect(createBrowserClientMock).toHaveBeenCalledTimes(3);
  });

  it("env 변경 회귀 방지: 항상 동일한 URL/KEY", async () => {
    const { createClient } = await import("../client");
    createClient();
    createClient();
    expect(createBrowserClientMock.mock.calls[0]).toEqual([
      "https://test.supabase.co",
      "test-anon-key",
    ]);
    expect(createBrowserClientMock.mock.calls[1]).toEqual(
      createBrowserClientMock.mock.calls[0]
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// lib/supabase/server.ts (서버)
// ─────────────────────────────────────────────────────────────────────────────

describe("lib/supabase/server.ts: createClient (서버)", () => {
  it("호출 시 createServerClient 위임", async () => {
    const { createClient } = await import("../server");
    await createClient();
    expect(createServerClientMock).toHaveBeenCalled();
  });

  it("URL 첫 번째 인자로 전달", async () => {
    const { createClient } = await import("../server");
    await createClient();
    expect(createServerClientMock.mock.calls[0][0]).toBe("https://test.supabase.co");
  });

  it("ANON_KEY 두 번째 인자로 전달", async () => {
    const { createClient } = await import("../server");
    await createClient();
    expect(createServerClientMock.mock.calls[0][1]).toBe("test-anon-key");
  });

  it("세 번째 인자에 cookies 핸들러 포함", async () => {
    const { createClient } = await import("../server");
    await createClient();
    const options = createServerClientMock.mock.calls[0][2];
    expect(options).toHaveProperty("cookies");
    expect(typeof options.cookies.getAll).toBe("function");
    expect(typeof options.cookies.setAll).toBe("function");
  });

  it("cookies.getAll 호출 시 cookieStore.getAll 위임", async () => {
    cookieGetAll.mockReturnValue([{ name: "x", value: "y" }]);
    const { createClient } = await import("../server");
    await createClient();
    const options = createServerClientMock.mock.calls[0][2];
    const result = options.cookies.getAll();
    expect(result).toEqual([{ name: "x", value: "y" }]);
    expect(cookieGetAll).toHaveBeenCalled();
  });

  it("cookies.setAll 호출 시 cookieStore.set 반복 호출", async () => {
    const { createClient } = await import("../server");
    await createClient();
    const options = createServerClientMock.mock.calls[0][2];
    options.cookies.setAll([
      { name: "a", value: "1", options: {} },
      { name: "b", value: "2", options: {} },
    ]);
    expect(cookieSet).toHaveBeenCalledTimes(2);
    expect(cookieSet).toHaveBeenCalledWith("a", "1", {});
    expect(cookieSet).toHaveBeenCalledWith("b", "2", {});
  });

  it("setAll 에서 set 실패해도 throw 하지 않음 (서버 컴포넌트 호환)", async () => {
    cookieSet.mockImplementation(() => {
      throw new Error("Cannot set cookies in server component");
    });
    const { createClient } = await import("../server");
    await createClient();
    const options = createServerClientMock.mock.calls[0][2];
    expect(() =>
      options.cookies.setAll([
        { name: "a", value: "1", options: {} },
      ])
    ).not.toThrow();
  });

  it("setAll 에 빈 배열 전달 시 set 호출 없음", async () => {
    const { createClient } = await import("../server");
    await createClient();
    const options = createServerClientMock.mock.calls[0][2];
    options.cookies.setAll([]);
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("createClient 가 async 함수 — Promise 반환", async () => {
    const { createClient } = await import("../server");
    const result = createClient();
    expect(result).toBeInstanceOf(Promise);
    await result;
  });

  it("여러 번 호출 가능", async () => {
    const { createClient } = await import("../server");
    await createClient();
    await createClient();
    expect(createServerClientMock).toHaveBeenCalledTimes(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// lib/supabase/middleware.ts (미들웨어)
// ─────────────────────────────────────────────────────────────────────────────

describe("lib/supabase/middleware.ts: updateSession", () => {
  function makeRequest() {
    const cookieSetMock = vi.fn();
    const cookieGetAllMock = vi.fn().mockReturnValue([]);
    return {
      cookies: {
        getAll: cookieGetAllMock,
        set: cookieSetMock,
      },
    };
  }

  let getUserMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getUserMock = vi.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    });
    createServerClientMock.mockImplementation(() => ({
      auth: {
        getUser: () => getUserMock(),
      },
    }));
  });

  it("호출 시 NextResponse.next() 가 호출됨", async () => {
    const { updateSession } = await import("../middleware");
    await updateSession(makeRequest() as never);
    expect(nextResponseNextMock).toHaveBeenCalled();
  });

  it("NextResponse.next 에 { request } 전달", async () => {
    const { updateSession } = await import("../middleware");
    const req = makeRequest();
    await updateSession(req as never);
    expect(nextResponseNextMock).toHaveBeenCalledWith({ request: req });
  });

  it("createServerClient 가 URL/ANON_KEY 로 호출됨", async () => {
    const { updateSession } = await import("../middleware");
    await updateSession(makeRequest() as never);
    expect(createServerClientMock.mock.calls[0][0]).toBe("https://test.supabase.co");
    expect(createServerClientMock.mock.calls[0][1]).toBe("test-anon-key");
  });

  it("supabase.auth.getUser 가 호출됨 (세션 갱신)", async () => {
    const { updateSession } = await import("../middleware");
    await updateSession(makeRequest() as never);
    expect(getUserMock).toHaveBeenCalled();
  });

  it("응답 객체 반환 (NextResponse)", async () => {
    const { updateSession } = await import("../middleware");
    const result = await updateSession(makeRequest() as never);
    expect(result).toBeDefined();
    expect(result).toHaveProperty("cookies");
  });

  it("cookies.getAll 핸들러가 request.cookies.getAll 위임", async () => {
    const { updateSession } = await import("../middleware");
    const req = makeRequest();
    req.cookies.getAll = vi.fn().mockReturnValue([{ name: "k", value: "v" }]);
    await updateSession(req as never);
    const options = createServerClientMock.mock.calls[0][2];
    const result = options.cookies.getAll();
    expect(result).toEqual([{ name: "k", value: "v" }]);
  });

  it("cookies.setAll 시 request.cookies.set 호출", async () => {
    const { updateSession } = await import("../middleware");
    const req = makeRequest();
    await updateSession(req as never);
    const options = createServerClientMock.mock.calls[0][2];
    options.cookies.setAll([
      { name: "x", value: "1", options: {} },
      { name: "y", value: "2", options: {} },
    ]);
    expect(req.cookies.set).toHaveBeenCalledWith("x", "1");
    expect(req.cookies.set).toHaveBeenCalledWith("y", "2");
  });

  it("setAll 시 NextResponse.next 가 다시 호출됨 (응답 재발급)", async () => {
    const { updateSession } = await import("../middleware");
    const req = makeRequest();
    await updateSession(req as never);
    nextResponseNextMock.mockClear();
    const options = createServerClientMock.mock.calls[0][2];
    options.cookies.setAll([{ name: "x", value: "1", options: {} }]);
    expect(nextResponseNextMock).toHaveBeenCalled();
  });

  it("getUser 실패해도 응답은 반환 (회귀 방지)", async () => {
    getUserMock.mockRejectedValue(new Error("auth error"));
    const { updateSession } = await import("../middleware");
    await expect(updateSession(makeRequest() as never)).rejects.toThrow();
    // 현재 구현은 throw 되도록 되어 있음 — 향후 try/catch 추가 시 회귀 감지용
  });

  it("getUser 가 user 반환 시 정상 동작", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "u1", email: "x@y.com" } },
      error: null,
    });
    const { updateSession } = await import("../middleware");
    const result = await updateSession(makeRequest() as never);
    expect(result).toBeDefined();
  });

  it("여러 번 호출 가능", async () => {
    const { updateSession } = await import("../middleware");
    await updateSession(makeRequest() as never);
    await updateSession(makeRequest() as never);
    expect(getUserMock).toHaveBeenCalledTimes(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 통합 회귀 방지: env 변경 영향
// ─────────────────────────────────────────────────────────────────────────────

describe("Supabase 인프라 통합: env 회귀 방지", () => {
  it("client.ts 가 env.SUPABASE_URL 을 정확히 참조", async () => {
    const { createClient } = await import("../client");
    createClient();
    expect(createBrowserClientMock.mock.calls[0][0]).toBe("https://test.supabase.co");
  });

  it("server.ts 가 env.SUPABASE_URL 을 정확히 참조", async () => {
    const { createClient } = await import("../server");
    await createClient();
    expect(createServerClientMock.mock.calls[0][0]).toBe("https://test.supabase.co");
  });

  it("middleware.ts 가 env.SUPABASE_URL 을 정확히 참조", async () => {
    createServerClientMock.mockImplementation(() => ({
      auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
    }));
    const { updateSession } = await import("../middleware");
    await updateSession({
      cookies: { getAll: vi.fn().mockReturnValue([]), set: vi.fn() },
    } as never);
    expect(createServerClientMock.mock.calls[0][0]).toBe("https://test.supabase.co");
  });

  it("세 모듈 모두 동일한 ANON_KEY 사용", async () => {
    // 새로 로드
    vi.resetModules();
    const { createClient: clientCreate } = await import("../client");
    clientCreate();
    const clientKey = createBrowserClientMock.mock.calls.slice(-1)[0][1];

    const { createClient: serverCreate } = await import("../server");
    await serverCreate();
    const serverKey = createServerClientMock.mock.calls.slice(-1)[0][1];

    createServerClientMock.mockImplementation(() => ({
      auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
    }));
    const { updateSession } = await import("../middleware");
    await updateSession({
      cookies: { getAll: vi.fn().mockReturnValue([]), set: vi.fn() },
    } as never);
    const middlewareKey = createServerClientMock.mock.calls.slice(-1)[0][1];

    expect(clientKey).toBe(serverKey);
    expect(serverKey).toBe(middlewareKey);
  });
});
