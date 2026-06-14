import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { render, screen, within } from "@testing-library/react";
import GrantCard from "@/components/GrantCard";
import type { MatchResult } from "@/lib/types";

/**
 * GrantCard 시급도 배지 확장 테스트
 *
 * 사장님 인터뷰 인사이트 #3: "마감일이 언제까지인지 한눈에 안 보여서 놓친 적 있어요."
 *
 * 4단계 urgency 매핑 + 색상 + 배지 텍스트의 전수 검증.
 */

const NOW = new Date("2026-05-30T00:00:00Z").getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  vi.useRealTimers();
});

function dateInDays(days: number): string {
  const d = new Date(NOW + days * 24 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

function makeMatch(deadline: string): MatchResult {
  return {
    grant: {
      id: `g-${deadline}`,
      title: "지원사업 테스트",
      orgName: "테스트청",
      category: "운영자금",
      deadline,
      amount: "최대 1,000만원",
      description: "테스트 공고",
      requirements: [],
      sourceUrl: "https://example.com",
    },
    matchScore: "high",
    reason: "조건이 잘 맞아요",
    matchReasons: [],
  } as unknown as MatchResult;
}

describe("GrantCard urgency — critical (D-Day ~ D-3)", () => {
  const criticalDays = [0, 1, 2, 3];

  it.each(criticalDays)(
    "D-%i: critical 배지 '⚡ 지금 바로 신청!' 표시",
    (days) => {
      render(<GrantCard match={makeMatch(dateInDays(days))} searchParams="" />);
      expect(screen.getByText("⚡ 지금 바로 신청!")).toBeInTheDocument();
    },
  );

  it.each(criticalDays)(
    "D-%i: '마감 임박' 배지는 표시되지 않음 (critical 우선)",
    (days) => {
      render(<GrantCard match={makeMatch(dateInDays(days))} searchParams="" />);
      expect(screen.queryByText("⏰ 마감 임박")).toBeNull();
    },
  );

  it("D-0 → D-Day 라벨 표시", () => {
    render(<GrantCard match={makeMatch(dateInDays(0))} searchParams="" />);
    expect(screen.getByText("D-Day")).toBeInTheDocument();
  });

  it("D-1 → 'D-1' 라벨 표시", () => {
    render(<GrantCard match={makeMatch(dateInDays(1))} searchParams="" />);
    expect(screen.getByText("D-1")).toBeInTheDocument();
  });

  it("D-3 → 'D-3' 라벨 표시", () => {
    render(<GrantCard match={makeMatch(dateInDays(3))} searchParams="" />);
    expect(screen.getByText("D-3")).toBeInTheDocument();
  });

  it.each(criticalDays)(
    "D-%i: 펄스 애니메이션 class 적용",
    (days) => {
      const { container } = render(
        <GrantCard match={makeMatch(dateInDays(days))} searchParams="" />,
      );
      const pulse = container.querySelector("[class*=animate-]");
      expect(pulse).not.toBeNull();
    },
  );

  it.each(criticalDays)(
    "D-%i: 빨간 ring class 적용",
    (days) => {
      const { container } = render(
        <GrantCard match={makeMatch(dateInDays(days))} searchParams="" />,
      );
      const html = container.innerHTML;
      expect(html).toContain("ring-red-500");
    },
  );
});

describe("GrantCard urgency — urgent (D-4 ~ D-7)", () => {
  const urgentDays = [4, 5, 6, 7];

  it.each(urgentDays)(
    "D-%i: '⏰ 마감 임박' 배지 표시",
    (days) => {
      render(<GrantCard match={makeMatch(dateInDays(days))} searchParams="" />);
      expect(screen.getByText("⏰ 마감 임박")).toBeInTheDocument();
    },
  );

  it.each(urgentDays)(
    "D-%i: critical 배지는 표시 안 됨",
    (days) => {
      render(<GrantCard match={makeMatch(dateInDays(days))} searchParams="" />);
      expect(screen.queryByText("⚡ 지금 바로 신청!")).toBeNull();
    },
  );

  it.each(urgentDays)("D-%i: D-day 라벨 표시", (days) => {
    render(<GrantCard match={makeMatch(dateInDays(days))} searchParams="" />);
    expect(screen.getByText(`D-${days}`)).toBeInTheDocument();
  });

  it.each(urgentDays)(
    "D-%i: 오렌지 ring class 적용",
    (days) => {
      const { container } = render(
        <GrantCard match={makeMatch(dateInDays(days))} searchParams="" />,
      );
      const html = container.innerHTML;
      expect(html).toContain("ring-orange-500");
    },
  );
});

describe("GrantCard urgency — soon (D-8 ~ D-14)", () => {
  const soonDays = [8, 9, 10, 11, 12, 13, 14];

  it.each(soonDays)("D-%i: 어떤 시급 배지도 표시 안 됨", (days) => {
    render(<GrantCard match={makeMatch(dateInDays(days))} searchParams="" />);
    expect(screen.queryByText("⚡ 지금 바로 신청!")).toBeNull();
    expect(screen.queryByText("⏰ 마감 임박")).toBeNull();
  });

  it.each(soonDays)("D-%i: 노란 색상 적용", (days) => {
    const { container } = render(
      <GrantCard match={makeMatch(dateInDays(days))} searchParams="" />,
    );
    const html = container.innerHTML;
    expect(html).toContain("text-yellow-400");
  });
});

describe("GrantCard urgency — normal (D-15+ and 상시)", () => {
  const normalDays = [15, 20, 30, 45, 60, 90, 180];

  it.each(normalDays)("D-%i: 시급 배지 없음", (days) => {
    render(<GrantCard match={makeMatch(dateInDays(days))} searchParams="" />);
    expect(screen.queryByText("⚡ 지금 바로 신청!")).toBeNull();
    expect(screen.queryByText("⏰ 마감 임박")).toBeNull();
  });

  it("'상시': 시급 배지 없음", () => {
    render(<GrantCard match={makeMatch("상시")} searchParams="" />);
    expect(screen.queryByText("⚡ 지금 바로 신청!")).toBeNull();
    expect(screen.queryByText("⏰ 마감 임박")).toBeNull();
  });

  it("'상시': '상시' 라벨 표시", () => {
    render(<GrantCard match={makeMatch("상시")} searchParams="" />);
    expect(screen.getByText("상시")).toBeInTheDocument();
  });
});

describe("GrantCard urgency — closed (past deadline)", () => {
  const pastDays = [-1, -5, -30, -100];

  it.each(pastDays)("D%i (지난날): '마감' 라벨", (days) => {
    render(<GrantCard match={makeMatch(dateInDays(days))} searchParams="" />);
    expect(screen.getByText("마감")).toBeInTheDocument();
  });

  it.each(pastDays)("D%i: opacity 60 (visually muted)", (days) => {
    const { container } = render(
      <GrantCard match={makeMatch(dateInDays(days))} searchParams="" />,
    );
    expect(container.innerHTML).toContain("opacity-60");
  });

  it.each(pastDays)("D%i: 시급 배지 없음", (days) => {
    render(<GrantCard match={makeMatch(dateInDays(days))} searchParams="" />);
    expect(screen.queryByText("⚡ 지금 바로 신청!")).toBeNull();
    expect(screen.queryByText("⏰ 마감 임박")).toBeNull();
  });
});

describe("GrantCard urgency — boundary cases", () => {
  it("D-3 정확히: critical", () => {
    render(<GrantCard match={makeMatch(dateInDays(3))} searchParams="" />);
    expect(screen.getByText("⚡ 지금 바로 신청!")).toBeInTheDocument();
  });

  it("D-4: urgent (not critical)", () => {
    render(<GrantCard match={makeMatch(dateInDays(4))} searchParams="" />);
    expect(screen.getByText("⏰ 마감 임박")).toBeInTheDocument();
    expect(screen.queryByText("⚡ 지금 바로 신청!")).toBeNull();
  });

  it("D-7 정확히: urgent", () => {
    render(<GrantCard match={makeMatch(dateInDays(7))} searchParams="" />);
    expect(screen.getByText("⏰ 마감 임박")).toBeInTheDocument();
  });

  it("D-8: soon (not urgent)", () => {
    render(<GrantCard match={makeMatch(dateInDays(8))} searchParams="" />);
    expect(screen.queryByText("⏰ 마감 임박")).toBeNull();
  });

  it("D-14 정확히: soon", () => {
    const { container } = render(
      <GrantCard match={makeMatch(dateInDays(14))} searchParams="" />,
    );
    expect(container.innerHTML).toContain("text-yellow-400");
  });

  it("D-15: normal (not soon)", () => {
    const { container } = render(
      <GrantCard match={makeMatch(dateInDays(15))} searchParams="" />,
    );
    // Default color is text-gray-500
    expect(container.innerHTML).toContain("text-gray-500");
  });
});

describe("GrantCard urgency — visual cues", () => {
  it("critical 배지에 ⚡ 이모지", () => {
    render(<GrantCard match={makeMatch(dateInDays(1))} searchParams="" />);
    expect(screen.getByText(/⚡/)).toBeInTheDocument();
  });

  it("urgent 배지에 ⏰ 이모지", () => {
    render(<GrantCard match={makeMatch(dateInDays(5))} searchParams="" />);
    expect(screen.getByText(/⏰/)).toBeInTheDocument();
  });

  it("critical 배지에 'border' 클래스 (테두리)", () => {
    const { container } = render(
      <GrantCard match={makeMatch(dateInDays(1))} searchParams="" />,
    );
    const badge = container.querySelector(".border-red-500\\/30");
    expect(badge).not.toBeNull();
  });

  it("urgent 배지에 'border' 클래스 (테두리)", () => {
    const { container } = render(
      <GrantCard match={makeMatch(dateInDays(5))} searchParams="" />,
    );
    const badge = container.querySelector(".border-orange-500\\/30");
    expect(badge).not.toBeNull();
  });

  it("critical 배지는 둥근 모서리 (rounded-full)", () => {
    const { container } = render(
      <GrantCard match={makeMatch(dateInDays(1))} searchParams="" />,
    );
    const badge = container.querySelector(".rounded-full");
    expect(badge).not.toBeNull();
  });

  it("urgent 배지는 둥근 모서리 (rounded-full)", () => {
    const { container } = render(
      <GrantCard match={makeMatch(dateInDays(5))} searchParams="" />,
    );
    const badge = container.querySelector(".rounded-full");
    expect(badge).not.toBeNull();
  });
});

describe("GrantCard urgency — interaction with bookmark", () => {
  it("critical 카드에도 즐겨찾기 버튼 존재", () => {
    render(<GrantCard match={makeMatch(dateInDays(1))} searchParams="" />);
    expect(screen.getByLabelText(/즐겨찾기/)).toBeInTheDocument();
  });

  it("urgent 카드에도 즐겨찾기 버튼 존재", () => {
    render(<GrantCard match={makeMatch(dateInDays(5))} searchParams="" />);
    expect(screen.getByLabelText(/즐겨찾기/)).toBeInTheDocument();
  });

  it("마감 카드에도 즐겨찾기 버튼 존재", () => {
    render(<GrantCard match={makeMatch(dateInDays(-1))} searchParams="" />);
    expect(screen.getByLabelText(/즐겨찾기/)).toBeInTheDocument();
  });
});

describe("GrantCard urgency — snapshots", () => {
  it("critical 스냅샷", () => {
    const { container } = render(
      <GrantCard match={makeMatch(dateInDays(1))} searchParams="" />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("urgent 스냅샷", () => {
    const { container } = render(
      <GrantCard match={makeMatch(dateInDays(5))} searchParams="" />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("soon 스냅샷", () => {
    const { container } = render(
      <GrantCard match={makeMatch(dateInDays(10))} searchParams="" />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("normal 스냅샷", () => {
    const { container } = render(
      <GrantCard match={makeMatch(dateInDays(30))} searchParams="" />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("closed 스냅샷", () => {
    const { container } = render(
      <GrantCard match={makeMatch(dateInDays(-5))} searchParams="" />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("상시 스냅샷", () => {
    const { container } = render(
      <GrantCard match={makeMatch("상시")} searchParams="" />,
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
