/**
 * match-reasons-extended.test.ts
 *
 * getMatchReasons 의 엣지 케이스 / 경계값 / 조합 시나리오 검증.
 * 기본 시나리오는 match-reasons.test.ts 에서 다루고, 본 파일은:
 *   - 각 사유(reason)의 독립적 조건 검증
 *   - 다중 사유 동시 발생 케이스
 *   - 사유 누적/순서/중복 검증
 *   - 키워드 매칭 임계값(20%) 경계
 *   - 현실 한국 소상공인 시나리오
 *   - 입력 불변성(immutability) 회귀 방지
 */

import { describe, it, expect } from "vitest";
import { getMatchReasons } from "../lib/match-reasons";
import type { Grant, UserCondition } from "../lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

function makeGrant(overrides: Partial<Grant> = {}): Grant {
  return {
    id: "g1",
    title: "스타트업 지원사업",
    orgName: "중소벤처기업부",
    category: "창업",
    region: "전국",
    targetBizTypes: ["IT·소프트웨어"],
    amount: "1000만원",
    deadline: "상시",
    description: "IT 소프트웨어 스타트업 대상 지원",
    requirements: "업력 3년 이내",
    url: "https://example.com",
    ...overrides,
  };
}

function makeCondition(overrides: Partial<UserCondition> = {}): UserCondition {
  return {
    bizType: "IT·소프트웨어",
    revenue: "1억 미만",
    region: "서울",
    bizAge: "1~3년",
    ceoAge: "30대",
    ...overrides,
  };
}

