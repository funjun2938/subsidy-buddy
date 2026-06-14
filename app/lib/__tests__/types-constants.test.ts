/**
 * types.ts / 상수 종합 테스트
 * 담당: yungyeonghye-maker
 * 도메인: AI 엔진 타입 정의 / 상수 검증
 */

import { describe, it, expect } from "vitest";
import {
  BIZ_TYPES,
  REVENUE_RANGES,
  REGIONS,
} from "../types";

// ── BIZ_TYPES 검증 ──────────────────────────────────────────────────────────

describe("BIZ_TYPES 상수 검증", () => {
  it("BIZ_TYPES는 배열", () => {
    expect(Array.isArray(BIZ_TYPES)).toBe(true);
  });

  it("BIZ_TYPES 길이는 18개", () => {
    expect(BIZ_TYPES).toHaveLength(18);
  });

  it("IT·소프트웨어 포함", () => {
    expect(BIZ_TYPES).toContain("IT·소프트웨어");
  });

  it("게임 포함", () => {
    expect(BIZ_TYPES).toContain("게임");
  });

  it("웹툰·만화 포함", () => {
    expect(BIZ_TYPES).toContain("웹툰·만화");
  });

  it("영상·방송 포함", () => {
    expect(BIZ_TYPES).toContain("영상·방송");
  });

  it("음악 포함", () => {
    expect(BIZ_TYPES).toContain("음악");
  });

  it("공연·예술 포함", () => {
    expect(BIZ_TYPES).toContain("공연·예술");
  });

  it("콘텐츠·미디어 포함", () => {
    expect(BIZ_TYPES).toContain("콘텐츠·미디어");
  });

  it("바이오·헬스케어 포함", () => {
    expect(BIZ_TYPES).toContain("바이오·헬스케어");
  });

  it("제조 포함", () => {
    expect(BIZ_TYPES).toContain("제조");
  });

  it("서비스업 포함", () => {
    expect(BIZ_TYPES).toContain("서비스업");
  });

  it("소매·유통 포함", () => {
    expect(BIZ_TYPES).toContain("소매·유통");
  });

  it("음식점·외식 포함", () => {
    expect(BIZ_TYPES).toContain("음식점·외식");
  });

  it("교육 포함", () => {
    expect(BIZ_TYPES).toContain("교육");
  });

  it("패션·뷰티 포함", () => {
    expect(BIZ_TYPES).toContain("패션·뷰티");
  });

  it("건설 포함", () => {
    expect(BIZ_TYPES).toContain("건설");
  });

  it("농림수산 포함", () => {
    expect(BIZ_TYPES).toContain("농림수산");
  });

  it("환경·에너지 포함", () => {
    expect(BIZ_TYPES).toContain("환경·에너지");
  });

  it("기타 포함", () => {
    expect(BIZ_TYPES).toContain("기타");
  });

  it("모든 항목은 문자열", () => {
    for (const bt of BIZ_TYPES) {
      expect(typeof bt).toBe("string");
    }
  });

  it("중복 없음", () => {
    const unique = new Set(BIZ_TYPES);
    expect(unique.size).toBe(BIZ_TYPES.length);
  });

  it("모든 항목은 빈 문자열 아님", () => {
    for (const bt of BIZ_TYPES) {
      expect(bt.length).toBeGreaterThan(0);
    }
  });
});

// ── REVENUE_RANGES 검증 ─────────────────────────────────────────────────────

describe("REVENUE_RANGES 상수 검증", () => {
  it("REVENUE_RANGES는 배열", () => {
    expect(Array.isArray(REVENUE_RANGES)).toBe(true);
  });

  it("REVENUE_RANGES 길이는 6개", () => {
    expect(REVENUE_RANGES).toHaveLength(6);
  });

  it("5천만원 미만 포함", () => {
    expect(REVENUE_RANGES).toContain("5천만원 미만");
  });

  it("5천만~1억 포함", () => {
    expect(REVENUE_RANGES).toContain("5천만~1억");
  });

  it("1억~3억 포함", () => {
    expect(REVENUE_RANGES).toContain("1억~3억");
  });

  it("3억~5억 포함", () => {
    expect(REVENUE_RANGES).toContain("3억~5억");
  });

  it("5억~10억 포함", () => {
    expect(REVENUE_RANGES).toContain("5억~10억");
  });

  it("10억 이상 포함", () => {
    expect(REVENUE_RANGES).toContain("10억 이상");
  });

  it("모든 항목은 문자열", () => {
    for (const r of REVENUE_RANGES) {
      expect(typeof r).toBe("string");
    }
  });

  it("중복 없음", () => {
    const unique = new Set(REVENUE_RANGES);
    expect(unique.size).toBe(REVENUE_RANGES.length);
  });
});

