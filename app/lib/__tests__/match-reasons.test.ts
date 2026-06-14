/**
 * match-reasons.ts 종합 테스트
 * 담당: yungyeonghye-maker
 * 도메인: 매칭 이유 생성 로직
 */

import { describe, it, expect } from "vitest";
import { getMatchReasons } from "../match-reasons";
import type { Grant, UserCondition } from "../types";

function makeGrant(overrides: Partial<Grant> = {}): Grant {
  return {
    id: "G001",
    title: "IT 지원사업",
    orgName: "중소기업부",
    category: "창업",
    region: "전국",
    targetBizTypes: ["IT·소프트웨어"],
    amount: "1억원",
    deadline: "상시",
    description: "IT 기업 지원",
    requirements: "업력 3년 이내",
    url: "https://example.com",
    ...overrides,
  };
}

function makeCondition(overrides: Partial<UserCondition> = {}): UserCondition {
  return {
    bizType: "IT·소프트웨어",
    revenue: "1억~3억",
    region: "서울",
    bizAge: "1~3년",
    ceoAge: "만 30~39세",
    ...overrides,
  };
}

// ── 지역 매칭 이유 ─────────────────────────────────────────────────────────────

describe("getMatchReasons - 지역", () => {
  it("전국 지원사업이면 '전국 지원' 포함", () => {
    const grant = makeGrant({ region: "전국" });
    const result = getMatchReasons(grant, makeCondition({ region: "부산" }));
    expect(result).toContain("전국 지원");
  });

  it("지역 일치이면 '지역 일치' 포함", () => {
    const grant = makeGrant({ region: "서울" });
    const result = getMatchReasons(grant, makeCondition({ region: "서울" }));
    expect(result).toContain("지역 일치");
  });

  it("지역 불일치이면 지역 관련 이유 없음", () => {
    const grant = makeGrant({ region: "부산" });
    const result = getMatchReasons(grant, makeCondition({ region: "서울" }));
    expect(result).not.toContain("지역 일치");
    expect(result).not.toContain("전국 지원");
  });

  it("전국이면 지역 일치 없이 전국 지원만", () => {
    const grant = makeGrant({ region: "전국" });
    const result = getMatchReasons(grant, makeCondition({ region: "제주" }));
    expect(result).toContain("전국 지원");
    expect(result).not.toContain("지역 일치");
  });

  it("경기 지원사업 + 경기 사용자 = '지역 일치'", () => {
    const grant = makeGrant({ region: "경기" });
    const result = getMatchReasons(grant, makeCondition({ region: "경기" }));
    expect(result).toContain("지역 일치");
  });

  it("대전 지원사업 + 대전 사용자 = '지역 일치'", () => {
    const grant = makeGrant({ region: "대전" });
    const result = getMatchReasons(grant, makeCondition({ region: "대전" }));
    expect(result).toContain("지역 일치");
  });
});

// ── 업종 매칭 이유 ─────────────────────────────────────────────────────────────

describe("getMatchReasons - 업종", () => {
  it("업종 일치이면 '업종 일치' 포함", () => {
    const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"] });
    const result = getMatchReasons(grant, makeCondition({ bizType: "IT·소프트웨어" }));
    expect(result).toContain("업종 일치");
  });

  it("업종 불일치이면 '업종 일치' 없음", () => {
    const grant = makeGrant({ targetBizTypes: ["건설"] });
    const result = getMatchReasons(grant, makeCondition({ bizType: "IT·소프트웨어" }));
    expect(result).not.toContain("업종 일치");
  });

  it("다중 업종 중 일치이면 '업종 일치'", () => {
    const grant = makeGrant({ targetBizTypes: ["게임", "IT·소프트웨어", "서비스업"] });
    const result = getMatchReasons(grant, makeCondition({ bizType: "IT·소프트웨어" }));
    expect(result).toContain("업종 일치");
  });

  it("게임 업종 일치", () => {
    const grant = makeGrant({ targetBizTypes: ["게임"] });
    const result = getMatchReasons(grant, makeCondition({ bizType: "게임" }));
    expect(result).toContain("업종 일치");
  });

  it("음식점·외식 업종 일치", () => {
    const grant = makeGrant({ targetBizTypes: ["음식점·외식"] });
    const result = getMatchReasons(grant, makeCondition({ bizType: "음식점·외식" }));
    expect(result).toContain("업종 일치");
  });

  it("targetBizTypes 빈 배열이면 업종 일치 없음", () => {
    const grant = makeGrant({ targetBizTypes: [] });
    const result = getMatchReasons(grant, makeCondition({ bizType: "IT·소프트웨어" }));
    expect(result).not.toContain("업종 일치");
  });
});