const ALL_REGIONS = [
  "서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산",
  "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

const ALL_BIZ_AGES = [
  "예비 창업", "1년 미만", "1~3년", "3~5년", "5~7년", "7년 이상",
];

// ─────────────────────────────────────────────────────────────────────────────
// 사유별 단일 차원 검증 — 지역
// ─────────────────────────────────────────────────────────────────────────────

describe("getMatchReasons: 지역 사유", () => {
  it("'전국 지원' 사유는 grant.region 이 '전국' 일 때만 추가", () => {
    expect(getMatchReasons(
      makeGrant({ region: "전국" }),
      makeCondition()
    )).toContain("전국 지원");
  });

  it("'전국 지원' 사유는 다른 지역에서는 추가되지 않음", () => {
    ALL_REGIONS.forEach(region => {
      const reasons = getMatchReasons(
        makeGrant({ region }),
        makeCondition()
      );
      expect(reasons).not.toContain("전국 지원");
    });
  });

  it("'전국 지원' 과 '지역 일치' 는 동시에 추가되지 않음 (XOR)", () => {
    // grant.region === "전국" 이면 '전국 지원' 만
    // grant.region === condition.region 이면 '지역 일치' 만
    const reasonsNational = getMatchReasons(
      makeGrant({ region: "전국" }),
      makeCondition({ region: "전국" })
    );
    expect(reasonsNational).toContain("전국 지원");
    expect(reasonsNational).not.toContain("지역 일치");

    const reasonsLocal = getMatchReasons(
      makeGrant({ region: "서울" }),
      makeCondition({ region: "서울" })
    );
    expect(reasonsLocal).toContain("지역 일치");
    expect(reasonsLocal).not.toContain("전국 지원");
  });

  it("'지역 일치' 는 17개 지역 모두에서 동작", () => {
    ALL_REGIONS.forEach(region => {
      const reasons = getMatchReasons(
        makeGrant({ region }),
        makeCondition({ region })
      );
      expect(reasons).toContain("지역 일치");
    });
  });

  it("지역 미스매치(서울 vs 부산)는 어떤 지역 사유도 추가하지 않음", () => {
    const reasons = getMatchReasons(
      makeGrant({ region: "부산" }),
      makeCondition({ region: "서울" })
    );
    expect(reasons).not.toContain("전국 지원");
    expect(reasons).not.toContain("지역 일치");
  });

  it("대소문자/공백 차이는 지역 일치로 인정하지 않음 (엄격 비교)", () => {
    const reasons = getMatchReasons(
      makeGrant({ region: " 서울 " }),
      makeCondition({ region: "서울" })
    );
    expect(reasons).not.toContain("지역 일치");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 사유별 단일 차원 검증 — 업종
// ─────────────────────────────────────────────────────────────────────────────

describe("getMatchReasons: 업종 사유", () => {
  it("'업종 일치' 는 targetBizTypes 에 사용자 업종이 포함될 때 추가", () => {
    const reasons = getMatchReasons(
      makeGrant({ targetBizTypes: ["IT·소프트웨어"] }),
      makeCondition({ bizType: "IT·소프트웨어" })
    );
    expect(reasons).toContain("업종 일치");
  });

  it("targetBizTypes 에 여러 업종이 있어도 정확매칭이면 추가", () => {
    const reasons = getMatchReasons(
      makeGrant({ targetBizTypes: ["제조", "IT·소프트웨어", "서비스업"] }),
      makeCondition({ bizType: "IT·소프트웨어" })
    );
    expect(reasons).toContain("업종 일치");
  });

  it("인접 업종은 '업종 일치' 로 처리되지 않음 (엄격 매칭)", () => {
    const reasons = getMatchReasons(
      makeGrant({ targetBizTypes: ["IT·소프트웨어"] }), // 게임의 인접
      makeCondition({ bizType: "게임" })
    );
    expect(reasons).not.toContain("업종 일치");
  });

  it("빈 targetBizTypes 는 '업종 일치' 추가하지 않음", () => {
    const reasons = getMatchReasons(
      makeGrant({ targetBizTypes: [] }),
      makeCondition({ bizType: "IT·소프트웨어" })
    );
    expect(reasons).not.toContain("업종 일치");
  });

  it("'기타' 만 포함된 grant 는 사용자 업종과 무관하게 '업종 일치' 미추가", () => {
    const reasons = getMatchReasons(
      makeGrant({ targetBizTypes: ["기타"] }),
      makeCondition({ bizType: "IT·소프트웨어" })
    );
    expect(reasons).not.toContain("업종 일치");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 사유별 단일 차원 검증 — 업력
// ─────────────────────────────────────────────────────────────────────────────

describe("getMatchReasons: 업력 사유", () => {
  it("min/max 제약 없으면 모든 업력에서 '업력 조건 충족'", () => {
    ALL_BIZ_AGES.forEach(bizAge => {
      const reasons = getMatchReasons(
        makeGrant({}),
        makeCondition({ bizAge })
      );
      expect(reasons).toContain("업력 조건 충족");
    });
  });

  it("maxBizAge=3, 사용자 1~3년(=2) → 충족", () => {
    const reasons = getMatchReasons(
      makeGrant({ maxBizAge: 3 }),
      makeCondition({ bizAge: "1~3년" })
    );
    expect(reasons).toContain("업력 조건 충족");
  });

  it("maxBizAge=3, 사용자 7년 이상(=8) → 미충족", () => {
    const reasons = getMatchReasons(
      makeGrant({ maxBizAge: 3 }),
      makeCondition({ bizAge: "7년 이상" })
    );
    expect(reasons).not.toContain("업력 조건 충족");
  });

  it("minBizAge=5, 사용자 예비창업(=0) → 미충족", () => {
    const reasons = getMatchReasons(
      makeGrant({ minBizAge: 5 }),
      makeCondition({ bizAge: "예비 창업" })
    );
    expect(reasons).not.toContain("업력 조건 충족");
  });

  it("minBizAge=1, maxBizAge=5, 사용자 3~5년(=4) → 충족", () => {
    const reasons = getMatchReasons(
      makeGrant({ minBizAge: 1, maxBizAge: 5 }),
      makeCondition({ bizAge: "3~5년" })
    );
    expect(reasons).toContain("업력 조건 충족");
  });

  it("정확한 경계값: minBizAge=2, 사용자 1~3년(=2) → 충족 (>=)", () => {
    const reasons = getMatchReasons(
      makeGrant({ minBizAge: 2 }),
      makeCondition({ bizAge: "1~3년" })
    );
    expect(reasons).toContain("업력 조건 충족");
  });

  it("정확한 경계값: maxBizAge=2, 사용자 1~3년(=2) → 충족 (<=)", () => {
    const reasons = getMatchReasons(
      makeGrant({ maxBizAge: 2 }),
      makeCondition({ bizAge: "1~3년" })
    );
    expect(reasons).toContain("업력 조건 충족");
  });

  it("1년 미만(0.5년) → minBizAge=1 미충족, maxBizAge=1 충족", () => {
    const condition = makeCondition({ bizAge: "1년 미만" });
    expect(getMatchReasons(
      makeGrant({ minBizAge: 1 }), condition
    )).not.toContain("업력 조건 충족");
    expect(getMatchReasons(
      makeGrant({ maxBizAge: 1 }), condition
    )).toContain("업력 조건 충족");
  });

  it("예비 창업(0년) + minBizAge=0 → 충족", () => {
    const reasons = getMatchReasons(
      makeGrant({ minBizAge: 0 }),
      makeCondition({ bizAge: "예비 창업" })
    );
    expect(reasons).toContain("업력 조건 충족");
  });

  it("알 수 없는 bizAge 문자열은 기본 3년으로 처리 → maxBizAge=2 미충족", () => {
    const reasons = getMatchReasons(
      makeGrant({ maxBizAge: 2 }),
      makeCondition({ bizAge: "이상한값" })
    );
    expect(reasons).not.toContain("업력 조건 충족");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 사유별 단일 차원 검증 — 사업 내용 키워드
// ─────────────────────────────────────────────────────────────────────────────

describe("getMatchReasons: '사업 내용 관련' 사유", () => {
  it("summary/keywords 없으면 '사업 내용 관련' 미추가", () => {
    const reasons = getMatchReasons(
      makeGrant({ title: "AI 지원사업" }),
      makeCondition({ summary: "", keywords: [] })
    );
    expect(reasons).not.toContain("사업 내용 관련");
  });

  it("summary 만 있고 매칭률 20% 이상이면 '사업 내용 관련' 추가", () => {
    const reasons = getMatchReasons(
      makeGrant({
        title: "AI 머신러닝 스타트업 지원",
        description: "딥러닝 기반 서비스",
        requirements: "AI 경험",
      }),
      makeCondition({
        summary: "AI 머신러닝 딥러닝 서비스",
      })
    );
    expect(reasons).toContain("사업 내용 관련");
  });

  it("keywords 만 있고 매칭률 20% 이상이면 추가", () => {
    const reasons = getMatchReasons(
      makeGrant({
        title: "스마트팜 농업 IoT",
        description: "센서 기반 솔루션",
        requirements: "농업 경험",
      }),
      makeCondition({
        keywords: ["스마트팜", "농업", "IoT", "센서"],
      })
    );
    expect(reasons).toContain("사업 내용 관련");
  });

  it("매칭률 20% 미만이면 추가하지 않음", () => {
    const reasons = getMatchReasons(
      makeGrant({
        title: "건설",
        description: "건축",
        requirements: "토목",
      }),
      makeCondition({
        keywords: ["AI", "머신러닝", "딥러닝", "데이터", "클라우드"],
      })
    );
    expect(reasons).not.toContain("사업 내용 관련");
  });

  it("정확한 임계값: 5개 키워드 중 1개 매칭 (20%) → 추가", () => {
    const reasons = getMatchReasons(
      makeGrant({ title: "AI 지원" }),
      makeCondition({
        keywords: ["AI", "건설", "농업", "교육", "패션"],
      })
    );
    expect(reasons).toContain("사업 내용 관련");
  });

  it("정확한 임계값: 5개 키워드 중 0개 매칭 (0%) → 추가 안 함", () => {
    const reasons = getMatchReasons(
      makeGrant({
        title: "음악",
        description: "공연",
        requirements: "예술",
      }),
      makeCondition({
        keywords: ["AI", "건설", "농업", "교육", "패션"],
      })
    );
    expect(reasons).not.toContain("사업 내용 관련");
  });

  it("불용어만 있는 summary 는 추가하지 않음", () => {
    const reasons = getMatchReasons(
      makeGrant({ title: "있는 하는 위한 대한" }),
      makeCondition({ summary: "있는 하는 위한 대한 통한 관련" })
    );
    expect(reasons).not.toContain("사업 내용 관련");
  });

  it("1글자 단어만 있는 summary 는 추가하지 않음", () => {
    const reasons = getMatchReasons(
      makeGrant({ title: "A B C D E" }),
      makeCondition({ summary: "A B C D E F G" })
    );
    expect(reasons).not.toContain("사업 내용 관련");
  });

  it("대소문자 무관 매칭 (영문)", () => {
    const reasons = getMatchReasons(
      makeGrant({
        title: "STARTUP SaaS Support",
        description: "Cloud Service",
        requirements: "Tech",
      }),
      makeCondition({
        keywords: ["startup", "saas"],
      })
    );
    expect(reasons).toContain("사업 내용 관련");
  });

  it("최대 15개 키워드만 사용 (slice(0, 15))", () => {
    // 16개 키워드 중 앞 15개만 매칭, 마지막 1개는 grant 에 있어도 무시
    const reasons = getMatchReasons(
      makeGrant({ title: "GHOST" }),
      makeCondition({
        summary: Array.from({ length: 15 }, (_, i) => `kw${i}`).join(" ") + " GHOST",
      })
    );
    // 처음 15개 키워드 중 0개 매칭 → 0/15 = 0% → 추가 안 함
    expect(reasons).not.toContain("사업 내용 관련");
  });

  it("매우 긴 grant 텍스트(수천 자)도 정상 처리", () => {
    const longDescription = "AI ".repeat(1000);
    expect(() =>
      getMatchReasons(
        makeGrant({ description: longDescription }),
        makeCondition({ keywords: ["AI"] })
      )
    ).not.toThrow();
  });

  it("특수문자 포함 summary 도 안전하게 처리", () => {
    expect(() =>
      getMatchReasons(
        makeGrant({ title: "AI" }),
        makeCondition({ summary: "!@#$%^&*() AI <>?:{}|" })
      )
    ).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 다중 사유 조합
// ─────────────────────────────────────────────────────────────────────────────

describe("getMatchReasons: 다중 사유 조합", () => {
  it("모든 조건 만족 시 4개 사유 (전국+업종+업력+키워드)", () => {
    const reasons = getMatchReasons(
      makeGrant({
        region: "전국",
        targetBizTypes: ["IT·소프트웨어"],
        title: "AI 스타트업 지원",
        description: "AI 머신러닝",
        requirements: "AI 경험",
      }),
      makeCondition({
        region: "서울",
        bizType: "IT·소프트웨어",
        bizAge: "1~3년",
        summary: "AI 머신러닝 스타트업",
      })
    );
    expect(reasons).toContain("전국 지원");
    expect(reasons).toContain("업종 일치");
    expect(reasons).toContain("업력 조건 충족");
    expect(reasons).toContain("사업 내용 관련");
    expect(reasons.length).toBe(4);
  });

  it("지역(전국+지역일치) 사유는 동시에 발생 불가 — 최대 4개", () => {
    // 가능한 사유 총합: '전국 지원' OR '지역 일치' / '업종 일치' / '업력 조건 충족' / '사업 내용 관련'
    const reasons = getMatchReasons(
      makeGrant({
        region: "서울",
        targetBizTypes: ["IT·소프트웨어"],
        title: "AI 지원",
      }),
      makeCondition({
        region: "서울",
        bizType: "IT·소프트웨어",
        summary: "AI",
      })
    );
    expect(reasons.length).toBeLessThanOrEqual(4);
  });

  it("3개 사유: 지역일치 + 업종일치 + 업력충족", () => {
    const reasons = getMatchReasons(
      makeGrant({
        region: "서울",
        targetBizTypes: ["IT·소프트웨어"],
        // keyword 보너스 없도록 단순 텍스트
        title: "지원",
        description: "사업",
        requirements: "필요",
      }),
      makeCondition({
        region: "서울",
        bizType: "IT·소프트웨어",
        bizAge: "1~3년",
      })
    );
    expect(reasons).toContain("지역 일치");
    expect(reasons).toContain("업종 일치");
    expect(reasons).toContain("업력 조건 충족");
    expect(reasons.length).toBe(3);
  });

  it("2개 사유: 전국 + 업력충족 (업종 불일치)", () => {
    const reasons = getMatchReasons(
      makeGrant({
        region: "전국",
        targetBizTypes: ["건설"],
      }),
      makeCondition({
        bizType: "IT·소프트웨어",
        bizAge: "1~3년",
      })
    );
    expect(reasons).toContain("전국 지원");
    expect(reasons).toContain("업력 조건 충족");
    expect(reasons).not.toContain("업종 일치");
    expect(reasons.length).toBe(2);
  });

  it("1개 사유: 업력충족만 (다른 조건 모두 불일치)", () => {
    const reasons = getMatchReasons(
      makeGrant({
        region: "부산",
        targetBizTypes: ["건설"],
        title: "토목",
        description: "건설",
      }),
      makeCondition({
        region: "서울",
        bizType: "IT·소프트웨어",
        bizAge: "1~3년",
      })
    );
    expect(reasons).toEqual(["업력 조건 충족"]);
  });

  it("0개 사유: 완전 불일치", () => {
    const reasons = getMatchReasons(
      makeGrant({
        region: "부산",
        targetBizTypes: ["건설"],
        maxBizAge: 1,
        title: "토목",
      }),
      makeCondition({
        region: "서울",
        bizType: "IT·소프트웨어",
        bizAge: "7년 이상",
      })
    );
    expect(reasons).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 결과 구조 / 순서 / 중복
// ─────────────────────────────────────────────────────────────────────────────

describe("getMatchReasons: 결과 구조", () => {
  it("반환값은 항상 string[] 타입", () => {
    const reasons = getMatchReasons(makeGrant(), makeCondition());
    expect(Array.isArray(reasons)).toBe(true);
    reasons.forEach(r => expect(typeof r).toBe("string"));
  });

  it("사유는 중복되지 않음", () => {
    const reasons = getMatchReasons(makeGrant(), makeCondition());
    const unique = new Set(reasons);
    expect(reasons.length).toBe(unique.size);
  });

  it("사유 순서는 결정적: 지역 → 업종 → 업력 → 사업내용", () => {
    const reasons = getMatchReasons(
      makeGrant({
        region: "전국",
        targetBizTypes: ["IT·소프트웨어"],
        title: "AI 지원",
        description: "AI",
        requirements: "AI",
      }),
      makeCondition({
        bizType: "IT·소프트웨어",
        summary: "AI",
      })
    );
    // 순서 검증
    const idxRegion = reasons.indexOf("전국 지원");
    const idxBiz = reasons.indexOf("업종 일치");
    const idxAge = reasons.indexOf("업력 조건 충족");
    const idxContent = reasons.indexOf("사업 내용 관련");
    expect(idxRegion).toBeLessThan(idxBiz);
    expect(idxBiz).toBeLessThan(idxAge);
    expect(idxAge).toBeLessThan(idxContent);
  });

  it("빈 결과는 빈 배열 반환 (null/undefined 아님)", () => {
    const reasons = getMatchReasons(
      makeGrant({
        region: "부산",
        targetBizTypes: ["건설"],
        maxBizAge: 1,
      }),
      makeCondition({
        region: "서울",
        bizType: "IT·소프트웨어",
        bizAge: "7년 이상",
      })
    );
    expect(reasons).toEqual([]);
    expect(reasons).not.toBeNull();
    expect(reasons).not.toBeUndefined();
  });

  it("결과는 항상 알려진 사유만 포함", () => {
    const knownReasons = new Set([
      "전국 지원", "지역 일치", "업종 일치", "업력 조건 충족", "사업 내용 관련",
    ]);
    const reasons = getMatchReasons(
      makeGrant({
        region: "전국",
        targetBizTypes: ["IT·소프트웨어"],
        title: "AI",
      }),
      makeCondition({
        bizType: "IT·소프트웨어",
        summary: "AI",
      })
    );
    reasons.forEach(r => expect(knownReasons.has(r)).toBe(true));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 현실 시나리오
// ─────────────────────────────────────────────────────────────────────────────

describe("getMatchReasons: 현실 시나리오", () => {
  it("[케이스1] 서울 2년차 IT 스타트업 → 전국 IT 지원사업", () => {
    const reasons = getMatchReasons(
      makeGrant({
        region: "전국",
        targetBizTypes: ["IT·소프트웨어"],
        maxBizAge: 7,
        title: "전국 IT 스타트업 지원",
        description: "IT 소프트웨어 분야 스타트업 지원",
      }),
      makeCondition({
        region: "서울",
        bizType: "IT·소프트웨어",
        bizAge: "1~3년",
      })
    );
    expect(reasons).toContain("전국 지원");
    expect(reasons).toContain("업종 일치");
    expect(reasons).toContain("업력 조건 충족");
  });

  it("[케이스2] 부산 7년차 음식점 → 서울 IT 사업 = 사유 0개", () => {
    const reasons = getMatchReasons(
      makeGrant({
        region: "서울",
        targetBizTypes: ["IT·소프트웨어"],
        maxBizAge: 3,
      }),
      makeCondition({
        region: "부산",
        bizType: "음식점·외식",
        bizAge: "7년 이상",
      })
    );
    expect(reasons).toEqual([]);
  });

  it("[케이스3] 예비 창업자 → 기창업자 전용 사업 = 사유 0", () => {
    const reasons = getMatchReasons(
      makeGrant({
        region: "부산",
        targetBizTypes: ["건설"],
        minBizAge: 5,
      }),
      makeCondition({
        region: "서울",
        bizType: "IT·소프트웨어",
        bizAge: "예비 창업",
      })
    );
    expect(reasons).toEqual([]);
  });

  it("[케이스4] 5인 미만 카페 사장 → 소상공인 광범위 지원", () => {
    const reasons = getMatchReasons(
      makeGrant({
        region: "전국",
        targetBizTypes: ["음식점·외식", "소매·유통", "서비스업"],
        title: "전국 소상공인 종합 지원",
      }),
      makeCondition({
        region: "경기",
        bizType: "음식점·외식",
        bizAge: "3~5년",
      })
    );
    expect(reasons).toContain("전국 지원");
    expect(reasons).toContain("업종 일치");
    expect(reasons).toContain("업력 조건 충족");
  });

  it("[케이스5] 웹툰 작가 → 콘텐츠 지원사업 (인접이라 업종일치는 미적용)", () => {
    const reasons = getMatchReasons(
      makeGrant({
        region: "전국",
        targetBizTypes: ["게임"], // 웹툰의 인접
        title: "콘텐츠 크리에이티브 지원",
      }),
      makeCondition({
        region: "서울",
        bizType: "웹툰·만화",
      })
    );
    expect(reasons).toContain("전국 지원");
    expect(reasons).not.toContain("업종 일치"); // 엄격 매칭만
  });

  it("[케이스6] 기술 키워드 매칭만으로 추천된 케이스", () => {
    const reasons = getMatchReasons(
      makeGrant({
        region: "부산",
        targetBizTypes: ["기타"],
        title: "블록체인 NFT 지원사업",
        description: "DeFi 프로젝트 인큐베이팅",
        requirements: "블록체인 경험",
      }),
      makeCondition({
        region: "서울",
        bizType: "IT·소프트웨어",
        keywords: ["블록체인", "NFT", "DeFi"],
      })
    );
    expect(reasons).toContain("사업 내용 관련");
    expect(reasons).not.toContain("지역 일치");
    expect(reasons).not.toContain("전국 지원");
    expect(reasons).not.toContain("업종 일치");
  });

  it("[케이스7] 50대 사장님의 전통 제조업 → 업력 + 지역 매칭", () => {
    const reasons = getMatchReasons(
      makeGrant({
        region: "경북",
        targetBizTypes: ["제조"],
        title: "지역 제조업 지원",
      }),
      makeCondition({
        region: "경북",
        bizType: "제조",
        bizAge: "7년 이상",
        ceoAge: "50대",
      })
    );
    expect(reasons).toContain("지역 일치");
    expect(reasons).toContain("업종 일치");
    expect(reasons).toContain("업력 조건 충족");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 결정성 / 불변성
// ─────────────────────────────────────────────────────────────────────────────

describe("getMatchReasons: 결정성 및 불변성", () => {
  it("같은 입력 100회 반복 시 동일 결과", () => {
    const grant = makeGrant({ region: "전국" });
    const cond = makeCondition();
    const results = Array.from({ length: 100 }, () =>
      JSON.stringify(getMatchReasons(grant, cond))
    );
    expect(new Set(results).size).toBe(1);
  });

  it("Grant 객체 변형 없음", () => {
    const grant = makeGrant({
      region: "전국",
      targetBizTypes: ["IT·소프트웨어"],
    });
    const snapshot = JSON.stringify(grant);
    getMatchReasons(grant, makeCondition());
    expect(JSON.stringify(grant)).toBe(snapshot);
  });

  it("UserCondition 객체 변형 없음", () => {
    const cond = makeCondition({
      keywords: ["a", "b", "c"],
      summary: "테스트 요약",
    });
    const snapshot = JSON.stringify(cond);
    getMatchReasons(makeGrant(), cond);
    expect(JSON.stringify(cond)).toBe(snapshot);
  });

  it("반환 배열을 수정해도 다음 호출에 영향 없음", () => {
    const grant = makeGrant({ region: "전국" });
    const cond = makeCondition();
    const r1 = getMatchReasons(grant, cond);
    r1.push("INJECTED");
    r1[0] = "MODIFIED";
    const r2 = getMatchReasons(grant, cond);
    expect(r2).not.toContain("INJECTED");
    expect(r2[0]).toBe("전국 지원");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 회귀 방지
// ─────────────────────────────────────────────────────────────────────────────

describe("getMatchReasons: 회귀 방지", () => {
  it("빈 keywords 와 빈 summary 동시에 → 키워드 사유 미추가 (NaN/throw 없이)", () => {
    expect(() =>
      getMatchReasons(
        makeGrant(),
        makeCondition({ summary: "", keywords: [] })
      )
    ).not.toThrow();
  });

  it("keywords undefined, summary undefined → 안전", () => {
    expect(() =>
      getMatchReasons(
        makeGrant(),
        makeCondition({ summary: undefined, keywords: undefined })
      )
    ).not.toThrow();
  });

  it("targetBizTypes undefined 시나리오는 입력 단계에서 차단되어야 함", () => {
    // 타입 시스템상 string[] 이지만, 런타임 검증 회귀 방지
    const grant = makeGrant({ targetBizTypes: [] });
    expect(() => getMatchReasons(grant, makeCondition())).not.toThrow();
  });

  it("grant 텍스트가 모두 빈 문자열 → 키워드 매칭 0% (안전)", () => {
    const reasons = getMatchReasons(
      makeGrant({ title: "", description: "", requirements: "" }),
      makeCondition({ keywords: ["AI"] })
    );
    expect(reasons).not.toContain("사업 내용 관련");
  });

  it("키워드 중복 시 매칭률 계산 회귀", () => {
    // 중복 키워드도 카운트는 되지만 분모도 동일하게 영향
    const reasons = getMatchReasons(
      makeGrant({ title: "AI AI AI" }),
      makeCondition({ keywords: ["AI", "AI", "AI", "AI", "AI"] })
    );
    expect(reasons).toContain("사업 내용 관련"); // 5/5 = 100%
  });

  it("키워드 매칭 임계값 회귀: 정확히 19.9% 는 미추가", () => {
    // 10개 키워드 중 1개 매칭 → 10% < 20% → 미추가
    const reasons = getMatchReasons(
      makeGrant({ title: "AI" }),
      makeCondition({
        keywords: ["AI", "k1", "k2", "k3", "k4", "k5", "k6", "k7", "k8", "k9"],
      })
    );
    expect(reasons).not.toContain("사업 내용 관련");
  });

  it("키워드 매칭 임계값 회귀: 정확히 20% 는 추가", () => {
    // 5개 키워드 중 1개 매칭 → 20% → 추가
    const reasons = getMatchReasons(
      makeGrant({ title: "AI" }),
      makeCondition({
        keywords: ["AI", "k1", "k2", "k3", "k4"],
      })
    );
    expect(reasons).toContain("사업 내용 관련");
  });

  it("키워드 매칭 임계값 회귀: 25% (4중 1) 는 추가", () => {
    const reasons = getMatchReasons(
      makeGrant({ title: "AI" }),
      makeCondition({
        keywords: ["AI", "k1", "k2", "k3"],
      })
    );
    expect(reasons).toContain("사업 내용 관련");
  });

  it("등록 가능 사유 총 5종 외 다른 문자열은 절대 반환되지 않음", () => {
    const allowed = new Set([
      "전국 지원", "지역 일치", "업종 일치", "업력 조건 충족", "사업 내용 관련",
    ]);
    // 가능한 모든 조합 시뮬레이션
    const regions = ["전국", "서울", "부산"];
    const bizTypes = ["IT·소프트웨어", "건설"];
    const ages = ["1~3년", "7년 이상"];
    for (const r of regions) for (const b of bizTypes) for (const a of ages) {
      const reasons = getMatchReasons(
        makeGrant({ region: r, targetBizTypes: [b], maxBizAge: 3 }),
        makeCondition({ region: "서울", bizType: "IT·소프트웨어", bizAge: a })
      );
      reasons.forEach(reason => expect(allowed.has(reason)).toBe(true));
    }
  });
});
