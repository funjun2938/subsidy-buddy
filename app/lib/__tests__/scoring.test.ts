/**
 * scoring.ts 종합 테스트
 * 담당: yungyeonghye-maker
 * 도메인: AI 엔진 / 스코어링 로직
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ruleScore, scoreToGrade, rankGrants, fallbackResults } from "../scoring";
import type { Grant, UserCondition } from "../types";

// ── 테스트 픽스처 ─────────────────────────────────────────────────────────────

function makeGrant(overrides: Partial<Grant> = {}): Grant {
  return {
    id: "G001",
    title: "테스트 지원사업",
    orgName: "중소벤처기업부",
    category: "창업",
    region: "전국",
    targetBizTypes: ["IT·소프트웨어", "서비스업"],
    amount: "최대 1억원",
    deadline: "상시",
    description: "IT 스타트업 대상 지원사업",
    requirements: "업력 3년 이내 IT 기업",
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

// ── scoreToGrade ──────────────────────────────────────────────────────────────

describe("scoreToGrade", () => {
  describe("high 등급 (40점 이상)", () => {
    it("정확히 40점은 high", () => expect(scoreToGrade(40)).toBe("high"));
    it("41점은 high", () => expect(scoreToGrade(41)).toBe("high"));
    it("50점은 high", () => expect(scoreToGrade(50)).toBe("high"));
    it("100점은 high", () => expect(scoreToGrade(100)).toBe("high"));
    it("최대 이론값은 high", () => expect(scoreToGrade(80)).toBe("high"));
    it("매우 높은 점수도 high", () => expect(scoreToGrade(999)).toBe("high"));
  });

  describe("medium 등급 (20~39점)", () => {
    it("정확히 20점은 medium", () => expect(scoreToGrade(20)).toBe("medium"));
    it("21점은 medium", () => expect(scoreToGrade(21)).toBe("medium"));
    it("30점은 medium", () => expect(scoreToGrade(30)).toBe("medium"));
    it("39점은 medium", () => expect(scoreToGrade(39)).toBe("medium"));
    it("25점은 medium", () => expect(scoreToGrade(25)).toBe("medium"));
    it("35점은 medium", () => expect(scoreToGrade(35)).toBe("medium"));
  });

  describe("low 등급 (19점 이하)", () => {
    it("정확히 19점은 low", () => expect(scoreToGrade(19)).toBe("low"));
    it("18점은 low", () => expect(scoreToGrade(18)).toBe("low"));
    it("0점은 low", () => expect(scoreToGrade(0)).toBe("low"));
    it("음수는 low", () => expect(scoreToGrade(-1)).toBe("low"));
    it("-30점은 low", () => expect(scoreToGrade(-30)).toBe("low"));
    it("매우 낮은 점수도 low", () => expect(scoreToGrade(-999)).toBe("low"));
    it("1점은 low", () => expect(scoreToGrade(1)).toBe("low"));
    it("10점은 low", () => expect(scoreToGrade(10)).toBe("low"));
  });

  describe("경계값 테스트", () => {
    it("39와 40 사이의 경계", () => {
      expect(scoreToGrade(39)).toBe("medium");
      expect(scoreToGrade(40)).toBe("high");
    });
    it("19와 20 사이의 경계", () => {
      expect(scoreToGrade(19)).toBe("low");
      expect(scoreToGrade(20)).toBe("medium");
    });
  });
});

// ── ruleScore 지역 ──────────────────────────────────────────────────────────────

describe("ruleScore - 지역 스코어링", () => {
  describe("전국 지원사업 (+12점)", () => {
    it("전국 지원사업은 +12", () => {
      const grant = makeGrant({ region: "전국", deadline: "상시", targetBizTypes: ["IT·소프트웨어"] });
      const condition = makeCondition({ region: "서울", bizAge: "1~3년" });
      const baseScore = ruleScore(grant, condition);
      // 전국: +12, 업종 일치: +20, 업력 정상: +10, 상시: +5 = 47
      expect(baseScore).toBeGreaterThanOrEqual(40);
    });

    it("전국 지원사업은 지역과 무관하게 동일 점수", () => {
      const grant = makeGrant({ region: "전국", deadline: "상시", targetBizTypes: ["IT·소프트웨어"] });
      const conditionSeoul = makeCondition({ region: "서울", bizAge: "1~3년" });
      const conditionBusan = makeCondition({ region: "부산", bizAge: "1~3년" });
      expect(ruleScore(grant, conditionSeoul)).toBe(ruleScore(grant, conditionBusan));
    });
  });

  describe("지역 일치 (+15점)", () => {
    it("서울 지원사업 + 서울 사용자 = +15", () => {
      const grant = makeGrant({ region: "서울", deadline: "상시", targetBizTypes: ["IT·소프트웨어"] });
      const condition = makeCondition({ region: "서울", bizAge: "1~3년" });
      const score = ruleScore(grant, condition);
      expect(score).toBeGreaterThan(ruleScore(makeGrant({ region: "전국", deadline: "상시", targetBizTypes: ["IT·소프트웨어"] }), condition));
    });

    it("경기 지원사업 + 경기 사용자 = +15", () => {
      const grant = makeGrant({ region: "경기", deadline: "상시", targetBizTypes: ["IT·소프트웨어"] });
      const condition = makeCondition({ region: "경기", bizAge: "1~3년" });
      const score = ruleScore(grant, condition);
      expect(score).toBeGreaterThanOrEqual(40);
    });

    it("부산 지원사업 + 부산 사용자 = +15", () => {
      const grant = makeGrant({ region: "부산", deadline: "상시", targetBizTypes: ["IT·소프트웨어"] });
      const condition = makeCondition({ region: "부산", bizAge: "1~3년" });
      const score = ruleScore(grant, condition);
      expect(score).toBeGreaterThanOrEqual(40);
    });
  });

  describe("지역 불일치 (-10점)", () => {
    it("서울 지원사업 + 부산 사용자 = -10", () => {
      const grant = makeGrant({ region: "서울", deadline: "상시", targetBizTypes: ["IT·소프트웨어"] });
      const conditionMatch = makeCondition({ region: "서울", bizAge: "1~3년" });
      const conditionMismatch = makeCondition({ region: "부산", bizAge: "1~3년" });
      const diff = ruleScore(grant, conditionMatch) - ruleScore(grant, conditionMismatch);
      expect(diff).toBe(25); // 15 - (-10) = 25
    });

    it("경기 지원사업 + 제주 사용자 = -10", () => {
      const grant = makeGrant({ region: "경기", deadline: "상시", targetBizTypes: ["IT·소프트웨어"] });
      const condition = makeCondition({ region: "제주", bizAge: "1~3년" });
      const score = ruleScore(grant, condition);
      // -10(지역) + 20(업종) + 10(업력) + 5(상시) = 25
      expect(score).toBe(25);
    });
  });
});

// ── ruleScore 업종 ──────────────────────────────────────────────────────────────

describe("ruleScore - 업종 스코어링", () => {
  describe("업종 정확 일치 (+20점)", () => {
    it("IT·소프트웨어 업종 정확 일치 +20", () => {
      const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"], region: "전국", deadline: "상시" });
      const condition = makeCondition({ bizType: "IT·소프트웨어", bizAge: "1~3년" });
      const score = ruleScore(grant, condition);
      // 전국+12, 업종+20, 업력+10, 상시+5 = 47
      expect(score).toBe(47);
    });

    it("게임 업종 정확 일치 +20", () => {
      const grant = makeGrant({ targetBizTypes: ["게임"], region: "전국", deadline: "상시" });
      const condition = makeCondition({ bizType: "게임", bizAge: "1~3년" });
      expect(ruleScore(grant, condition)).toBe(47);
    });

    it("제조 업종 정확 일치 +20", () => {
      const grant = makeGrant({ targetBizTypes: ["제조"], region: "전국", deadline: "상시" });
      const condition = makeCondition({ bizType: "제조", bizAge: "1~3년" });
      expect(ruleScore(grant, condition)).toBe(47);
    });

    it("다중 업종 중 일치 +20", () => {
      const grant = makeGrant({ targetBizTypes: ["게임", "IT·소프트웨어", "서비스업"], region: "전국", deadline: "상시" });
      const condition = makeCondition({ bizType: "IT·소프트웨어", bizAge: "1~3년" });
      expect(ruleScore(grant, condition)).toBe(47);
    });
  });

  describe("광범위 업종 (+8점, targetBizTypes.length >= 5)", () => {
    it("5개 이상 업종이면 +8", () => {
      const grant = makeGrant({
        targetBizTypes: ["게임", "IT·소프트웨어", "서비스업", "제조", "교육"],
        region: "전국",
        deadline: "상시",
      });
      const condition = makeCondition({ bizType: "음식점·외식", bizAge: "1~3년" });
      const score = ruleScore(grant, condition);
      // 전국+12, 광범위+8, 업력+10, 상시+5 = 35
      expect(score).toBe(35);
    });

    it("정확히 5개 업종이면 광범위 처리", () => {
      const grant = makeGrant({
        targetBizTypes: ["게임", "IT·소프트웨어", "서비스업", "제조", "교육"],
        region: "전국",
        deadline: "상시",
      });
      const condition = makeCondition({ bizType: "농림수산", bizAge: "1~3년" });
      expect(ruleScore(grant, condition)).toBe(35); // 광범위 +8
    });

    it("4개 업종이면 광범위 처리 안 됨", () => {
      const grant = makeGrant({
        targetBizTypes: ["게임", "IT·소프트웨어", "서비스업", "제조"],
        region: "전국",
        deadline: "상시",
      });
      const condition = makeCondition({ bizType: "음식점·외식", bizAge: "1~3년" });
      const score = ruleScore(grant, condition);
      expect(score).toBeLessThan(35); // 광범위 미적용
    });
  });

  describe("인접 업종 (+5점)", () => {
    it("게임-IT·소프트웨어 인접 +5", () => {
      const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"], region: "전국", deadline: "상시" });
      const condition = makeCondition({ bizType: "게임", bizAge: "1~3년" });
      const score = ruleScore(grant, condition);
      // 전국+12, 인접+5, 업력+10, 상시+5 = 32
      expect(score).toBe(32);
    });

    it("웹툰·만화-게임 인접 +5", () => {
      const grant = makeGrant({ targetBizTypes: ["게임"], region: "전국", deadline: "상시" });
      const condition = makeCondition({ bizType: "웹툰·만화", bizAge: "1~3년" });
      expect(ruleScore(grant, condition)).toBe(32);
    });

    it("IT·소프트웨어-서비스업 인접 +5", () => {
      const grant = makeGrant({ targetBizTypes: ["서비스업"], region: "전국", deadline: "상시" });
      const condition = makeCondition({ bizType: "IT·소프트웨어", bizAge: "1~3년" });
      expect(ruleScore(grant, condition)).toBe(32);
    });

    it("제조-IT·소프트웨어 인접 +5", () => {
      const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"], region: "전국", deadline: "상시" });
      const condition = makeCondition({ bizType: "제조", bizAge: "1~3년" });
      expect(ruleScore(grant, condition)).toBe(32);
    });
  });

  describe("기타 업종 (+3점)", () => {
    it("targetBizTypes에 '기타' 포함이면 +3", () => {
      const grant = makeGrant({ targetBizTypes: ["기타"], region: "전국", deadline: "상시" });
      const condition = makeCondition({ bizType: "음식점·외식", bizAge: "1~3년" });
      const score = ruleScore(grant, condition);
      // 전국+12, 기타+3, 업력+10, 상시+5 = 30
      expect(score).toBe(30);
    });
  });

  describe("업종 불일치 (-15점)", () => {
    it("전혀 관련 없는 업종은 -15", () => {
      const grant = makeGrant({ targetBizTypes: ["농림수산"], region: "전국", deadline: "상시" });
      const condition = makeCondition({ bizType: "IT·소프트웨어", bizAge: "1~3년" });
      const score = ruleScore(grant, condition);
      // 전국+12, 불일치-15, 업력+10, 상시+5 = 12
      expect(score).toBe(12);
    });

    it("건설-IT 불일치 -15", () => {
      const grant = makeGrant({ targetBizTypes: ["건설"], region: "전국", deadline: "상시" });
      const condition = makeCondition({ bizType: "IT·소프트웨어", bizAge: "1~3년" });
      expect(ruleScore(grant, condition)).toBe(12);
    });
  });
});

// ── ruleScore 업력 ──────────────────────────────────────────────────────────────

describe("ruleScore - 업력 스코어링", () => {
  describe("업력 조건 없음 (+10점)", () => {
    it("minBizAge/maxBizAge 미설정이면 +10", () => {
      const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"], region: "전국", deadline: "상시" });
      delete (grant as Record<string, unknown>).minBizAge;
      delete (grant as Record<string, unknown>).maxBizAge;
      const condition = makeCondition({ bizAge: "7년 이상", bizType: "IT·소프트웨어" });
      const score = ruleScore(grant, condition);
      expect(score).toBe(47); // 전국+12, 업종+20, 업력+10, 상시+5
    });
  });

  describe("업력 초과 (-15점, bizAge > maxBizAge)", () => {
    it("업력 7년 이상인데 maxBizAge=3이면 -15", () => {
      const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"], region: "전국", deadline: "상시", maxBizAge: 3 });
      const condition = makeCondition({ bizAge: "7년 이상", bizType: "IT·소프트웨어" });
      const score = ruleScore(grant, condition);
      // 전국+12, 업종+20, 업력초과-15, 상시+5 = 22
      expect(score).toBe(22);
    });

    it("업력 5~7년인데 maxBizAge=3이면 -15", () => {
      const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"], region: "전국", deadline: "상시", maxBizAge: 3 });
      const condition = makeCondition({ bizAge: "5~7년", bizType: "IT·소프트웨어" });
      expect(ruleScore(grant, condition)).toBe(22);
    });

    it("업력 3~5년인데 maxBizAge=2이면 -15", () => {
      const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"], region: "전국", deadline: "상시", maxBizAge: 2 });
      const condition = makeCondition({ bizAge: "3~5년", bizType: "IT·소프트웨어" });
      expect(ruleScore(grant, condition)).toBe(22);
    });
  });

  describe("업력 미달 (-10점, bizAge < minBizAge)", () => {
    it("예비창업자인데 minBizAge=1이면 -10", () => {
      const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"], region: "전국", deadline: "상시", minBizAge: 1 });
      const condition = makeCondition({ bizAge: "예비창업자", bizType: "IT·소프트웨어" });
      const score = ruleScore(grant, condition);
      // 전국+12, 업종+20, 업력미달-10, 상시+5 = 27
      expect(score).toBe(27);
    });

    it("1년 미만인데 minBizAge=2이면 -10", () => {
      const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"], region: "전국", deadline: "상시", minBizAge: 2 });
      const condition = makeCondition({ bizAge: "1년 미만", bizType: "IT·소프트웨어" });
      expect(ruleScore(grant, condition)).toBe(27);
    });
  });

  describe("parseBizAge 파싱 확인", () => {
    it("예비창업자 → 0으로 파싱", () => {
      const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"], region: "전국", deadline: "상시", maxBizAge: 0 });
      const condition = makeCondition({ bizAge: "예비창업자", bizType: "IT·소프트웨어" });
      // 0 > 0이 아니므로 초과 아님, 0 < undefined(minBizAge 없음)도 아님 → +10
      expect(ruleScore(grant, condition)).toBe(47);
    });

    it("1년 미만 → 0.5로 파싱", () => {
      const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"], region: "전국", deadline: "상시", maxBizAge: 1 });
      const condition = makeCondition({ bizAge: "1년 미만", bizType: "IT·소프트웨어" });
      // 0.5 > 1은 false → +10
      expect(ruleScore(grant, condition)).toBe(47);
    });

    it("1~3년 → 2로 파싱", () => {
      const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"], region: "전국", deadline: "상시", maxBizAge: 1 });
      const condition = makeCondition({ bizAge: "1~3년", bizType: "IT·소프트웨어" });
      // 2 > 1 → -15
      expect(ruleScore(grant, condition)).toBe(22);
    });

    it("3~5년 → 4로 파싱", () => {
      const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"], region: "전국", deadline: "상시", maxBizAge: 3 });
      const condition = makeCondition({ bizAge: "3~5년", bizType: "IT·소프트웨어" });
      // 4 > 3 → -15
      expect(ruleScore(grant, condition)).toBe(22);
    });

    it("5~7년 → 6으로 파싱", () => {
      const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"], region: "전국", deadline: "상시", maxBizAge: 7 });
      const condition = makeCondition({ bizAge: "5~7년", bizType: "IT·소프트웨어" });
      // 6 <= 7 → +10
      expect(ruleScore(grant, condition)).toBe(47);
    });

    it("7년 이상 → 8로 파싱", () => {
      const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"], region: "전국", deadline: "상시", maxBizAge: 7 });
      const condition = makeCondition({ bizAge: "7년 이상", bizType: "IT·소프트웨어" });
      // 8 > 7 → -15
      expect(ruleScore(grant, condition)).toBe(22);
    });

    it("알 수 없는 업력 → 3으로 기본값", () => {
      const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"], region: "전국", deadline: "상시", maxBizAge: 2 });
      const condition = makeCondition({ bizAge: "알 수 없음", bizType: "IT·소프트웨어" });
      // 3 > 2 → -15
      expect(ruleScore(grant, condition)).toBe(22);
    });
  });
});

// ── ruleScore 마감일 ──────────────────────────────────────────────────────────────

describe("ruleScore - 마감일 스코어링", () => {
  describe("상시 모집 (+5점)", () => {
    it("deadline이 '상시'이면 +5", () => {
      const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"], region: "전국", deadline: "상시" });
      const condition = makeCondition({ bizType: "IT·소프트웨어", bizAge: "1~3년" });
      expect(ruleScore(grant, condition)).toBe(47); // 12+20+10+5
    });
  });

  describe("마감 임박 (+10점, 1~30일 남음)", () => {
    it("10일 후 마감이면 +10", () => {
      const futureDate = new Date(Date.now() + 10 * 86400000);
      const deadline = futureDate.toISOString().split("T")[0];
      const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"], region: "전국", deadline });
      const condition = makeCondition({ bizType: "IT·소프트웨어", bizAge: "1~3년" });
      expect(ruleScore(grant, condition)).toBe(52); // 12+20+10+10
    });

    it("30일 후 마감이면 +10", () => {
      const futureDate = new Date(Date.now() + 30 * 86400000);
      const deadline = futureDate.toISOString().split("T")[0];
      const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"], region: "전국", deadline });
      const condition = makeCondition({ bizType: "IT·소프트웨어", bizAge: "1~3년" });
      expect(ruleScore(grant, condition)).toBe(52);
    });

    it("1일 후 마감이면 +10", () => {
      const futureDate = new Date(Date.now() + 1 * 86400000);
      const deadline = futureDate.toISOString().split("T")[0];
      const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"], region: "전국", deadline });
      const condition = makeCondition({ bizType: "IT·소프트웨어", bizAge: "1~3년" });
      expect(ruleScore(grant, condition)).toBe(52);
    });
  });

  describe("여유 있는 마감 (+5점, 30일 초과)", () => {
    it("60일 후 마감이면 +5", () => {
      const futureDate = new Date(Date.now() + 60 * 86400000);
      const deadline = futureDate.toISOString().split("T")[0];
      const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"], region: "전국", deadline });
      const condition = makeCondition({ bizType: "IT·소프트웨어", bizAge: "1~3년" });
      expect(ruleScore(grant, condition)).toBe(47); // 12+20+10+5
    });

    it("365일 후 마감이면 +5", () => {
      const futureDate = new Date(Date.now() + 365 * 86400000);
      const deadline = futureDate.toISOString().split("T")[0];
      const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"], region: "전국", deadline });
      const condition = makeCondition({ bizType: "IT·소프트웨어", bizAge: "1~3년" });
      expect(ruleScore(grant, condition)).toBe(47);
    });
  });

  describe("마감 지남 (-30점)", () => {
    it("어제 마감이면 -30", () => {
      const pastDate = new Date(Date.now() - 1 * 86400000);
      const deadline = pastDate.toISOString().split("T")[0];
      const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"], region: "전국", deadline });
      const condition = makeCondition({ bizType: "IT·소프트웨어", bizAge: "1~3년" });
      expect(ruleScore(grant, condition)).toBe(12); // 12+20+10-30
    });

    it("1달 전 마감이면 -30", () => {
      const pastDate = new Date(Date.now() - 30 * 86400000);
      const deadline = pastDate.toISOString().split("T")[0];
      const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"], region: "전국", deadline });
      const condition = makeCondition({ bizType: "IT·소프트웨어", bizAge: "1~3년" });
      expect(ruleScore(grant, condition)).toBe(12);
    });
  });
});

// ── ruleScore 키워드 보너스 ──────────────────────────────────────────────────────

describe("ruleScore - 키워드 보너스", () => {
  describe("summary/keywords 없을 때 (0점 보너스)", () => {
    it("summary와 keywords 없으면 키워드 보너스 0", () => {
      const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"], region: "전국", deadline: "상시" });
      const condition = makeCondition({ bizType: "IT·소프트웨어", bizAge: "1~3년" });
      // summary, keywords 없음
      expect(ruleScore(grant, condition)).toBe(47);
    });

    it("빈 summary이면 키워드 보너스 0", () => {
      const grant = makeGrant({ targetBizTypes: ["IT·소프트웨어"], region: "전국", deadline: "상시" });
      const condition = makeCondition({ bizType: "IT·소프트웨어", bizAge: "1~3년", summary: "" });
      expect(ruleScore(grant, condition)).toBe(47);
    });
  });

  describe("키워드 겹침 보너스 (0.3 이상 → 최대 +25)", () => {
    it("키워드가 많이 겹치면 보너스 추가", () => {
      const grant = makeGrant({
        targetBizTypes: ["IT·소프트웨어"],
        region: "전국",
        deadline: "상시",
        title: "AI 스타트업 지원사업",
        description: "AI 인공지능 딥러닝 머신러닝 스타트업 지원",
        requirements: "AI 기술 보유 기업",
      });
      const condition = makeCondition({
        bizType: "IT·소프트웨어",
        bizAge: "1~3년",
        summary: "AI 인공지능 딥러닝 머신러닝 기술을 활용한 서비스",
        keywords: ["AI", "인공지능", "딥러닝", "머신러닝", "스타트업"],
      });
      const score = ruleScore(grant, condition);
      expect(score).toBeGreaterThan(47); // 키워드 보너스 있음
    });

    it("겹침 없는 키워드는 보너스 없음", () => {
      const grant = makeGrant({
        targetBizTypes: ["IT·소프트웨어"],
        region: "전국",
        deadline: "상시",
        title: "농업 지원사업",
        description: "농업 기술 개발 지원",
        requirements: "농업 기업",
      });
      const condition = makeCondition({
        bizType: "IT·소프트웨어",
        bizAge: "1~3년",
        summary: "패션 뷰티 화장품 플랫폼",
        keywords: ["패션", "뷰티", "화장품", "플랫폼"],
      });
      const score = ruleScore(grant, condition);
      expect(score).toBe(47); // 보너스 없음
    });
  });
});

// ── ruleScore 종합 시나리오 ──────────────────────────────────────────────────────

describe("ruleScore - 종합 시나리오", () => {
  it("완벽 매칭: 지역/업종/업력/마감 모두 최상", () => {
    const futureDate = new Date(Date.now() + 15 * 86400000);
    const deadline = futureDate.toISOString().split("T")[0];
    const grant = makeGrant({
      region: "서울",
      targetBizTypes: ["IT·소프트웨어"],
      deadline,
    });
    const condition = makeCondition({ region: "서울", bizType: "IT·소프트웨어", bizAge: "1~3년" });
    // +15(지역) +20(업종) +10(업력) +10(마감30일내) = 55
    expect(ruleScore(grant, condition)).toBe(55);
  });

  it("최악 매칭: 지역/업종/업력/마감 모두 불일치", () => {
    const pastDate = new Date(Date.now() - 30 * 86400000);
    const deadline = pastDate.toISOString().split("T")[0];
    const grant = makeGrant({
      region: "부산",
      targetBizTypes: ["건설"],
      deadline,
      maxBizAge: 1,
    });
    const condition = makeCondition({ region: "제주", bizType: "IT·소프트웨어", bizAge: "7년 이상" });
    // -10(지역) -15(업종) -15(업력초과) -30(마감) = -70
    expect(ruleScore(grant, condition)).toBe(-70);
  });

  it("소상공인 음식점 시나리오", () => {
    const grant = makeGrant({
      region: "경기",
      targetBizTypes: ["음식점·외식", "소매·유통"],
      deadline: "상시",
    });
    const condition = makeCondition({ region: "경기", bizType: "음식점·외식", bizAge: "3~5년" });
    // +15(지역) +20(업종) +10(업력) +5(상시) = 50
    expect(ruleScore(grant, condition)).toBe(50);
  });

  it("예비창업자 IT 시나리오", () => {
    const grant = makeGrant({
      region: "전국",
      targetBizTypes: ["IT·소프트웨어", "게임"],
      deadline: "상시",
    });
    const condition = makeCondition({ region: "대전", bizType: "IT·소프트웨어", bizAge: "예비창업자" });
    // +12(전국) +20(업종) +10(업력조건없음) +5(상시) = 47
    expect(ruleScore(grant, condition)).toBe(47);
  });
});

// ── rankGrants ──────────────────────────────────────────────────────────────────

describe("rankGrants", () => {
  let grants: Grant[];
  let condition: UserCondition;

  beforeEach(() => {
    grants = [
      makeGrant({ id: "G001", region: "전국", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" }),
      makeGrant({ id: "G002", region: "부산", targetBizTypes: ["건설"], deadline: "상시" }), // 낮은 점수
      makeGrant({ id: "G003", region: "서울", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" }),
    ];
    condition = makeCondition({ region: "서울", bizType: "IT·소프트웨어", bizAge: "1~3년" });
  });

  it("결과가 점수 내림차순으로 정렬됨", () => {
    const result = rankGrants(grants, condition);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    }
  });

  it("low 등급 결과 필터링됨", () => {
    const result = rankGrants(grants, condition);
    for (const item of result) {
      expect(item.grade).not.toBe("low");
    }
  });

  it("topN 이내로 결과 제한", () => {
    const manyGrants = Array.from({ length: 20 }, (_, i) =>
      makeGrant({ id: `G${i}`, region: "전국", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" })
    );
    const result = rankGrants(manyGrants, condition, 10);
    expect(result.length).toBeLessThanOrEqual(10);
  });

  it("기본 topN은 15", () => {
    const manyGrants = Array.from({ length: 20 }, (_, i) =>
      makeGrant({ id: `G${i}`, region: "전국", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" })
    );
    const result = rankGrants(manyGrants, condition);
    expect(result.length).toBeLessThanOrEqual(15);
  });

  it("동점 시 id 오름차순으로 안정 정렬", () => {
    const sameScoreGrants = [
      makeGrant({ id: "G003", region: "전국", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" }),
      makeGrant({ id: "G001", region: "전국", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" }),
      makeGrant({ id: "G002", region: "전국", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" }),
    ];
    const result = rankGrants(sameScoreGrants, condition);
    const ids = result.map(r => r.grant.id);
    expect(ids).toEqual(["G001", "G002", "G003"]);
  });

  it("빈 grants 배열이면 빈 결과", () => {
    expect(rankGrants([], condition)).toEqual([]);
  });

  it("결과에 grade 포함됨", () => {
    const result = rankGrants(grants, condition);
    for (const item of result) {
      expect(["high", "medium", "low"]).toContain(item.grade);
    }
  });

  it("결과에 score 포함됨", () => {
    const result = rankGrants(grants, condition);
    for (const item of result) {
      expect(typeof item.score).toBe("number");
    }
  });

  it("입력 배열 순서가 변경되지 않음 (원본 불변)", () => {
    const original = [...grants];
    rankGrants(grants, condition);
    expect(grants.map(g => g.id)).toEqual(original.map(g => g.id));
  });

  it("결정적 결과: 동일 입력이면 항상 동일 출력", () => {
    const result1 = rankGrants(grants, condition);
    const result2 = rankGrants(grants, condition);
    expect(result1.map(r => r.grant.id)).toEqual(result2.map(r => r.grant.id));
    expect(result1.map(r => r.score)).toEqual(result2.map(r => r.score));
  });
});

// ── fallbackResults ──────────────────────────────────────────────────────────────

describe("fallbackResults", () => {
  it("각 결과에 grant, matchScore, reason, matchReasons 포함", () => {
    const grant = makeGrant({ region: "전국", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" });
    const condition = makeCondition({ bizType: "IT·소프트웨어", bizAge: "1~3년" });
    const scored = rankGrants([grant], condition);
    const results = fallbackResults(scored, condition);
    expect(results).toHaveLength(1);
    expect(results[0].grant).toBe(grant);
    expect(["high", "medium", "low"]).toContain(results[0].matchScore);
    expect(typeof results[0].reason).toBe("string");
    expect(results[0].reason.length).toBeGreaterThan(0);
    expect(Array.isArray(results[0].matchReasons)).toBe(true);
  });

  it("reason에 업종과 지역 정보 포함", () => {
    const grant = makeGrant({ region: "전국", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" });
    const condition = makeCondition({ bizType: "IT·소프트웨어", region: "서울", bizAge: "1~3년" });
    const scored = rankGrants([grant], condition);
    const results = fallbackResults(scored, condition);
    expect(results[0].reason).toContain("IT·소프트웨어");
    expect(results[0].reason).toContain("서울");
  });

  it("빈 scored 배열이면 빈 결과", () => {
    const condition = makeCondition();
    expect(fallbackResults([], condition)).toEqual([]);
  });

  it("여러 항목이 있으면 순서 유지", () => {
    const grant1 = makeGrant({ id: "G001", region: "서울", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" });
    const grant2 = makeGrant({ id: "G002", region: "전국", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" });
    const condition = makeCondition({ region: "서울", bizType: "IT·소프트웨어", bizAge: "1~3년" });
    const scored = rankGrants([grant1, grant2], condition);
    const results = fallbackResults(scored, condition);
    expect(results).toHaveLength(2);
  });
});

// ── 결정론(Determinism) 보장 ──────────────────────────────────────────────────────

describe("스코어링 결정론 보장 (인터뷰 피드백)", () => {
  it("동일 입력 10회 반복 시 결과 동일", () => {
    const grant = makeGrant({ region: "전국", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" });
    const condition = makeCondition({ bizType: "IT·소프트웨어", bizAge: "1~3년" });
    const scores = Array.from({ length: 10 }, () => ruleScore(grant, condition));
    expect(new Set(scores).size).toBe(1); // 모두 같은 값
  });

  it("입력 순서가 달라도 rankGrants 결과 동일", () => {
    const grants1 = [
      makeGrant({ id: "G001", region: "전국", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" }),
      makeGrant({ id: "G002", region: "서울", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" }),
    ];
    const grants2 = [
      makeGrant({ id: "G002", region: "서울", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" }),
      makeGrant({ id: "G001", region: "전국", targetBizTypes: ["IT·소프트웨어"], deadline: "상시" }),
    ];
    const condition = makeCondition({ region: "서울", bizType: "IT·소프트웨어", bizAge: "1~3년" });
    const result1 = rankGrants(grants1, condition).map(r => r.grant.id);
    const result2 = rankGrants(grants2, condition).map(r => r.grant.id);
    expect(result1).toEqual(result2);
  });
});