// ── 업력 조건 매칭 이유 ────────────────────────────────────────────────────────

describe("getMatchReasons - 업력 조건", () => {
  it("업력 조건 없으면 '업력 조건 충족' 포함", () => {
    const grant = makeGrant(); // minBizAge/maxBizAge 없음
    const result = getMatchReasons(grant, makeCondition({ bizAge: "7년 이상" }));
    expect(result).toContain("업력 조건 충족");
  });

  it("업력 범위 내이면 '업력 조건 충족'", () => {
    const grant = makeGrant({ minBizAge: 1, maxBizAge: 5 });
    const result = getMatchReasons(grant, makeCondition({ bizAge: "3~5년" })); // 4년 → 범위 내
    expect(result).toContain("업력 조건 충족");
  });

  it("업력 초과이면 '업력 조건 충족' 없음", () => {
    const grant = makeGrant({ maxBizAge: 3 });
    const result = getMatchReasons(grant, makeCondition({ bizAge: "7년 이상" })); // 8 > 3
    expect(result).not.toContain("업력 조건 충족");
  });

  it("업력 미달이면 '업력 조건 충족' 없음", () => {
    const grant = makeGrant({ minBizAge: 3 });
    const result = getMatchReasons(grant, makeCondition({ bizAge: "1년 미만" })); // 0.5 < 3
    expect(result).not.toContain("업력 조건 충족");
  });

  it("예비창업자 업력 0, minBizAge=0이면 충족", () => {
    const grant = makeGrant({ minBizAge: 0, maxBizAge: 1 });
    const result = getMatchReasons(grant, makeCondition({ bizAge: "예비창업자" }));
    expect(result).toContain("업력 조건 충족");
  });

  it("maxBizAge만 있고 범위 내이면 충족", () => {
    const grant = makeGrant({ maxBizAge: 5 });
    const result = getMatchReasons(grant, makeCondition({ bizAge: "3~5년" }));
    expect(result).toContain("업력 조건 충족");
  });

  it("minBizAge만 있고 범위 내이면 충족", () => {
    const grant = makeGrant({ minBizAge: 3 });
    const result = getMatchReasons(grant, makeCondition({ bizAge: "3~5년" }));
    expect(result).toContain("업력 조건 충족");
  });
});

// ── 사업 내용 관련 이유 ────────────────────────────────────────────────────────

describe("getMatchReasons - 사업 내용 관련", () => {
  it("summary/keywords 없으면 '사업 내용 관련' 없음", () => {
    const grant = makeGrant({ title: "AI 지원사업", description: "AI 기술 개발", requirements: "AI 기업" });
    const result = getMatchReasons(grant, makeCondition());
    expect(result).not.toContain("사업 내용 관련");
  });

  it("키워드가 충분히 겹치면 '사업 내용 관련' 포함", () => {
    const grant = makeGrant({
      title: "AI 인공지능 스타트업 지원",
      description: "AI 딥러닝 머신러닝 기술 개발 지원",
      requirements: "AI 기반 서비스",
    });
    const result = getMatchReasons(grant, makeCondition({
      summary: "AI 인공지능 딥러닝 스타트업",
      keywords: ["AI", "인공지능", "딥러닝", "머신러닝"],
    }));
    expect(result).toContain("사업 내용 관련");
  });

  it("키워드 겹침 낮으면 '사업 내용 관련' 없음", () => {
    const grant = makeGrant({
      title: "농업 기술 지원",
      description: "농업 혁신 기술 개발",
      requirements: "농업 기업",
    });
    const result = getMatchReasons(grant, makeCondition({
      summary: "패션 뷰티 화장품 플랫폼",
      keywords: ["패션", "뷰티", "화장품"],
    }));
    expect(result).not.toContain("사업 내용 관련");
  });

  it("keywords만 있고 겹치면 포함", () => {
    const grant = makeGrant({
      title: "IT 소프트웨어 개발 지원",
      description: "소프트웨어 개발 기업 지원",
      requirements: "소프트웨어 기업",
    });
    const result = getMatchReasons(grant, makeCondition({
      keywords: ["IT", "소프트웨어", "개발"],
    }));
    expect(result).toContain("사업 내용 관련");
  });

  it("summary만 있고 겹치면 포함", () => {
    const grant = makeGrant({
      title: "IT 소프트웨어 지원사업",
      description: "소프트웨어 스타트업 지원",
      requirements: "IT 기업",
    });
    const result = getMatchReasons(grant, makeCondition({
      summary: "소프트웨어 스타트업 IT 서비스",
    }));
    expect(result).toContain("사업 내용 관련");
  });

  it("빈 summary + 빈 keywords이면 없음", () => {
    const grant = makeGrant();
    const result = getMatchReasons(grant, makeCondition({
      summary: "",
      keywords: [],
    }));
    expect(result).not.toContain("사업 내용 관련");
  });
});