// ── REGIONS 검증 ────────────────────────────────────────────────────────────

describe("REGIONS 상수 검증", () => {
  it("REGIONS는 배열", () => {
    expect(Array.isArray(REGIONS)).toBe(true);
  });

  it("전국 포함", () => {
    expect(REGIONS).toContain("전국");
  });

  it("서울 포함", () => {
    expect(REGIONS).toContain("서울");
  });

  it("경기 포함", () => {
    expect(REGIONS).toContain("경기");
  });

  it("인천 포함", () => {
    expect(REGIONS).toContain("인천");
  });

  it("부산 포함", () => {
    expect(REGIONS).toContain("부산");
  });

  it("대구 포함", () => {
    expect(REGIONS).toContain("대구");
  });

  it("광주 포함", () => {
    expect(REGIONS).toContain("광주");
  });

  it("대전 포함", () => {
    expect(REGIONS).toContain("대전");
  });

  it("울산 포함", () => {
    expect(REGIONS).toContain("울산");
  });

  it("세종 포함", () => {
    expect(REGIONS).toContain("세종");
  });

  it("강원 포함", () => {
    expect(REGIONS).toContain("강원");
  });

  it("충북 포함", () => {
    expect(REGIONS).toContain("충북");
  });

  it("충남 포함", () => {
    expect(REGIONS).toContain("충남");
  });

  it("전북 포함", () => {
    expect(REGIONS).toContain("전북");
  });

  it("전남 포함", () => {
    expect(REGIONS).toContain("전남");
  });

  it("경북 포함", () => {
    expect(REGIONS).toContain("경북");
  });

  it("경남 포함", () => {
    expect(REGIONS).toContain("경남");
  });

  it("제주 포함", () => {
    expect(REGIONS).toContain("제주");
  });

  it("모든 항목은 문자열", () => {
    for (const r of REGIONS) {
      expect(typeof r).toBe("string");
    }
  });

  it("중복 없음", () => {
    const unique = new Set(REGIONS);
    expect(unique.size).toBe(REGIONS.length);
  });

  it("전국이 첫 번째", () => {
    expect(REGIONS[0]).toBe("전국");
  });
});

// ── Grant 인터페이스 구조 검증 ──────────────────────────────────────────────

describe("Grant 인터페이스 구조 검증", () => {
  it("필수 필드를 포함한 Grant 객체 생성 가능", () => {
    const grant = {
      id: "G001",
      title: "테스트",
      orgName: "기관",
      category: "창업",
      region: "서울",
      targetBizTypes: ["IT·소프트웨어"],
      amount: "1억원",
      deadline: "상시",
      description: "설명",
      requirements: "요건",
      url: "https://example.com",
    };
    expect(grant.id).toBe("G001");
    expect(Array.isArray(grant.targetBizTypes)).toBe(true);
  });

  it("선택 필드(minBizAge/maxBizAge) 없어도 유효", () => {
    const grant = {
      id: "G001",
      title: "테스트",
      orgName: "기관",
      category: "창업",
      region: "서울",
      targetBizTypes: ["IT·소프트웨어"],
      amount: "1억원",
      deadline: "상시",
      description: "설명",
      requirements: "요건",
      url: "https://example.com",
    };
    expect(grant.id).toBeDefined();
    expect((grant as Record<string, unknown>).minBizAge).toBeUndefined();
    expect((grant as Record<string, unknown>).maxBizAge).toBeUndefined();
  });

  it("deadline이 '상시'인 grant 유효", () => {
    const grant = {
      id: "G001",
      title: "상시 지원",
      orgName: "기관",
      category: "창업",
      region: "전국",
      targetBizTypes: ["IT·소프트웨어"],
      amount: "5천만원",
      deadline: "상시",
      description: "설명",
      requirements: "요건",
      url: "https://example.com",
    };
    expect(grant.deadline).toBe("상시");
  });

  it("targetBizTypes가 여러 업종 포함 가능", () => {
    const grant = {
      id: "G001",
      title: "다업종",
      orgName: "기관",
      category: "창업",
      region: "전국",
      targetBizTypes: ["IT·소프트웨어", "게임", "서비스업"],
      amount: "1억원",
      deadline: "상시",
      description: "설명",
      requirements: "요건",
      url: "https://example.com",
    };
    expect(grant.targetBizTypes).toHaveLength(3);
  });
});

