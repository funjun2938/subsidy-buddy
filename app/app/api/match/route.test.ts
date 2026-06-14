/**
 * /api/match POST 라우트 테스트.
 *
 *   - 5개 필수 필드(bizType/revenue/region/bizAge/ceoAge) 검증
 *   - 400 / 500 / 200 분기
 *   - matchGrantsAI 호출 위임
 *   - source: 시드만 vs 라이브+시드 (biz- 프리픽스 검출)
 *   - 응답 구조 회귀 방지: { matches, totalGrants, source }
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Grant, MatchResult } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

let matchGrantsAIMock = vi.fn();
let getAllGrantsMock = vi.fn();

vi.mock("@/lib/ai", () => ({
  matchGrantsAI: (...args: unknown[]) => matchGrantsAIMock(...args),
}));

vi.mock("@/lib/grants-store", () => ({
  getAllGrants: () => getAllGrantsMock(),
}));

// 동적 import (mock 적용 후)
async function callRoute(body: unknown): Promise<{
  status: number;
  json: () => Promise<unknown>;
}> {
  const { POST } = await import("./route");
  const request = new Request("http://localhost/api/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as Parameters<typeof POST>[0];
  return POST(request);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeGrant(id: string): Grant {
  return {
    id,
    title: `지원사업 ${id}`,
    orgName: "정부",
    category: "창업",
    region: "전국",
    targetBizTypes: ["IT·소프트웨어"],
    amount: "1000만원",
    deadline: "상시",
    description: "",
    requirements: "",
    url: "https://example.com",
  };
}

function makeMatch(grantId: string): MatchResult {
  return {
    grant: makeGrant(grantId),
    matchScore: "high",
    reason: "조건 일치",
    matchReasons: ["전국 지원", "업종 일치"],
  };
}

const validBody = {
  bizType: "IT·소프트웨어",
  revenue: "1억 미만",
  region: "서울",
  bizAge: "1~3년",
  ceoAge: "30대",
};

beforeEach(() => {
  matchGrantsAIMock = vi.fn().mockResolvedValue([makeMatch("g1")]);
  getAllGrantsMock = vi.fn().mockResolvedValue([makeGrant("g1")]);
});

// ─────────────────────────────────────────────────────────────────────────────
// 필수 필드 검증
// ─────────────────────────────────────────────────────────────────────────────

describe("/api/match POST: 필수 필드 검증", () => {
  it("모든 필드 채워지면 200 응답", async () => {
    const res = await callRoute(validBody);
    expect(res.status).toBe(200);
  });

  it("bizType 누락 시 400", async () => {
    const res = await callRoute({ ...validBody, bizType: "" });
    expect(res.status).toBe(400);
  });

  it("revenue 누락 시 400", async () => {
    const res = await callRoute({ ...validBody, revenue: "" });
    expect(res.status).toBe(400);
  });

  it("region 누락 시 400", async () => {
    const res = await callRoute({ ...validBody, region: "" });
    expect(res.status).toBe(400);
  });

  it("bizAge 누락 시 400", async () => {
    const res = await callRoute({ ...validBody, bizAge: "" });
    expect(res.status).toBe(400);
  });

  it("ceoAge 누락 시 400", async () => {
    const res = await callRoute({ ...validBody, ceoAge: "" });
    expect(res.status).toBe(400);
  });

  it("400 응답에는 한국어 에러 메시지", async () => {
    const res = await callRoute({ ...validBody, bizType: "" });
    const body = await res.json() as { error: string };
    expect(body.error).toBe("모든 조건을 입력해주세요.");
  });

  it("400 응답 시 matchGrantsAI 호출 안 됨", async () => {
    await callRoute({ ...validBody, bizType: "" });
    expect(matchGrantsAIMock).not.toHaveBeenCalled();
  });

  it("400 응답 시 getAllGrants 호출 안 됨", async () => {
    await callRoute({ ...validBody, bizType: "" });
    expect(getAllGrantsMock).not.toHaveBeenCalled();
  });

  it("빈 객체 입력 시 400", async () => {
    const res = await callRoute({});
    expect(res.status).toBe(400);
  });

  it("null 값 입력 시 400 (truthy 검증)", async () => {
    const res = await callRoute({ ...validBody, bizType: null });
    expect(res.status).toBe(400);
  });

  it("undefined 값 입력 시 400", async () => {
    const res = await callRoute({ ...validBody, region: undefined });
    expect(res.status).toBe(400);
  });

  it("summary/keywords 는 optional — 없어도 200", async () => {
    const res = await callRoute(validBody);
    expect(res.status).toBe(200);
    expect(matchGrantsAIMock).toHaveBeenCalled();
  });

  it("summary 포함 시 정상 처리", async () => {
    const res = await callRoute({ ...validBody, summary: "AI SaaS" });
    expect(res.status).toBe(200);
  });

  it("keywords 포함 시 정상 처리", async () => {
    const res = await callRoute({
      ...validBody,
      keywords: ["AI", "ML"],
    });
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 성공 응답 구조
// ─────────────────────────────────────────────────────────────────────────────

describe("/api/match POST: 성공 응답 구조", () => {
  it("응답 본문에 matches 필드 포함", async () => {
    const res = await callRoute(validBody);
    const body = await res.json() as { matches: unknown[] };
    expect(Array.isArray(body.matches)).toBe(true);
  });

  it("응답 본문에 totalGrants 필드 포함", async () => {
    const res = await callRoute(validBody);
    const body = await res.json() as { totalGrants: number };
    expect(typeof body.totalGrants).toBe("number");
  });

  it("응답 본문에 source 필드 포함", async () => {
    const res = await callRoute(validBody);
    const body = await res.json() as { source: string };
    expect(typeof body.source).toBe("string");
  });

  it("matches 배열은 matchGrantsAI 반환값", async () => {
    const expected = [makeMatch("g1"), makeMatch("g2")];
    matchGrantsAIMock = vi.fn().mockResolvedValue(expected);
    const res = await callRoute(validBody);
    const body = await res.json() as { matches: MatchResult[] };
    expect(body.matches).toEqual(expected);
  });

  it("totalGrants 는 getAllGrants 결과 길이", async () => {
    getAllGrantsMock = vi.fn().mockResolvedValue([
      makeGrant("g1"),
      makeGrant("g2"),
      makeGrant("g3"),
    ]);
    const res = await callRoute(validBody);
    const body = await res.json() as { totalGrants: number };
    expect(body.totalGrants).toBe(3);
  });

  it("source 가 'seed' — biz- 프리픽스 없는 경우", async () => {
    getAllGrantsMock = vi.fn().mockResolvedValue([
      makeGrant("seed-001"),
      makeGrant("g2"),
    ]);
    const res = await callRoute(validBody);
    const body = await res.json() as { source: string };
    expect(body.source).toBe("seed");
  });

  it("source 가 'live+seed' — biz- 프리픽스 하나라도 있으면", async () => {
    getAllGrantsMock = vi.fn().mockResolvedValue([
      makeGrant("biz-001"),
      makeGrant("seed-001"),
    ]);
    const res = await callRoute(validBody);
    const body = await res.json() as { source: string };
    expect(body.source).toBe("live+seed");
  });

  it("source 가 'live+seed' — 모두 biz- 인 경우", async () => {
    getAllGrantsMock = vi.fn().mockResolvedValue([
      makeGrant("biz-001"),
      makeGrant("biz-002"),
    ]);
    const res = await callRoute(validBody);
    const body = await res.json() as { source: string };
    expect(body.source).toBe("live+seed");
  });

  it("source 'seed' — 빈 배열인 경우 (some on empty = false)", async () => {
    getAllGrantsMock = vi.fn().mockResolvedValue([]);
    const res = await callRoute(validBody);
    const body = await res.json() as { source: string };
    expect(body.source).toBe("seed");
  });

  it("totalGrants 0 — 빈 배열인 경우", async () => {
    getAllGrantsMock = vi.fn().mockResolvedValue([]);
    matchGrantsAIMock = vi.fn().mockResolvedValue([]);
    const res = await callRoute(validBody);
    const body = await res.json() as { totalGrants: number };
    expect(body.totalGrants).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 위임 검증
// ─────────────────────────────────────────────────────────────────────────────

describe("/api/match POST: 위임 검증", () => {
  it("matchGrantsAI 가 사용자 condition 으로 호출됨", async () => {
    await callRoute(validBody);
    expect(matchGrantsAIMock).toHaveBeenCalled();
    const [cond] = matchGrantsAIMock.mock.calls[0];
    expect(cond).toEqual(validBody);
  });

  it("matchGrantsAI 두 번째 인자는 getAllGrants 결과", async () => {
    const grants = [makeGrant("a"), makeGrant("b")];
    getAllGrantsMock = vi.fn().mockResolvedValue(grants);
    await callRoute(validBody);
    const [, passedGrants] = matchGrantsAIMock.mock.calls[0];
    expect(passedGrants).toEqual(grants);
  });

  it("getAllGrants 가 matchGrantsAI 보다 먼저 호출됨 (순서)", async () => {
    const order: string[] = [];
    getAllGrantsMock = vi.fn().mockImplementation(async () => {
      order.push("getAll");
      return [];
    });
    matchGrantsAIMock = vi.fn().mockImplementation(async () => {
      order.push("matchAI");
      return [];
    });
    await callRoute(validBody);
    expect(order).toEqual(["getAll", "matchAI"]);
  });

  it("매번 새 요청마다 getAllGrants 1회 호출", async () => {
    await callRoute(validBody);
    expect(getAllGrantsMock).toHaveBeenCalledTimes(1);
  });

  it("매번 새 요청마다 matchGrantsAI 1회 호출", async () => {
    await callRoute(validBody);
    expect(matchGrantsAIMock).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 에러 처리
// ─────────────────────────────────────────────────────────────────────────────

describe("/api/match POST: 에러 처리", () => {
  it("matchGrantsAI 가 throw 하면 500", async () => {
    matchGrantsAIMock = vi.fn().mockRejectedValue(new Error("AI 호출 실패"));
    const res = await callRoute(validBody);
    expect(res.status).toBe(500);
  });

  it("getAllGrants 가 throw 하면 500", async () => {
    getAllGrantsMock = vi.fn().mockRejectedValue(new Error("DB 오류"));
    const res = await callRoute(validBody);
    expect(res.status).toBe(500);
  });

  it("500 응답에 한국어 에러 메시지", async () => {
    matchGrantsAIMock = vi.fn().mockRejectedValue(new Error("x"));
    const res = await callRoute(validBody);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("매칭 분석 중 오류가 발생했습니다.");
  });

  it("500 응답에 영문 에러는 노출되지 않음 (사용자 친화)", async () => {
    matchGrantsAIMock = vi.fn().mockRejectedValue(
      new Error("Internal Server Error: stack trace blabla")
    );
    const res = await callRoute(validBody);
    const body = await res.json() as { error: string };
    expect(body.error).not.toContain("stack");
    expect(body.error).not.toContain("Internal");
  });

  it("잘못된 JSON 본문 시 500", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "INVALID_JSON{",
    });
    const res = await POST(request as Parameters<typeof POST>[0]);
    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 다양한 condition 시나리오
// ─────────────────────────────────────────────────────────────────────────────

describe("/api/match POST: 다양한 condition", () => {
  it("17개 지역 모두 200 응답", async () => {
    const regions = [
      "서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산",
      "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
    ];
    for (const region of regions) {
      const res = await callRoute({ ...validBody, region });
      expect(res.status).toBe(200);
    }
  });

  it("모든 업종에서 200 응답", async () => {
    const bizTypes = [
      "게임", "웹툰·만화", "IT·소프트웨어", "음식점·외식", "건설",
    ];
    for (const bizType of bizTypes) {
      const res = await callRoute({ ...validBody, bizType });
      expect(res.status).toBe(200);
    }
  });

  it("긴 summary 도 정상 처리", async () => {
    const longSummary = "AI ".repeat(500);
    const res = await callRoute({ ...validBody, summary: longSummary });
    expect(res.status).toBe(200);
  });

  it("많은 키워드 (50개)도 정상 처리", async () => {
    const manyKw = Array.from({ length: 50 }, (_, i) => `kw${i}`);
    const res = await callRoute({ ...validBody, keywords: manyKw });
    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 회귀 방지
// ─────────────────────────────────────────────────────────────────────────────

describe("/api/match POST: 회귀 방지", () => {
  it("400 에러 메시지 회귀: 정확한 문자열 유지", async () => {
    const res = await callRoute({});
    const body = await res.json() as { error: string };
    expect(body.error).toBe("모든 조건을 입력해주세요.");
  });

  it("500 에러 메시지 회귀: 정확한 문자열 유지", async () => {
    matchGrantsAIMock = vi.fn().mockRejectedValue(new Error("x"));
    const res = await callRoute(validBody);
    const body = await res.json() as { error: string };
    expect(body.error).toBe("매칭 분석 중 오류가 발생했습니다.");
  });

  it("source 가능 값 회귀: 'seed' 또는 'live+seed' 만", async () => {
    const res = await callRoute(validBody);
    const body = await res.json() as { source: string };
    expect(["seed", "live+seed"]).toContain(body.source);
  });

  it("응답 구조 회귀: 3개 필드만 (matches/totalGrants/source)", async () => {
    const res = await callRoute(validBody);
    const body = await res.json() as Record<string, unknown>;
    const keys = Object.keys(body).sort();
    expect(keys).toEqual(["matches", "source", "totalGrants"]);
  });

  it("실제 grant 데이터가 matches 에 그대로 전달됨", async () => {
    const customMatch = {
      ...makeMatch("custom-id"),
      reason: "특별한 매칭 사유",
    };
    matchGrantsAIMock = vi.fn().mockResolvedValue([customMatch]);
    const res = await callRoute(validBody);
    const body = await res.json() as { matches: MatchResult[] };
    expect(body.matches[0].reason).toBe("특별한 매칭 사유");
  });

  it("biz- 검출 회귀: 'biz' 만으로는 매칭 안 됨 (정확히 'biz-')", async () => {
    getAllGrantsMock = vi.fn().mockResolvedValue([
      makeGrant("bizness-001"), // biz 로 시작하지만 'biz-' 아님
    ]);
    const res = await callRoute(validBody);
    const body = await res.json() as { source: string };
    expect(body.source).toBe("seed"); // 'biz-' 아니므로
  });

  it("응답은 JSON 형식", async () => {
    const res = await callRoute(validBody);
    // Response 객체이므로 json() 호출 가능
    await expect(res.json()).resolves.toBeTruthy();
  });
});
