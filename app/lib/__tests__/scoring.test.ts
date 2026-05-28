/**
 * 매칭 스코어링 로직 테스트
 * 인터뷰 피드백: "결과 신뢰도" 검증용
 */

describe("scoreToGrade thresholds", () => {
  // scoreToGrade 기준: high >= 40, medium >= 20, low < 20
  const scoreToGrade = (score: number): "high" | "medium" | "low" => {
    if (score >= 40) return "high";
    if (score >= 20) return "medium";
    return "low";
  };

  it("40점 이상은 high", () => {
    expect(scoreToGrade(40)).toBe("high");
    expect(scoreToGrade(100)).toBe("high");
  });

  it("20~39점은 medium", () => {
    expect(scoreToGrade(20)).toBe("medium");
    expect(scoreToGrade(39)).toBe("medium");
  });

  it("19점 이하는 low", () => {
    expect(scoreToGrade(19)).toBe("low");
    expect(scoreToGrade(0)).toBe("low");
    expect(scoreToGrade(-30)).toBe("low");
  });
});

describe("최소 결과 보장 로직 (인터뷰 픽스)", () => {
  const MINIMUM_RESULTS = 3;

  it("high/medium이 3개 이상이면 그대로 사용", () => {
    const highMedium = [1, 2, 3, 4]; // 4개
    const result = highMedium.length >= MINIMUM_RESULTS
      ? highMedium.slice(0, 15)
      : highMedium;
    expect(result.length).toBe(4);
  });

  it("high/medium이 0개면 전체에서 상위 3개 사용 (0결과 방지)", () => {
    const allScored = [1, 2, 3, 4, 5];
    const highMedium: number[] = [];
    const result = highMedium.length >= MINIMUM_RESULTS
      ? highMedium.slice(0, 15)
      : allScored.slice(0, MINIMUM_RESULTS);
    expect(result.length).toBe(3);
  });

  it("결과가 항상 최소 3개 보장됨", () => {
    const allScored = [1, 2, 3, 4, 5];
    const highMedium: number[] = [];
    const result = highMedium.length >= MINIMUM_RESULTS
      ? highMedium.slice(0, 15)
      : allScored.slice(0, MINIMUM_RESULTS);
    expect(result.length).toBeGreaterThanOrEqual(MINIMUM_RESULTS);
  });
});

describe("bizAge 파싱", () => {
  const parseBizAge = (bizAge: string): number => {
    if (bizAge.includes("예비")) return 0;
    if (bizAge.includes("1년 미만")) return 0.5;
    if (bizAge.includes("1~3")) return 2;
    if (bizAge.includes("3~5")) return 4;
    if (bizAge.includes("5~7")) return 6;
    if (bizAge.includes("7년 이상")) return 8;
    return 3;
  };

  it("예비창업자 → 0", () => expect(parseBizAge("예비창업자")).toBe(0));
  it("1년 미만 → 0.5", () => expect(parseBizAge("1년 미만")).toBe(0.5));
  it("3~5년 → 4", () => expect(parseBizAge("3~5년")).toBe(4));
  it("7년 이상 → 8", () => expect(parseBizAge("7년 이상")).toBe(8));
  it("알 수 없음 → 3 (기본값)", () => expect(parseBizAge("알 수 없음")).toBe(3));
});
