import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import GrantCard from "@/components/GrantCard";
import type { MatchResult } from "@/lib/types";

// Stable "now" so D-day arithmetic is deterministic.
const NOW = new Date("2026-05-27T00:00:00Z").getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  vi.useRealTimers();
});

function makeMatch(deadline: string): MatchResult {
  return {
    grant: {
      id: "g1",
      title: "테스트 지원사업",
      orgName: "테스트청",
      category: "운영자금",
      deadline,
      amount: "최대 1,000만원",
      description: "",
      requirements: [],
      sourceUrl: "https://example.com",
    },
    matchScore: "high",
    reason: "조건이 잘 맞아요",
    matchReasons: [],
  } as unknown as MatchResult;
}

describe("GrantCard urgency badge", () => {
  it("shows '⚡ 지금 바로 신청!' for D-3 or sooner (critical)", () => {
    const inTwoDays = new Date(NOW + 2 * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);
    render(<GrantCard match={makeMatch(inTwoDays)} searchParams="" />);
    expect(screen.getByText(/지금 바로 신청/)).toBeInTheDocument();
  });

  it("shows '⏰ 마감 임박' for D-4..D-7 (urgent)", () => {
    const inFiveDays = new Date(NOW + 5 * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);
    render(<GrantCard match={makeMatch(inFiveDays)} searchParams="" />);
    expect(screen.getByText(/마감 임박/)).toBeInTheDocument();
  });

  it("does NOT show urgency badge for D-14+ (normal)", () => {
    const inTwentyDays = new Date(NOW + 20 * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);
    render(<GrantCard match={makeMatch(inTwentyDays)} searchParams="" />);
    expect(screen.queryByText(/지금 바로 신청/)).not.toBeInTheDocument();
    expect(screen.queryByText(/마감 임박/)).not.toBeInTheDocument();
  });

  it("does NOT show urgency badge for 상시", () => {
    render(<GrantCard match={makeMatch("상시")} searchParams="" />);
    expect(screen.queryByText(/지금 바로 신청/)).not.toBeInTheDocument();
    expect(screen.queryByText(/마감 임박/)).not.toBeInTheDocument();
  });

  it("renders the D-day label for upcoming deadlines", () => {
    const inFiveDays = new Date(NOW + 5 * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);
    render(<GrantCard match={makeMatch(inFiveDays)} searchParams="" />);
    expect(screen.getByText(/D-\d+/)).toBeInTheDocument();
  });

  it("renders '마감' for past deadlines", () => {
    const yesterday = new Date(NOW - 24 * 3600 * 1000).toISOString().slice(0, 10);
    render(<GrantCard match={makeMatch(yesterday)} searchParams="" />);
    expect(screen.getByText("마감")).toBeInTheDocument();
  });

  it("renders grant title and org name", () => {
    render(<GrantCard match={makeMatch("상시")} searchParams="" />);
    expect(screen.getByText("테스트 지원사업")).toBeInTheDocument();
    expect(screen.getByText("테스트청")).toBeInTheDocument();
  });
});
