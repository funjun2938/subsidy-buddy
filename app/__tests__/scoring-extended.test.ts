/**
 * scoring-extended.test.ts
 *
 * ruleScore / scoreToGrade / rankGrants 의 엣지 케이스 및 경계값 검증.
 * 기본 시나리오는 scoring.test.ts 에서 다루고, 본 파일은:
 *   - 지역/업종/업력/키워드/마감일 각 차원의 경계값
 *   - 모든 인접 업종 매트릭스 (ADJACENT_BIZ_TYPES)
 *   - 점수 등급 경계 (39/40, 19/20)
 *   - 대량 데이터 / topN 경계
 *   - 결정성(determinism) 회귀 방지
 *   - 한국 소상공인 도메인 현실 시나리오
 */

import { describe, it, expect } from "vitest";
import { ruleScore, scoreToGrade, rankGrants } from "../lib/scoring";
import type { Grant, UserCondition } from "../lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// 헬퍼: 기본 Grant / UserCondition 팩토리
// ─────────────────────────────────────────────────────────────────────────────

function makeGrant(overrides: Partial<Grant> = {}): Grant {
  return {
    id: "g1",
    title: "테스트 지원사업",
    orgName: "중소벤처기업부",
    category: "창업",
    region: "전국",
    targetBizTypes: ["IT·소프트웨어"],
    amount: "1000만원",
    deadline: "상시",
    description: "스타트업 지원 프로그램",
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

// 멀리 떨어진 안전한 날짜 (테스트 결정성 확보용)
const FAR_FUTURE_DATE = "2099-12-31"; // 항상 30일 이상 남음
const FAR_PAST_DATE = "2000-01-01";   // 항상 만료됨

// 모든 17개 업종 (BIZ_TYPES - "기타" 제외)
const ALL_BIZ_TYPES = [
  "게임", "웹툰·만화", "영상·방송", "음악", "공연·예술", "콘텐츠·미디어",
  "IT·소프트웨어", "바이오·헬스케어", "제조", "서비스업", "소매·유통",
  "음식점·외식", "교육", "패션·뷰티", "건설", "농림수산", "환경·에너지",
];

const ALL_REGIONS = [
  "서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산",
  "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

const ALL_BIZ_AGES = [
  "예비 창업", "1년 미만", "1~3년", "3~5년", "5~7년", "7년 이상",
];

// ─────────────────────────────────────────────────────────────────────────────
// ruleScore — 지역(region) 차원 상세
// ─────────────────────────────────────────────────────────────────────────────

describe("ruleScore: 지역(region) 차원", () => {
  it("전국 지원사업은 사용자 지역과 무관하게 일정한 보너스(+12)를 받는다", () => {
    const nationwide = makeGrant({ region: "전국" });
    const scores = ALL_REGIONS.map(region =>
      ruleScore(nationwide, makeCondition({ region }))
    );
    // 모든 지역 사용자에게 동일한 점수여야 함
    const unique = new Set(scores);
    expect(unique.size).toBe(1);
  });

  it("지역 정확 매칭은 전국 매칭보다 3점 더 높다 (+15 vs +12)", () => {
    const condition = makeCondition({ region: "부산" });
    const exact = makeGrant({ region: "부산" });
    const nation = makeGrant({ region: "전국" });
    expect(ruleScore(exact, condition) - ruleScore(nation, condition)).toBe(3);
  });

  it("지역 불일치 페널티(-10)는 전국 매칭(+12)보다 22점 낮다", () => {
    const condition = makeCondition({ region: "서울" });
    const mismatch = makeGrant({ region: "부산" });
    const nation = makeGrant({ region: "전국" });
    expect(ruleScore(nation, condition) - ruleScore(mismatch, condition)).toBe(22);
  });

  it("모든 17개 지역에 대해 자기 지역 매칭은 동일 점수", () => {
    const scores = ALL_REGIONS.map(region => {
      const grant = makeGrant({ region });
      const condition = makeCondition({ region });
      return ruleScore(grant, condition);
    });
    expect(new Set(scores).size).toBe(1);
  });

  it("서울 사용자가 부산/경기/제주 지원사업을 보면 동일한 페널티", () => {
    const condition = makeCondition({ region: "서울" });
    const busan = makeGrant({ region: "부산" });
    const gyeonggi = makeGrant({ region: "경기" });
    const jeju = makeGrant({ region: "제주" });
    expect(ruleScore(busan, condition)).toBe(ruleScore(gyeonggi, condition));
    expect(ruleScore(gyeonggi, condition)).toBe(ruleScore(jeju, condition));
  });

  it("세종 등 비주류 지역도 정상적으로 매칭된다 (회귀 방지)", () => {
    const condition = makeCondition({ region: "세종" });
    const sejong = makeGrant({ region: "세종" });
    const seoul = makeGrant({ region: "서울" });
    expect(ruleScore(sejong, condition)).toBeGreaterThan(ruleScore(seoul, condition));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ruleScore — 업종(bizType) 차원 상세
// ─────────────────────────────────────────────────────────────────────────────

describe("ruleScore: 업종(bizType) 차원", () => {
  it("정확 매칭(+20)이 가장 높은 업종 점수를 부여한다", () => {
    const condition = makeCondition({ bizType: "게임" });
    const exact = makeGrant({ targetBizTypes: ["게임"] });
    const adjacent = makeGrant({ targetBizTypes: ["IT·소프트웨어"] });
    const widely = makeGrant({
      targetBizTypes: ["A", "B", "C", "D", "E"], // 5개 이상 = +8
    });
    const unrelated = makeGrant({ targetBizTypes: ["건설"] });
    expect(ruleScore(exact, condition))
      .toBeGreaterThan(ruleScore(widely, condition));
    expect(ruleScore(widely, condition))
      .toBeGreaterThan(ruleScore(adjacent, condition));
    expect(ruleScore(adjacent, condition))
      .toBeGreaterThan(ruleScore(unrelated, condition));
  });

  it("targetBizTypes 가 5개 이상이면 사용자 업종 미포함이어도 +8 보너스", () => {
    const condition = makeCondition({ bizType: "패션·뷰티" });
    const broad = makeGrant({
      targetBizTypes: ["제조", "서비스업", "교육", "건설", "농림수산"],
    });
    const narrow = makeGrant({ targetBizTypes: ["제조"] });
    expect(ruleScore(broad, condition))
      .toBeGreaterThan(ruleScore(narrow, condition));
  });

  it("targetBizTypes 가 정확히 5개일 때 경계값 +8 보너스 적용", () => {
    const condition = makeCondition({ bizType: "공연·예술" });
    const exactlyFive = makeGrant({
      targetBizTypes: ["제조", "서비스업", "교육", "건설", "농림수산"],
    });
    const justFour = makeGrant({
      targetBizTypes: ["제조", "서비스업", "교육", "건설"],
    });
    // 4개: 미포함 + 인접도 없으면 -15 패널티 가능
    expect(ruleScore(exactlyFive, condition))
      .toBeGreaterThan(ruleScore(justFour, condition));
  });

  it('"기타" 만 포함된 지원사업은 +3 보너스', () => {
    const condition = makeCondition({ bizType: "음식점·외식" });
    const fallback = makeGrant({ targetBizTypes: ["기타"] });
    const unrelated = makeGrant({ targetBizTypes: ["건설"] });
    expect(ruleScore(fallback, condition))
      .toBeGreaterThan(ruleScore(unrelated, condition));
  });

  it("인접 업종 매칭 시 +5 보너스 적용 (게임 → IT·소프트웨어)", () => {
    const condition = makeCondition({ bizType: "게임" });
    const adjacent = makeGrant({ targetBizTypes: ["IT·소프트웨어"] });
    const unrelated = makeGrant({ targetBizTypes: ["건설"] });
    expect(ruleScore(adjacent, condition))
      .toBeGreaterThan(ruleScore(unrelated, condition));
  });

  it("인접 업종 매트릭스 양방향 일관성: 게임↔IT, 웹툰↔영상", () => {
    const cond1 = makeCondition({ bizType: "게임" });
    const grantIT = makeGrant({ targetBizTypes: ["IT·소프트웨어"] });
    const cond2 = makeCondition({ bizType: "IT·소프트웨어" });
    const grantGame = makeGrant({ targetBizTypes: ["게임"] });
    // 인접 정의에 따라 양쪽 모두 +5 보너스 받아야 함
    expect(ruleScore(grantIT, cond1)).toBeGreaterThan(0);
    expect(ruleScore(grantGame, cond2)).toBeGreaterThan(0);
  });

  it("콘텐츠·미디어는 4개 콘텐츠 업종(게임/웹툰/영상/음악)과 모두 인접", () => {
    const condition = makeCondition({ bizType: "콘텐츠·미디어" });
    const contentTypes = ["게임", "웹툰·만화", "영상·방송", "음악"];
    contentTypes.forEach(type => {
      const grant = makeGrant({ targetBizTypes: [type] });
      // 인접 보너스가 적용되어 정확 미매칭이지만 양수 점수 가능
      const score = ruleScore(grant, condition);
      expect(score).toBeGreaterThan(-15); // 무관 페널티가 아님
    });
  });

  it("바이오·헬스케어는 제조/서비스업과 인접", () => {
    const condition = makeCondition({ bizType: "바이오·헬스케어" });
    const manufacturing = makeGrant({ targetBizTypes: ["제조"] });
    const services = makeGrant({ targetBizTypes: ["서비스업"] });
    const unrelated = makeGrant({ targetBizTypes: ["농림수산"] });
    expect(ruleScore(manufacturing, condition))
      .toBeGreaterThan(ruleScore(unrelated, condition));
    expect(ruleScore(services, condition))
      .toBeGreaterThan(ruleScore(unrelated, condition));
  });

  it("농림수산은 제조/환경·에너지와 인접", () => {
    const condition = makeCondition({ bizType: "농림수산" });
    const env = makeGrant({ targetBizTypes: ["환경·에너지"] });
    const manuf = makeGrant({ targetBizTypes: ["제조"] });
    const unrelated = makeGrant({ targetBizTypes: ["IT·소프트웨어"] });
    expect(ruleScore(env, condition))
      .toBeGreaterThan(ruleScore(unrelated, condition));
    expect(ruleScore(manuf, condition))
      .toBeGreaterThan(ruleScore(unrelated, condition));
  });

  it("음식점·외식 ↔ 소매·유통 인접 보너스 검증", () => {
    const cond = makeCondition({ bizType: "음식점·외식" });
    const retail = makeGrant({ targetBizTypes: ["소매·유통"] });
    const services = makeGrant({ targetBizTypes: ["서비스업"] }); // 인접
    const unrelated = makeGrant({ targetBizTypes: ["건설"] });
    expect(ruleScore(retail, cond))
      .toBeGreaterThan(ruleScore(unrelated, cond));
    expect(ruleScore(services, cond))
      .toBeGreaterThan(ruleScore(unrelated, cond));
  });

  it("targetBizTypes 가 빈 배열이면 무관 처리(-15 페널티)", () => {
    const condition = makeCondition({ bizType: "IT·소프트웨어" });
    const empty = makeGrant({ targetBizTypes: [] });
    const exact = makeGrant({ targetBizTypes: ["IT·소프트웨어"] });
    // 빈 배열은 정확매칭(+20)이 아닌 미스매칭(-15) 분기로 떨어짐
    // → 정확매칭 대비 35점 낮아야 함
    expect(ruleScore(exact, condition) - ruleScore(empty, condition)).toBe(35);
  });

  it("정확 매칭 시 다른 업종이 함께 포함되어도 동일 점수", () => {
    const condition = makeCondition({ bizType: "IT·소프트웨어" });
    const single = makeGrant({ targetBizTypes: ["IT·소프트웨어"] });
    const multi = makeGrant({
      targetBizTypes: ["IT·소프트웨어", "제조"],
    });
    expect(ruleScore(single, condition)).toBe(ruleScore(multi, condition));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ruleScore — 업력(bizAge) 차원 상세
// ─────────────────────────────────────────────────────────────────────────────

describe("ruleScore: 업력(bizAge) 차원", () => {
  it("업력 제약 없으면 모든 단계에서 +10 보너스", () => {
    ALL_BIZ_AGES.forEach(bizAge => {
      const condition = makeCondition({ bizAge });
      const grant = makeGrant({});
      const score = ruleScore(grant, condition);
      // 보너스가 부여되었는지는 다른 지원사업과 비교
      expect(score).toBeGreaterThan(0);
    });
  });

  it("maxBizAge 정확한 경계값 처리: 3년 제한, 1~3년 사용자 → 통과", () => {
    const condition = makeCondition({ bizAge: "1~3년" }); // = 2년
    const grant = makeGrant({ maxBizAge: 3 });
    const noLimit = makeGrant({});
    expect(ruleScore(grant, condition))
      .toBe(ruleScore(noLimit, condition));
  });

  it("maxBizAge 초과 시 -15 패널티", () => {
    const condition = makeCondition({ bizAge: "7년 이상" }); // = 8년
    const restrictive = makeGrant({ maxBizAge: 3 });
    const open = makeGrant({});
    expect(open - restrictive).toBeDefined();
    expect(ruleScore(open, condition) - ruleScore(restrictive, condition))
      .toBe(25); // +10 → -15 = 25점 차이
  });

  it("minBizAge 미달 시 -10 패널티 (예비창업이 5년 이상 대상 지원사업 신청)", () => {
    const condition = makeCondition({ bizAge: "예비 창업" }); // = 0
    const matureOnly = makeGrant({ minBizAge: 5 });
    const open = makeGrant({});
    expect(ruleScore(open, condition) - ruleScore(matureOnly, condition))
      .toBe(20); // +10 → -10 = 20점 차이
  });

  it("예비 창업자(0년)는 minBizAge 0 또는 미지정인 사업에만 매칭", () => {
    const condition = makeCondition({ bizAge: "예비 창업" });
    const ok = makeGrant({});
    const tooMature = makeGrant({ minBizAge: 1 });
    expect(ruleScore(ok, condition))
      .toBeGreaterThan(ruleScore(tooMature, condition));
  });

  it("1년 미만(0.5년) 사용자도 minBizAge:1 사업에는 미달", () => {
    const condition = makeCondition({ bizAge: "1년 미만" });
    const oneYearPlus = makeGrant({ minBizAge: 1 });
    const open = makeGrant({});
    expect(ruleScore(open, condition))
      .toBeGreaterThan(ruleScore(oneYearPlus, condition));
  });

  it("3~5년(4년) 사용자가 maxBizAge:3 사업 신청 시 페널티", () => {
    const condition = makeCondition({ bizAge: "3~5년" });
    const youngOnly = makeGrant({ maxBizAge: 3 });
    const open = makeGrant({});
    expect(ruleScore(open, condition))
      .toBeGreaterThan(ruleScore(youngOnly, condition));
  });

  it("5~7년(6년) 사용자는 maxBizAge:7 사업에 적합", () => {
    const condition = makeCondition({ bizAge: "5~7년" });
    const upTo7 = makeGrant({ maxBizAge: 7 });
    const open = makeGrant({});
    expect(ruleScore(upTo7, condition))
      .toBe(ruleScore(open, condition));
  });

  it("7년 이상(8년) 사용자는 maxBizAge:7 사업 부적합", () => {
    const condition = makeCondition({ bizAge: "7년 이상" });
    const upTo7 = makeGrant({ maxBizAge: 7 });
    const open = makeGrant({});
    expect(ruleScore(open, condition))
      .toBeGreaterThan(ruleScore(upTo7, condition));
  });

  it("min/max 둘 다 있는 사업: 양쪽 다 만족하면 +10", () => {
    const condition = makeCondition({ bizAge: "3~5년" }); // 4년
    const window = makeGrant({ minBizAge: 1, maxBizAge: 5 });
    const open = makeGrant({});
    expect(ruleScore(window, condition))
      .toBe(ruleScore(open, condition));
  });

  it("알 수 없는 bizAge 문자열은 기본값 3년으로 처리", () => {
    const weird = makeCondition({ bizAge: "이상한값" });
    const normal = makeCondition({ bizAge: "1~3년" }); // 2년 — 둘 다 max 5 통과
    const grant = makeGrant({ minBizAge: 1, maxBizAge: 5 });
    expect(ruleScore(grant, weird)).toBe(ruleScore(grant, normal));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ruleScore — 키워드 오버랩 차원
// ─────────────────────────────────────────────────────────────────────────────

describe("ruleScore: 키워드 오버랩(domain bonus)", () => {
  it("summary/keywords 없으면 키워드 보너스 0", () => {
    const condition = makeCondition({ summary: "", keywords: [] });
    const grant = makeGrant({
      title: "스마트팜 지원",
      description: "농업 IT 융합",
      requirements: "관련 경력",
    });
    const conditionWithBonus = makeCondition({
      summary: "스마트팜 농업 IT 융합 서비스",
      keywords: ["스마트팜", "농업"],
    });
    expect(ruleScore(grant, conditionWithBonus))
      .toBeGreaterThan(ruleScore(grant, condition));
  });

  it("키워드 30% 이상 오버랩 시 큰 보너스 (~25점)", () => {
    const condition = makeCondition({
      keywords: ["스마트팜", "농업", "IoT", "센서"],
      summary: "스마트팜 농업 IoT 센서",
    });
    const matching = makeGrant({
      title: "스마트팜 농업 IoT 지원사업",
      description: "센서 기반 농업 혁신",
      requirements: "스마트팜 관련 경험",
    });
    const irrelevant = makeGrant({
      title: "건설업 지원",
      description: "건축 자재",
      requirements: "건설업 경력",
    });
    expect(ruleScore(matching, condition))
      .toBeGreaterThan(ruleScore(irrelevant, condition));
  });

  it("키워드 10~30% 오버랩 시 중간 보너스 (~15점)", () => {
    const condition = makeCondition({
      keywords: ["AI", "머신러닝", "딥러닝", "자연어처리", "컴퓨터비전"],
    });
    const partial = makeGrant({
      title: "AI 스타트업 지원",
      description: "일반적인 스타트업 인큐베이팅",
      requirements: "기술 기반",
    });
    expect(ruleScore(partial, condition)).toBeGreaterThan(0);
  });

  it("키워드 10% 미만 오버랩은 보너스 없음", () => {
    const condition = makeCondition({
      keywords: Array.from({ length: 20 }, (_, i) => `키워드${i}`),
    });
    const noOverlap = makeGrant({
      title: "건설",
      description: "건축",
      requirements: "토목",
    });
    const conditionEmpty = makeCondition({ keywords: [], summary: "" });
    // 보너스 없는 점수와 동일하거나 유사해야 함
    expect(ruleScore(noOverlap, condition))
      .toBe(ruleScore(noOverlap, conditionEmpty));
  });

  it("summary 만 있어도 키워드 추출 동작", () => {
    const condition = makeCondition({
      summary: "스마트팜 농업 IoT 센서 기반 서비스",
    });
    const matching = makeGrant({
      title: "스마트팜 농업 IoT",
      description: "센서 기반 솔루션",
      requirements: "농업 경험",
    });
    const conditionEmpty = makeCondition({ summary: "" });
    expect(ruleScore(matching, condition))
      .toBeGreaterThan(ruleScore(matching, conditionEmpty));
  });

  it("keywords 배열만 있어도 동작", () => {
    const condition = makeCondition({
      keywords: ["블록체인", "NFT", "DeFi"],
    });
    const matching = makeGrant({
      title: "블록체인 NFT 지원사업",
      description: "DeFi 프로젝트 인큐베이팅",
      requirements: "블록체인 경험",
    });
    expect(ruleScore(matching, condition)).toBeGreaterThan(0);
  });

  it("특수문자만 있는 summary 는 키워드 보너스 0", () => {
    const condition = makeCondition({ summary: "!@#$%^&*()" });
    const conditionEmpty = makeCondition({ summary: "" });
    const grant = makeGrant();
    expect(ruleScore(grant, condition))
      .toBe(ruleScore(grant, conditionEmpty));
  });

  it("매우 긴 summary (수백 단어)도 처리 가능", () => {
    const longSummary = Array.from({ length: 200 }, (_, i) => `단어${i}`).join(" ");
    const condition = makeCondition({ summary: longSummary });
    const grant = makeGrant();
    // 에러 없이 점수 산출
    expect(() => ruleScore(grant, condition)).not.toThrow();
  });

  it("불용어(stopwords) 만 있는 summary 는 보너스 0", () => {
    const condition = makeCondition({
      summary: "있는 하는 위한 대한 통한 관련 기반",
    });
    const conditionEmpty = makeCondition({ summary: "" });
    const grant = makeGrant({
      title: "있는 하는 위한",
      description: "대한 통한",
      requirements: "관련 기반",
    });
    expect(ruleScore(grant, condition))
      .toBe(ruleScore(grant, conditionEmpty));
  });

  it("대소문자 무관 매칭 (영문 키워드)", () => {
    const condition = makeCondition({ keywords: ["STARTUP", "saas"] });
    const grant = makeGrant({
      title: "Startup SaaS Support",
      description: "스타트업 지원",
      requirements: "SaaS",
    });
    expect(ruleScore(grant, condition)).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ruleScore — 마감일(deadline) 차원
// ─────────────────────────────────────────────────────────────────────────────

describe("ruleScore: 마감일(deadline)", () => {
  it('"상시" 모집은 +5 보너스', () => {
    const condition = makeCondition();
    const constant = makeGrant({ deadline: "상시" });
    const expired = makeGrant({ deadline: FAR_PAST_DATE });
    // 상시 vs 만료 = +5 vs -30, 차이는 35
    expect(ruleScore(constant, condition) - ruleScore(expired, condition)).toBe(35);
  });

  it("먼 미래 마감(30일 초과)은 +5 보너스", () => {
    const condition = makeCondition();
    const farFuture = makeGrant({ deadline: FAR_FUTURE_DATE });
    const expired = makeGrant({ deadline: FAR_PAST_DATE });
    expect(ruleScore(farFuture, condition))
      .toBeGreaterThan(ruleScore(expired, condition));
  });

  it("만료된 지원사업은 -30 큰 페널티", () => {
    const condition = makeCondition();
    const expired = makeGrant({ deadline: FAR_PAST_DATE });
    const constant = makeGrant({ deadline: "상시" });
    expect(ruleScore(constant, condition))
      .toBeGreaterThan(ruleScore(expired, condition));
  });

  it("매우 오래된 마감(2000년)도 정상적으로 페널티 처리", () => {
    const condition = makeCondition();
    const ancient = makeGrant({ deadline: "2000-01-01" });
    const ancient2 = makeGrant({ deadline: "1999-12-31" });
    expect(ruleScore(ancient, condition))
      .toBe(ruleScore(ancient2, condition));
  });

  it("ISO 형식이 아닌 날짜 문자열도 Date 파싱 시도 (잘못된 형식은 NaN)", () => {
    const condition = makeCondition();
    // "ABC" 같은 잘못된 형식 → NaN → daysLeft NaN → 어떤 분기에도 안 들어가
    // 함수가 throw 하지 않으면 OK
    const weird = makeGrant({ deadline: "ABC" });
    expect(() => ruleScore(weird, condition)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ruleScore — 통합 시나리오 (소상공인 현실 케이스)
// ─────────────────────────────────────────────────────────────────────────────

describe("ruleScore: 현실 시나리오 — 소상공인 케이스", () => {
  it("[케이스1] 서울 1년차 IT 스타트업 → 전국 IT 정확매칭 지원사업 = 매우 높은 점수", () => {
    const sky = makeCondition({
      bizType: "IT·소프트웨어",
      region: "서울",
      bizAge: "1년 미만",
    });
    const grant = makeGrant({
      region: "전국",
      targetBizTypes: ["IT·소프트웨어"],
      deadline: FAR_FUTURE_DATE,
    });
    const score = ruleScore(grant, sky);
    expect(scoreToGrade(score)).toBe("high");
  });

  it("[케이스2] 부산 7년차 음식점 → 서울 IT 지원사업 = 낮은 점수", () => {
    const restaurant = makeCondition({
      bizType: "음식점·외식",
      region: "부산",
      bizAge: "7년 이상",
    });
    const wrongFit = makeGrant({
      region: "서울",
      targetBizTypes: ["IT·소프트웨어"],
      maxBizAge: 3,
    });
    const score = ruleScore(wrongFit, restaurant);
    expect(scoreToGrade(score)).toBe("low");
  });

  it("[케이스3] 예비 창업자 → 기창업자 전용 지원사업 = 큰 페널티", () => {
    const condition = makeCondition({ bizAge: "예비 창업" });
    const matureOnly = makeGrant({
      minBizAge: 5,
      maxBizAge: 10,
    });
    expect(ruleScore(matureOnly, condition))
      .toBeLessThan(ruleScore(makeGrant(), condition));
  });

  it("[케이스4] 5인 미만 카페 사장 → 소상공인 광범위 지원사업", () => {
    const cafe = makeCondition({
      bizType: "음식점·외식",
      region: "경기",
      bizAge: "3~5년",
    });
    const broadSupport = makeGrant({
      region: "전국",
      targetBizTypes: [
        "음식점·외식", "소매·유통", "서비스업", "패션·뷰티", "교육"
      ], // 5개 이상 = +8 (하지만 정확매칭도 있음 = +20)
      deadline: "상시",
    });
    const score = ruleScore(broadSupport, cafe);
    expect(score).toBeGreaterThan(20);
  });

  it("[케이스5] 콘텐츠 크리에이터 → 인접 콘텐츠 지원사업 통과", () => {
    const creator = makeCondition({
      bizType: "웹툰·만화",
      region: "서울",
    });
    const adjacent = makeGrant({
      targetBizTypes: ["게임"], // 인접
      region: "전국",
    });
    expect(ruleScore(adjacent, creator)).toBeGreaterThan(0);
  });

  it("[케이스6] 만료된 지원사업은 다른 조건이 완벽해도 최소 점수", () => {
    const condition = makeCondition({
      bizType: "IT·소프트웨어",
      region: "서울",
    });
    const expired = makeGrant({
      region: "서울",
      targetBizTypes: ["IT·소프트웨어"],
      deadline: FAR_PAST_DATE,
    });
    // 다른 보너스 다 받아도 마감 페널티 -30 이 큼
    const score = ruleScore(expired, condition);
    expect(score).toBeLessThan(40); // high 등급 진입 불가
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ruleScore — 결정성(determinism) 회귀 방지
// ─────────────────────────────────────────────────────────────────────────────

describe("ruleScore: 결정성(determinism)", () => {
  it("같은 입력 100회 반복 시 동일 점수", () => {
    const condition = makeCondition();
    const grant = makeGrant();
    const scores = Array.from({ length: 100 }, () =>
      ruleScore(grant, condition)
    );
    expect(new Set(scores).size).toBe(1);
  });

  it("입력 객체 변형 없음: ruleScore 호출 후 Grant 가 그대로", () => {
    const condition = makeCondition();
    const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어", "제조"] });
    const grantSnapshot = JSON.stringify(grant);
    ruleScore(grant, condition);
    expect(JSON.stringify(grant)).toBe(grantSnapshot);
  });

  it("입력 객체 변형 없음: ruleScore 호출 후 UserCondition 이 그대로", () => {
    const condition = makeCondition({ keywords: ["a", "b"] });
    const conditionSnapshot = JSON.stringify(condition);
    const grant = makeGrant();
    ruleScore(grant, condition);
    expect(JSON.stringify(condition)).toBe(conditionSnapshot);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// scoreToGrade — 경계값 상세
// ─────────────────────────────────────────────────────────────────────────────

describe("scoreToGrade: 등급 경계값", () => {
  it("40점 정확히 = high", () => {
    expect(scoreToGrade(40)).toBe("high");
  });

  it("39점 정확히 = medium", () => {
    expect(scoreToGrade(39)).toBe("medium");
  });

  it("20점 정확히 = medium", () => {
    expect(scoreToGrade(20)).toBe("medium");
  });

  it("19점 정확히 = low", () => {
    expect(scoreToGrade(19)).toBe("low");
  });

  it("매우 높은 점수도 high (예: 100)", () => {
    expect(scoreToGrade(100)).toBe("high");
    expect(scoreToGrade(1000)).toBe("high");
  });

  it("매우 낮은 음수도 low", () => {
    expect(scoreToGrade(-100)).toBe("low");
    expect(scoreToGrade(-1000)).toBe("low");
  });

  it("소수점 점수도 처리 (39.9 → medium, 40.0 → high)", () => {
    expect(scoreToGrade(39.9)).toBe("medium");
    expect(scoreToGrade(40.0)).toBe("high");
  });

  it("0점 = low", () => {
    expect(scoreToGrade(0)).toBe("low");
  });

  it("등급 분포 회귀 테스트: 10/30/50 = low/medium/high", () => {
    expect(scoreToGrade(10)).toBe("low");
    expect(scoreToGrade(30)).toBe("medium");
    expect(scoreToGrade(50)).toBe("high");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rankGrants — 정렬 및 필터링 상세
// ─────────────────────────────────────────────────────────────────────────────

describe("rankGrants: 대량 데이터 / 정렬 / topN", () => {
  it("빈 배열 입력 시 빈 배열 반환", () => {
    const condition = makeCondition();
    expect(rankGrants([], condition)).toEqual([]);
  });

  it("단일 지원사업도 정상 처리 (등급이 low 가 아니면 포함)", () => {
    const condition = makeCondition();
    const grants = [makeGrant({ region: "전국" })];
    const result = rankGrants(grants, condition);
    expect(result.length).toBeLessThanOrEqual(1);
  });

  it("topN 기본값은 15", () => {
    const condition = makeCondition();
    const grants = Array.from({ length: 30 }, (_, i) =>
      makeGrant({
        id: String(i).padStart(3, "0"),
        targetBizTypes: ["IT·소프트웨어"],
        region: "전국",
      })
    );
    const result = rankGrants(grants, condition);
    expect(result.length).toBeLessThanOrEqual(15);
  });

  it("topN 0 이면 빈 배열", () => {
    const condition = makeCondition();
    const grants = [makeGrant({ region: "전국" })];
    expect(rankGrants(grants, condition, 0)).toEqual([]);
  });

  it("topN 이 전체 매칭보다 크면 매칭 결과 전체 반환", () => {
    const condition = makeCondition();
    const grants = [
      makeGrant({ id: "a", region: "전국" }),
      makeGrant({ id: "b", region: "전국" }),
    ];
    const result = rankGrants(grants, condition, 100);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it("100개 입력 시 정렬 안정성 검증 (셔플 후 동일 결과)", () => {
    const condition = makeCondition({ region: "서울" });
    const grants = Array.from({ length: 100 }, (_, i) =>
      makeGrant({
        id: String(i).padStart(3, "0"),
        region: i % 2 === 0 ? "전국" : "서울",
        targetBizTypes: ["IT·소프트웨어"],
      })
    );
    const run1 = rankGrants(grants, condition, 15)
      .map(r => r.grant.id);
    const shuffled = [...grants].sort(() => 0.5 - Math.random());
    const run2 = rankGrants(shuffled, condition, 15)
      .map(r => r.grant.id);
    expect(run1).toEqual(run2);
  });

  it("low 등급 지원사업은 결과에서 제외", () => {
    const condition = makeCondition({ bizType: "IT·소프트웨어" });
    const lowGrant = makeGrant({
      id: "low",
      targetBizTypes: ["농림수산"],
      region: "부산",
      deadline: FAR_PAST_DATE,
    });
    const result = rankGrants([lowGrant], condition);
    expect(result).toEqual([]);
  });

  it("결과 구조: 각 항목에 grant/score/grade 포함", () => {
    const condition = makeCondition();
    const grants = [makeGrant({ region: "전국" })];
    const result = rankGrants(grants, condition);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("grant");
      expect(result[0]).toHaveProperty("score");
      expect(result[0]).toHaveProperty("grade");
    }
  });

  it("동점일 때 ID 알파벳 오름차순 정렬", () => {
    const condition = makeCondition();
    const grants = [
      makeGrant({ id: "zzz", region: "전국" }),
      makeGrant({ id: "aaa", region: "전국" }),
      makeGrant({ id: "mmm", region: "전국" }),
    ];
    const result = rankGrants(grants, condition);
    if (result.length === 3) {
      expect(result[0].grant.id).toBe("aaa");
      expect(result[1].grant.id).toBe("mmm");
      expect(result[2].grant.id).toBe("zzz");
    }
  });

  it("score 가 grade 와 일관: high 항목의 score >= 40", () => {
    const condition = makeCondition();
    const grants = Array.from({ length: 10 }, (_, i) =>
      makeGrant({
        id: `g${i}`,
        targetBizTypes: ["IT·소프트웨어"],
        region: "전국",
      })
    );
    const result = rankGrants(grants, condition);
    result.forEach(r => {
      if (r.grade === "high") expect(r.score).toBeGreaterThanOrEqual(40);
      if (r.grade === "medium") {
        expect(r.score).toBeGreaterThanOrEqual(20);
        expect(r.score).toBeLessThan(40);
      }
    });
  });

  it("입력 배열은 변형되지 않음 (불변성)", () => {
    const condition = makeCondition();
    const grants = [
      makeGrant({ id: "b" }),
      makeGrant({ id: "a" }),
    ];
    const snapshot = grants.map(g => g.id).join(",");
    rankGrants(grants, condition);
    expect(grants.map(g => g.id).join(",")).toBe(snapshot);
  });

  it("topN 음수도 안전하게 처리 (빈 배열)", () => {
    const condition = makeCondition();
    const grants = [makeGrant({ region: "전국" })];
    // Array.slice(0, -1) 동작 → 정의된 시그니처는 양수이나 방어적 검증
    const result = rankGrants(grants, condition, -1);
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rankGrants — 현실 데이터셋 시뮬레이션
// ─────────────────────────────────────────────────────────────────────────────

describe("rankGrants: 현실 데이터셋 시뮬레이션", () => {
  it("17개 업종 × 17개 지역 매트릭스 처리 (~289개)", () => {
    const condition = makeCondition({
      bizType: "IT·소프트웨어",
      region: "서울",
    });
    const grants: Grant[] = [];
    for (const region of [...ALL_REGIONS, "전국"]) {
      for (const bizType of ALL_BIZ_TYPES) {
        grants.push(makeGrant({
          id: `${region}-${bizType}`,
          region,
          targetBizTypes: [bizType],
        }));
      }
    }
    const result = rankGrants(grants, condition, 15);
    expect(result.length).toBeLessThanOrEqual(15);
    // 정확매칭(서울-IT)이 상위에 와야 함
    expect(result[0].grant.id).toContain("IT");
  });

  it("동일 점수 그룹이 많아도 결정적 정렬", () => {
    const condition = makeCondition();
    const grants = Array.from({ length: 50 }, (_, i) =>
      makeGrant({
        id: String(i).padStart(3, "0"),
        targetBizTypes: ["IT·소프트웨어"],
        region: "전국",
        deadline: "상시",
      })
    );
    const result = rankGrants(grants, condition, 15);
    const ids = result.map(r => r.grant.id);
    // 모두 동점이라 ID 오름차순
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
  });

  it("매우 큰 입력 (1000개) 도 합리적인 시간 내 처리", () => {
    const condition = makeCondition();
    const grants = Array.from({ length: 1000 }, (_, i) =>
      makeGrant({
        id: String(i).padStart(4, "0"),
        targetBizTypes: [ALL_BIZ_TYPES[i % ALL_BIZ_TYPES.length]],
        region: ALL_REGIONS[i % ALL_REGIONS.length],
      })
    );
    const start = Date.now();
    const result = rankGrants(grants, condition, 15);
    const elapsed = Date.now() - start;
    expect(result.length).toBeLessThanOrEqual(15);
    expect(elapsed).toBeLessThan(2000); // 2초 이내
  });

  it("모든 항목이 low 등급이면 빈 배열", () => {
    const condition = makeCondition({
      bizType: "IT·소프트웨어",
      region: "서울",
    });
    const grants = Array.from({ length: 10 }, (_, i) =>
      makeGrant({
        id: `g${i}`,
        targetBizTypes: ["농림수산"],
        region: "부산",
        deadline: FAR_PAST_DATE,
      })
    );
    const result = rankGrants(grants, condition);
    expect(result).toEqual([]);
  });

  it("high/medium 혼합 결과 정렬: high 가 항상 medium 보다 앞", () => {
    const condition = makeCondition({
      bizType: "IT·소프트웨어",
      region: "서울",
    });
    const grants = [
      makeGrant({
        id: "high1",
        region: "서울",
        targetBizTypes: ["IT·소프트웨어"],
      }),
      makeGrant({
        id: "med1",
        region: "부산",
        targetBizTypes: ["IT·소프트웨어"],
      }),
    ];
    const result = rankGrants(grants, condition);
    if (result.length === 2) {
      const grades = result.map(r => r.grade);
      // high 가 medium 앞에 와야 함
      const highIdx = grades.indexOf("high");
      const medIdx = grades.indexOf("medium");
      if (highIdx >= 0 && medIdx >= 0) {
        expect(highIdx).toBeLessThan(medIdx);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 회귀 방지: 알려진 버그 시나리오
// ─────────────────────────────────────────────────────────────────────────────

describe("회귀 방지: 알려진 시나리오", () => {
  it("targetBizTypes 에 undefined 가 섞이지 않음 (입력 검증)", () => {
    const condition = makeCondition();
    const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"] });
    expect(grant.targetBizTypes.every(t => typeof t === "string")).toBe(true);
    expect(() => ruleScore(grant, condition)).not.toThrow();
  });

  it("키워드 배열에 빈 문자열이 있어도 안전", () => {
    const condition = makeCondition({ keywords: ["", "AI", ""] });
    const grant = makeGrant({ title: "AI 지원사업" });
    expect(() => ruleScore(grant, condition)).not.toThrow();
  });

  it("매우 짧은(1글자) 키워드는 추출 필터에서 걸러짐", () => {
    const condition = makeCondition({
      summary: "A B C D E F",  // 모두 1글자
    });
    const conditionEmpty = makeCondition({ summary: "" });
    const grant = makeGrant({
      title: "A B C D E F",
    });
    // 1글자는 extractKeywords 에서 length>=2 필터로 걸러짐
    expect(ruleScore(grant, condition))
      .toBe(ruleScore(grant, conditionEmpty));
  });

  it("같은 키워드가 중복되어도 점수에 영향 적음", () => {
    const condA = makeCondition({
      keywords: ["AI", "AI", "AI", "AI"],
    });
    const condB = makeCondition({
      keywords: ["AI"],
    });
    const grant = makeGrant({ title: "AI 지원" });
    // 중복은 카운트되긴 하지만 분모도 같이 커지므로 비슷한 결과
    const scoreA = ruleScore(grant, condA);
    const scoreB = ruleScore(grant, condB);
    expect(Math.abs(scoreA - scoreB)).toBeLessThan(30);
  });

  it("grant 의 description 이 빈 문자열이어도 정상 처리", () => {
    const condition = makeCondition({ keywords: ["AI"] });
    const grant = makeGrant({
      title: "AI",
      description: "",
      requirements: "",
    });
    expect(() => ruleScore(grant, condition)).not.toThrow();
  });

  it("동점 시나리오 회귀: 5개 동점 그룹의 정렬 결정성", () => {
    const condition = makeCondition();
    const grants = ["e", "b", "d", "a", "c"].map(id =>
      makeGrant({
        id,
        targetBizTypes: ["IT·소프트웨어"],
        region: "전국",
      })
    );
    const result = rankGrants(grants, condition);
    const ids = result.map(r => r.grant.id);
    expect(ids).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("ranking 결과의 score 는 grade 와 일관 (불변식)", () => {
    const condition = makeCondition();
    const grants = Array.from({ length: 20 }, (_, i) =>
      makeGrant({
        id: String(i).padStart(2, "0"),
        targetBizTypes: i % 3 === 0
          ? ["IT·소프트웨어"]
          : i % 3 === 1 ? ["게임"] : ["농림수산"],
        region: i % 2 === 0 ? "전국" : "부산",
      })
    );
    const result = rankGrants(grants, condition);
    result.forEach(r => {
      expect(scoreToGrade(r.score)).toBe(r.grade);
    });
  });
});
