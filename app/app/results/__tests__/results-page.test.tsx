/**
 * results/page.tsx 테스트.
 *
 *   - searchParams 파싱 → /api/match POST 본문 구성
 *   - 로딩 / 에러 / 결과 3가지 상태 렌더링
 *   - source 배지: "Live API" vs "Seed"
 *   - 적합도 높음 카운트 계산
 *   - AI 신청서 생성 / 전문가 상담 링크 query 구성
 *   - keywords 파싱 (콤마 분리, 빈 값 필터)
 *   - 결과 0개 시 empty state
 *   - SaveMatchSection 은 matches > 0 때만 노출
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import ResultsPage from "../page";

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

let searchParamsMock = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => searchParamsMock.get(key),
    toString: () => searchParamsMock.toString(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

// 자식 컴포넌트는 단순 stub 으로 — props 검증용
vi.mock("@/components/GrantCard", () => ({
  default: ({ match, searchParams }: { match: { grant: { id: string; title: string } }; searchParams: string }) => (
    <div data-testid={`grant-card-${match.grant.id}`} data-search-params={searchParams}>
      {match.grant.title}
    </div>
  ),
}));

vi.mock("@/components/SaveMatchSection", () => ({
  default: ({ matchedGrants }: { matchedGrants: unknown[] }) => (
    <div data-testid="save-match-section" data-count={matchedGrants.length}>
      SaveMatchSection
    </div>
  ),
}));

const originalFetch = global.fetch;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  searchParamsMock = new URLSearchParams();
  fetchMock = vi.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  global.fetch = originalFetch;
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function setSearchParams(obj: Record<string, string>) {
  searchParamsMock = new URLSearchParams(obj);
}

function mockMatchSuccess(matches: Array<{
  grant: { id: string; title: string };
  matchScore: "high" | "medium" | "low";
}> = [], totalGrants = 0, source = "seed") {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ matches, totalGrants, source }),
  });
}

const sampleMatches = [
  {
    grant: {
      id: "g1",
      title: "AI 바우처",
      orgName: "정부",
      category: "AI",
      region: "전국",
      targetBizTypes: ["IT"],
      amount: "1억",
      deadline: "상시",
      description: "",
      requirements: "",
      url: "",
    },
    matchScore: "high" as const,
    reason: "",
    matchReasons: [],
  },
  {
    grant: {
      id: "g2",
      title: "데이터 바우처",
      orgName: "정부",
      category: "data",
      region: "전국",
      targetBizTypes: ["IT"],
      amount: "5천",
      deadline: "상시",
      description: "",
      requirements: "",
      url: "",
    },
    matchScore: "medium" as const,
    reason: "",
    matchReasons: [],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 로딩 상태
// ─────────────────────────────────────────────────────────────────────────────

describe("ResultsPage: 로딩 상태", () => {
  it("초기에는 'AI가 지원사업을 분석하고 있습니다' 노출", async () => {
    fetchMock.mockReturnValue(new Promise(() => {})); // pending forever
    setSearchParams({
      bizType: "IT·소프트웨어",
      revenue: "1억 미만",
      region: "서울",
      bizAge: "1~3년",
      ceoAge: "30대",
    });
    render(<ResultsPage />);
    await waitFor(() => {
      expect(screen.getByText("AI가 지원사업을 분석하고 있습니다")).toBeInTheDocument();
    });
  });

  it("로딩 메시지에 예상 소요시간 안내", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<ResultsPage />);
    await waitFor(() => {
      expect(screen.getByText(/약 10~20초 소요/)).toBeInTheDocument();
    });
  });

  it("로딩 중에는 결과 카드 미노출", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<ResultsPage />);
    await waitFor(() => screen.getByText("AI가 지원사업을 분석하고 있습니다"));
    expect(screen.queryByTestId(/grant-card/)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// API 호출
// ─────────────────────────────────────────────────────────────────────────────

describe("ResultsPage: /api/match 호출", () => {
  it("마운트 시 fetch('/api/match') POST 호출", async () => {
    mockMatchSuccess();
    render(<ResultsPage />);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/match",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("POST body 에 searchParams 의 condition 포함", async () => {
    mockMatchSuccess();
    setSearchParams({
      bizType: "IT·소프트웨어",
      revenue: "1억 미만",
      region: "서울",
      bizAge: "1~3년",
      ceoAge: "30대",
    });
    render(<ResultsPage />);
    await waitFor(() => {
      const opts = fetchMock.mock.calls[0][1];
      const body = JSON.parse(opts.body);
      expect(body.bizType).toBe("IT·소프트웨어");
      expect(body.region).toBe("서울");
    });
  });

  it("Content-Type: application/json 헤더 전송", async () => {
    mockMatchSuccess();
    render(<ResultsPage />);
    await waitFor(() => {
      const opts = fetchMock.mock.calls[0][1];
      expect(opts.headers["Content-Type"]).toBe("application/json");
    });
  });

  it("summary 가 있으면 body 에 포함", async () => {
    mockMatchSuccess();
    setSearchParams({
      bizType: "IT", revenue: "1억", region: "서울",
      bizAge: "1~3년", ceoAge: "30대",
      summary: "AI 기반 SaaS",
    });
    render(<ResultsPage />);
    await waitFor(() => {
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.summary).toBe("AI 기반 SaaS");
    });
  });

  it("summary 가 없으면 body.summary 는 undefined", async () => {
    mockMatchSuccess();
    setSearchParams({
      bizType: "IT", revenue: "1억", region: "서울",
      bizAge: "1~3년", ceoAge: "30대",
    });
    render(<ResultsPage />);
    await waitFor(() => {
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.summary).toBeUndefined();
    });
  });

  it("keywords 콤마 분리해서 배열로 전송", async () => {
    mockMatchSuccess();
    setSearchParams({
      bizType: "IT", revenue: "1억", region: "서울",
      bizAge: "1~3년", ceoAge: "30대",
      keywords: "AI,ML,SaaS",
    });
    render(<ResultsPage />);
    await waitFor(() => {
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.keywords).toEqual(["AI", "ML", "SaaS"]);
    });
  });

  it("keywords 의 빈 값(,,)은 필터링", async () => {
    mockMatchSuccess();
    setSearchParams({
      bizType: "IT", revenue: "1억", region: "서울",
      bizAge: "1~3년", ceoAge: "30대",
      keywords: "AI,,SaaS,",
    });
    render(<ResultsPage />);
    await waitFor(() => {
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.keywords).toEqual(["AI", "SaaS"]);
    });
  });

  it("keywords 없을 때 body.keywords 는 undefined", async () => {
    mockMatchSuccess();
    render(<ResultsPage />);
    await waitFor(() => {
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.keywords).toBeUndefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 결과 렌더링
// ─────────────────────────────────────────────────────────────────────────────

describe("ResultsPage: 결과 표시", () => {
  it("매칭 결과 카드 노출", async () => {
    mockMatchSuccess(sampleMatches, 100, "seed");
    render(<ResultsPage />);
    await waitFor(() => {
      expect(screen.getByTestId("grant-card-g1")).toBeInTheDocument();
      expect(screen.getByTestId("grant-card-g2")).toBeInTheDocument();
    });
  });

  it("totalGrants 노출 (분석 완료 카운트)", async () => {
    mockMatchSuccess(sampleMatches, 250, "seed");
    render(<ResultsPage />);
    await waitFor(() => {
      expect(screen.getByText(/250개/)).toBeInTheDocument();
    });
  });

  it("매칭 개수 노출", async () => {
    mockMatchSuccess(sampleMatches, 100, "seed");
    render(<ResultsPage />);
    await waitFor(() => {
      expect(screen.getByText(/2개 매칭/)).toBeInTheDocument();
    });
  });

  it("high 등급만 카운트 (적합도 높음)", async () => {
    mockMatchSuccess(sampleMatches, 100, "seed");
    render(<ResultsPage />);
    await waitFor(() => {
      expect(screen.getByText(/1개/)).toBeInTheDocument();
      expect(screen.getByText(/적합도 높음/)).toBeInTheDocument();
    });
  });

  it("high 0개일 때 적합도 높음 라벨 미노출", async () => {
    const noHigh = [
      { ...sampleMatches[1] },
    ];
    mockMatchSuccess(noHigh, 100, "seed");
    render(<ResultsPage />);
    await waitFor(() => {
      expect(screen.queryByText(/적합도 높음/)).not.toBeInTheDocument();
    });
  });

  it("결과 0개일 때 empty state '매칭되는 지원사업이 없습니다'", async () => {
    mockMatchSuccess([], 100, "seed");
    render(<ResultsPage />);
    await waitFor(() => {
      expect(screen.getByText(/매칭되는 지원사업이 없습니다/)).toBeInTheDocument();
    });
  });

  it("결과 0개일 때 SaveMatchSection 미노출", async () => {
    mockMatchSuccess([], 100, "seed");
    render(<ResultsPage />);
    await waitFor(() => screen.getByText(/매칭되는 지원사업이 없습니다/));
    expect(screen.queryByTestId("save-match-section")).not.toBeInTheDocument();
  });

  it("결과 있으면 SaveMatchSection 노출", async () => {
    mockMatchSuccess(sampleMatches, 100, "seed");
    render(<ResultsPage />);
    await waitFor(() => {
      expect(screen.getByTestId("save-match-section")).toBeInTheDocument();
    });
  });

  it("SaveMatchSection 에 matchedGrants 개수 전달", async () => {
    mockMatchSuccess(sampleMatches, 100, "seed");
    render(<ResultsPage />);
    await waitFor(() => {
      const section = screen.getByTestId("save-match-section");
      expect(section.getAttribute("data-count")).toBe("2");
    });
  });

  it("GrantCard 에 searchParams 문자열 전달", async () => {
    mockMatchSuccess(sampleMatches, 100, "seed");
    setSearchParams({
      bizType: "IT", revenue: "1억", region: "서울",
      bizAge: "1~3년", ceoAge: "30대",
    });
    render(<ResultsPage />);
    await waitFor(() => {
      const card = screen.getByTestId("grant-card-g1");
      const passedParams = card.getAttribute("data-search-params") || "";
      expect(passedParams).toContain("bizType=");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// source 배지
// ─────────────────────────────────────────────────────────────────────────────

describe("ResultsPage: source 배지", () => {
  it("source='seed' 일 때 'Seed' 배지", async () => {
    mockMatchSuccess(sampleMatches, 100, "seed");
    render(<ResultsPage />);
    await waitFor(() => {
      expect(screen.getByText("Seed")).toBeInTheDocument();
    });
  });

  it("source='live+seed' 일 때 'Live API' 배지", async () => {
    mockMatchSuccess(sampleMatches, 100, "live+seed");
    render(<ResultsPage />);
    await waitFor(() => {
      expect(screen.getByText("Live API")).toBeInTheDocument();
    });
  });

  it("source 가 빈 문자열이면 배지 미노출", async () => {
    mockMatchSuccess(sampleMatches, 100, "");
    render(<ResultsPage />);
    await waitFor(() => screen.getByText(/100개/));
    expect(screen.queryByText("Live API")).not.toBeInTheDocument();
    expect(screen.queryByText("Seed")).not.toBeInTheDocument();
  });

  it("Live API 배지에는 emerald 색상", async () => {
    mockMatchSuccess(sampleMatches, 100, "live+seed");
    render(<ResultsPage />);
    await waitFor(() => {
      const badge = screen.getByText("Live API");
      expect(badge.className).toContain("emerald");
    });
  });

  it("Seed 배지에는 amber 색상", async () => {
    mockMatchSuccess(sampleMatches, 100, "seed");
    render(<ResultsPage />);
    await waitFor(() => {
      const badge = screen.getByText("Seed");
      expect(badge.className).toContain("amber");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 에러 처리
// ─────────────────────────────────────────────────────────────────────────────

describe("ResultsPage: 에러 처리", () => {
  it("fetch 실패 시 에러 메시지", async () => {
    fetchMock.mockRejectedValue(new Error("network"));
    render(<ResultsPage />);
    await waitFor(() => {
      expect(screen.getByText(/매칭 결과를 불러오는 중 오류가 발생했습니다/)).toBeInTheDocument();
    });
  });

  it("응답에 error 필드 있으면 그 메시지 표시", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ error: "특별 에러 메시지" }),
    });
    render(<ResultsPage />);
    await waitFor(() => {
      expect(screen.getByText("특별 에러 메시지")).toBeInTheDocument();
    });
  });

  it("에러 상태에서 '다시 시도' 링크 노출", async () => {
    fetchMock.mockRejectedValue(new Error("x"));
    render(<ResultsPage />);
    await waitFor(() => {
      const link = screen.getByText("다시 시도");
      expect(link.closest("a")?.getAttribute("href")).toBe("/");
    });
  });

  it("에러 상태에서 결과 카드 미노출", async () => {
    fetchMock.mockRejectedValue(new Error("x"));
    render(<ResultsPage />);
    await waitFor(() => screen.getByText(/매칭 결과를 불러오는 중/));
    expect(screen.queryByTestId(/grant-card/)).not.toBeInTheDocument();
  });

  it("에러 후에는 로딩 인디케이터 사라짐", async () => {
    fetchMock.mockRejectedValue(new Error("x"));
    render(<ResultsPage />);
    await waitFor(() => screen.getByText(/매칭 결과를 불러오는 중/));
    expect(screen.queryByText("AI가 지원사업을 분석하고 있습니다")).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 헤더 / 조건 칩
// ─────────────────────────────────────────────────────────────────────────────

describe("ResultsPage: 헤더와 조건 칩", () => {
  it("페이지 제목 '매칭 결과' 노출", async () => {
    mockMatchSuccess();
    render(<ResultsPage />);
    await waitFor(() => {
      expect(screen.getByText("매칭 결과")).toBeInTheDocument();
    });
  });

  it("'다시 검색' 링크 노출 (홈으로)", async () => {
    mockMatchSuccess();
    render(<ResultsPage />);
    await waitFor(() => {
      const link = screen.getByText("다시 검색");
      expect(link.closest("a")?.getAttribute("href")).toBe("/");
    });
  });

  it("5개 조건이 모두 칩으로 노출", async () => {
    mockMatchSuccess();
    setSearchParams({
      bizType: "IT·소프트웨어",
      revenue: "1억 미만",
      region: "서울",
      bizAge: "1~3년",
      ceoAge: "30대",
    });
    render(<ResultsPage />);
    await waitFor(() => {
      expect(screen.getByText("IT·소프트웨어")).toBeInTheDocument();
      expect(screen.getByText("1억 미만")).toBeInTheDocument();
      expect(screen.getByText("서울")).toBeInTheDocument();
      expect(screen.getByText("1~3년")).toBeInTheDocument();
      expect(screen.getByText("30대")).toBeInTheDocument();
    });
  });

  it("빈 값은 칩으로 노출 안 됨", async () => {
    mockMatchSuccess();
    setSearchParams({ bizType: "IT·소프트웨어" });
    render(<ResultsPage />);
    await waitFor(() => {
      expect(screen.getByText("IT·소프트웨어")).toBeInTheDocument();
    });
  });

  it("summary 있으면 'AI 분석 적용' 칩 노출", async () => {
    mockMatchSuccess();
    setSearchParams({
      bizType: "IT", revenue: "1억", region: "서울",
      bizAge: "1~3년", ceoAge: "30대",
      summary: "AI SaaS",
    });
    render(<ResultsPage />);
    await waitFor(() => {
      expect(screen.getByText("AI 분석 적용")).toBeInTheDocument();
    });
  });

  it("summary 없으면 'AI 분석 적용' 칩 미노출", async () => {
    mockMatchSuccess();
    setSearchParams({
      bizType: "IT", revenue: "1억", region: "서울",
      bizAge: "1~3년", ceoAge: "30대",
    });
    render(<ResultsPage />);
    await waitFor(() => screen.getByText("매칭 결과"));
    expect(screen.queryByText("AI 분석 적용")).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 액션 링크 (AI 신청서 / 전문가)
// ─────────────────────────────────────────────────────────────────────────────

describe("ResultsPage: 액션 링크", () => {
  it("'AI 신청서 생성' 링크 노출", async () => {
    mockMatchSuccess(sampleMatches, 100, "seed");
    render(<ResultsPage />);
    await waitFor(() => {
      expect(screen.getByText("AI 신청서 생성")).toBeInTheDocument();
    });
  });

  it("'전문가 상담' 링크 노출", async () => {
    mockMatchSuccess(sampleMatches, 100, "seed");
    render(<ResultsPage />);
    await waitFor(() => {
      expect(screen.getByText("전문가 상담")).toBeInTheDocument();
    });
  });

  it("AI 신청서 생성 링크는 /generate 로", async () => {
    mockMatchSuccess(sampleMatches, 100, "seed");
    render(<ResultsPage />);
    await waitFor(() => {
      const link = screen.getByText("AI 신청서 생성").closest("a")!;
      expect(link.getAttribute("href")!.startsWith("/generate")).toBe(true);
    });
  });

  it("전문가 상담 링크는 /experts 로", async () => {
    mockMatchSuccess(sampleMatches, 100, "seed");
    render(<ResultsPage />);
    await waitFor(() => {
      const link = screen.getByText("전문가 상담").closest("a")!;
      expect(link.getAttribute("href")!.startsWith("/experts")).toBe(true);
    });
  });

  it("summary 가 있으면 /generate 링크에 bizInfo 쿼리 포함", async () => {
    mockMatchSuccess(sampleMatches, 100, "seed");
    setSearchParams({
      bizType: "IT", revenue: "1억", region: "서울",
      bizAge: "1~3년", ceoAge: "30대",
      summary: "AI SaaS",
    });
    render(<ResultsPage />);
    await waitFor(() => {
      const link = screen.getByText("AI 신청서 생성").closest("a")!;
      expect(link.getAttribute("href")).toContain("bizInfo=");
    });
  });

  it("keywords 가 있으면 /generate 링크에 keywords 쿼리 포함", async () => {
    mockMatchSuccess(sampleMatches, 100, "seed");
    setSearchParams({
      bizType: "IT", revenue: "1억", region: "서울",
      bizAge: "1~3년", ceoAge: "30대",
      keywords: "AI,SaaS",
    });
    render(<ResultsPage />);
    await waitFor(() => {
      const link = screen.getByText("AI 신청서 생성").closest("a")!;
      expect(link.getAttribute("href")).toContain("keywords=");
    });
  });

  it("/experts 링크에 region 쿼리 포함", async () => {
    mockMatchSuccess(sampleMatches, 100, "seed");
    setSearchParams({
      bizType: "IT", revenue: "1억", region: "서울",
      bizAge: "1~3년", ceoAge: "30대",
    });
    render(<ResultsPage />);
    await waitFor(() => {
      const link = screen.getByText("전문가 상담").closest("a")!;
      expect(link.getAttribute("href")).toContain("region=");
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 회귀 방지
// ─────────────────────────────────────────────────────────────────────────────

describe("ResultsPage: 회귀 방지", () => {
  it("fetch 경로 회귀: '/api/match'", async () => {
    mockMatchSuccess();
    render(<ResultsPage />);
    await waitFor(() => {
      expect(fetchMock.mock.calls[0][0]).toBe("/api/match");
    });
  });

  it("POST 메서드 회귀", async () => {
    mockMatchSuccess();
    render(<ResultsPage />);
    await waitFor(() => {
      expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    });
  });

  it("뒤로 가기 링크 회귀: '/'", async () => {
    mockMatchSuccess();
    render(<ResultsPage />);
    await waitFor(() => {
      const back = screen.getByText("다시 검색").closest("a")!;
      expect(back.getAttribute("href")).toBe("/");
    });
  });

  it("페이지 제목 회귀: '매칭 결과'", async () => {
    mockMatchSuccess();
    render(<ResultsPage />);
    await waitFor(() => {
      expect(screen.getByText("매칭 결과")).toBeInTheDocument();
    });
  });

  it("Empty state 메시지 회귀", async () => {
    mockMatchSuccess([], 100, "seed");
    render(<ResultsPage />);
    await waitFor(() => {
      expect(screen.getByText("현재 조건에 매칭되는 지원사업이 없습니다")).toBeInTheDocument();
      expect(screen.getByText(/조건을 변경하여 다시 검색해보세요/)).toBeInTheDocument();
    });
  });

  it("로딩 카피 회귀: 'AI가 지원사업을 분석하고 있습니다'", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<ResultsPage />);
    await waitFor(() => {
      expect(screen.getByText("AI가 지원사업을 분석하고 있습니다")).toBeInTheDocument();
    });
  });

  it("source 값 회귀: 'live+seed' / 'seed' 만 처리", async () => {
    mockMatchSuccess(sampleMatches, 100, "unknown_source");
    render(<ResultsPage />);
    await waitFor(() => screen.getByText(/100개/));
    // unknown_source 는 그대로 노출되지만 Live/Seed 라벨은 분기에서 미스
    expect(screen.queryByText("Live API")).not.toBeInTheDocument();
  });

  it("결정성: 같은 응답 → 같은 렌더링", async () => {
    mockMatchSuccess(sampleMatches, 100, "seed");
    const { container: c1 } = render(<ResultsPage />);
    await waitFor(() => screen.getByText(/100개/));
    const html1 = c1.innerHTML;
    cleanup();

    mockMatchSuccess(sampleMatches, 100, "seed");
    const { container: c2 } = render(<ResultsPage />);
    await waitFor(() => screen.getByText(/100개/));
    expect(c2.innerHTML).toBe(html1);
  });
});