// ── UserCondition 인터페이스 구조 검증 ─────────────────────────────────────

describe("UserCondition 인터페이스 구조 검증", () => {
  it("필수 필드를 포함한 UserCondition 생성 가능", () => {
    const condition = {
      bizType: "IT·소프트웨어",
      revenue: "1억~3억",
      region: "서울",
      bizAge: "1~3년",
      ceoAge: "만 30~39세",
    };
    expect(condition.bizType).toBeDefined();
    expect(condition.revenue).toBeDefined();
  });

  it("선택 필드(summary/keywords) 없어도 유효", () => {
    const condition = {
      bizType: "IT·소프트웨어",
      revenue: "1억~3억",
      region: "서울",
      bizAge: "1~3년",
      ceoAge: "만 30~39세",
    };
    expect((condition as Record<string, unknown>).summary).toBeUndefined();
    expect((condition as Record<string, unknown>).keywords).toBeUndefined();
  });

  it("summary 있는 UserCondition 유효", () => {
    const condition = {
      bizType: "IT·소프트웨어",
      revenue: "1억~3억",
      region: "서울",
      bizAge: "1~3년",
      ceoAge: "만 30~39세",
      summary: "AI 기반 서비스",
    };
    expect(condition.summary).toBe("AI 기반 서비스");
  });

  it("keywords 배열 있는 UserCondition 유효", () => {
    const condition = {
      bizType: "IT·소프트웨어",
      revenue: "1억~3억",
      region: "서울",
      bizAge: "1~3년",
      ceoAge: "만 30~39세",
      keywords: ["AI", "ML", "딥러닝"],
    };
    expect(Array.isArray(condition.keywords)).toBe(true);
    expect(condition.keywords).toHaveLength(3);
  });
});

// ── GrantAnalysis 인터페이스 구조 검증 ─────────────────────────────────────

describe("GrantAnalysis 인터페이스 구조 검증", () => {
  it("eligibility는 high/medium/low 중 하나", () => {
    const validValues = ["high", "medium", "low"];
    for (const v of validValues) {
      const analysis = { eligibility: v as "high" | "medium" | "low", reason: "이유", strategy: "전략", risks: "위험" };
      expect(validValues).toContain(analysis.eligibility);
    }
  });

  it("reason은 문자열", () => {
    const analysis = { eligibility: "medium" as const, reason: "자격 분석 내용", strategy: "", risks: "" };
    expect(typeof analysis.reason).toBe("string");
  });

  it("strategy는 문자열", () => {
    const analysis = { eligibility: "high" as const, reason: "분석", strategy: "조기 신청 권장", risks: "" };
    expect(typeof analysis.strategy).toBe("string");
  });

  it("risks는 문자열", () => {
    const analysis = { eligibility: "low" as const, reason: "분석", strategy: "", risks: "경쟁률 높음" };
    expect(typeof analysis.risks).toBe("string");
  });
});

// ── MatchResult 인터페이스 구조 검증 ────────────────────────────────────────

describe("MatchResult 인터페이스 구조 검증", () => {
  const sampleGrant = {
    id: "G001",
    title: "테스트",
    orgName: "기관",
    category: "창업",
    region: "전국",
    targetBizTypes: ["IT·소프트웨어"],
    amount: "1억원",
    deadline: "상시",
    description: "설명",
    requirements: "요건",
    url: "https://example.com",
  };

  it("MatchResult의 matchScore는 high/medium/low 중 하나", () => {
    const result = { grant: sampleGrant, matchScore: "high" as const, reason: "이유", matchReasons: [] };
    expect(["high", "medium", "low"]).toContain(result.matchScore);
  });

  it("reason은 문자열", () => {
    const result = { grant: sampleGrant, matchScore: "medium" as const, reason: "매칭 이유", matchReasons: [] };
    expect(typeof result.reason).toBe("string");
  });

  it("matchReasons는 배열", () => {
    const result = { grant: sampleGrant, matchScore: "low" as const, reason: "이유", matchReasons: ["전국 지원", "업종 일치"] };
    expect(Array.isArray(result.matchReasons)).toBe(true);
  });

  it("matchReasons 없어도 유효", () => {
    const result = { grant: sampleGrant, matchScore: "high" as const, reason: "이유" };
    expect(result.grant).toBeDefined();
  });
});