// ── 결과 형식 ─────────────────────────────────────────────────────────────────

describe("getMatchReasons - 결과 형식", () => {
  it("결과는 항상 배열", () => {
    const result = getMatchReasons(makeGrant(), makeCondition());
    expect(Array.isArray(result)).toBe(true);
  });

  it("결과 배열의 각 항목은 문자열", () => {
    const result = getMatchReasons(makeGrant(), makeCondition());
    for (const reason of result) {
      expect(typeof reason).toBe("string");
    }
  });

  it("최악의 매칭이어도 빈 배열 반환 (오류 없음)", () => {
    const grant = makeGrant({ region: "부산", targetBizTypes: ["건설"], maxBizAge: 1 });
    const condition = makeCondition({ region: "제주", bizType: "IT·소프트웨어", bizAge: "7년 이상" });
    const result = getMatchReasons(grant, condition);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it("완벽 매칭이면 여러 이유 반환", () => {
    const grant = makeGrant({
      region: "서울",
      targetBizTypes: ["IT·소프트웨어"],
      title: "IT 스타트업 지원",
      description: "IT 개발 스타트업 지원",
      requirements: "IT 기업",
    });
    const condition = makeCondition({
      region: "서울",
      bizType: "IT·소프트웨어",
      bizAge: "1~3년",
      summary: "IT 개발 스타트업",
      keywords: ["IT", "개발"],
    });
    const result = getMatchReasons(grant, condition);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it("중복 이유 없음", () => {
    const grant = makeGrant({ region: "전국", targetBizTypes: ["IT·소프트웨어"] });
    const result = getMatchReasons(grant, makeCondition({ bizType: "IT·소프트웨어" }));
    const unique = new Set(result);
    expect(unique.size).toBe(result.length);
  });
});

// ── 엣지 케이스 ────────────────────────────────────────────────────────────────

describe("getMatchReasons - 엣지 케이스", () => {
  it("description/requirements 비어있어도 오류 없음", () => {
    const grant = makeGrant({ description: "", requirements: "" });
    const condition = makeCondition({ summary: "IT 스타트업", keywords: ["IT"] });
    expect(() => getMatchReasons(grant, condition)).not.toThrow();
  });

  it("키워드에 특수문자 포함돼도 오류 없음", () => {
    const grant = makeGrant();
    const condition = makeCondition({ summary: "AI/ML & 딥러닝 (스타트업)" });
    expect(() => getMatchReasons(grant, condition)).not.toThrow();
  });

  it("keywords 배열 비어있고 summary 있어도 처리", () => {
    const grant = makeGrant({ title: "스타트업 지원", description: "스타트업", requirements: "스타트업" });
    const condition = makeCondition({ summary: "스타트업", keywords: [] });
    expect(() => getMatchReasons(grant, condition)).not.toThrow();
  });

  it("targetBizTypes에 기타만 있고 업종 불일치이면 업종 일치 없음", () => {
    const grant = makeGrant({ targetBizTypes: ["기타"] });
    const condition = makeCondition({ bizType: "IT·소프트웨어" });
    const result = getMatchReasons(grant, condition);
    expect(result).not.toContain("업종 일치");
  });

  it("동일 입력 여러 번 호출해도 결과 동일", () => {
    const grant = makeGrant({ region: "서울", targetBizTypes: ["IT·소프트웨어"] });
    const condition = makeCondition({ region: "서울", bizType: "IT·소프트웨어" });
    const r1 = getMatchReasons(grant, condition);
    const r2 = getMatchReasons(grant, condition);
    expect(r1).toEqual(r2);
  });
});
