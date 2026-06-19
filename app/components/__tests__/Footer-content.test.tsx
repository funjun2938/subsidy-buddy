import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import Footer from "@/components/Footer";

/**
 * Footer 콘텐츠 회귀 테스트 (브랜드/법적/데이터소스 분리).
 */

describe("Footer — 서비스 섹션", () => {
  it("'서비스' 헤딩", () => {
    render(<Footer />);
    expect(screen.getByText("서비스")).toBeInTheDocument();
  });

  it("AI 문서생성 → /generate", () => {
    render(<Footer />);
    const link = screen.getByText("AI 문서생성").closest("a");
    expect(link?.getAttribute("href")).toBe("/generate");
  });

  it("전문가 매칭 → /experts", () => {
    render(<Footer />);
    const link = screen.getByText("전문가 매칭").closest("a");
    expect(link?.getAttribute("href")).toBe("/experts");
  });

  it("요금제 → /pricing", () => {
    render(<Footer />);
    const link = screen.getByText("요금제").closest("a");
    expect(link?.getAttribute("href")).toBe("/pricing");
  });
});

describe("Footer — 프로젝트 섹션", () => {
  it("'프로젝트' 헤딩", () => {
    render(<Footer />);
    expect(screen.getByText("프로젝트")).toBeInTheDocument();
  });

  it("프로젝트 소개 → /", () => {
    render(<Footer />);
    const link = screen.getByText("프로젝트 소개").closest("a");
    expect(link?.getAttribute("href")).toBe("/");
  });

  it("GitHub → https://github.com/funjun2938/subsidy-buddy", () => {
    render(<Footer />);
    const link = screen.getByText("GitHub").closest("a");
    expect(link?.getAttribute("href")).toBe(
      "https://github.com/funjun2938/subsidy-buddy",
    );
  });

  it("GitHub target=_blank", () => {
    render(<Footer />);
    const link = screen.getByText("GitHub").closest("a");
    expect(link?.getAttribute("target")).toBe("_blank");
  });

  it("GitHub rel includes noopener noreferrer", () => {
    render(<Footer />);
    const link = screen.getByText("GitHub").closest("a");
    const rel = link?.getAttribute("rel") ?? "";
    expect(rel).toContain("noopener");
    expect(rel).toContain("noreferrer");
  });

  it("문의 이메일 → mailto:support@subsidy-ai.kr", () => {
    render(<Footer />);
    const link = screen.getByText("문의 이메일").closest("a");
    expect(link?.getAttribute("href")).toBe("mailto:support@subsidy-ai.kr");
  });

  it("문의 이메일 target=_blank", () => {
    render(<Footer />);
    const link = screen.getByText("문의 이메일").closest("a");
    expect(link?.getAttribute("target")).toBe("_blank");
  });
});

describe("Footer — 법적 정보 섹션", () => {
  it("'법적 정보' 헤딩", () => {
    render(<Footer />);
    expect(screen.getByText("법적 정보")).toBeInTheDocument();
  });

  it("이용약관 → /terms", () => {
    render(<Footer />);
    const link = screen.getByText("이용약관").closest("a");
    expect(link?.getAttribute("href")).toBe("/terms");
  });

  it("개인정보처리방침 → /privacy", () => {
    render(<Footer />);
    const link = screen.getByText("개인정보처리방침").closest("a");
    expect(link?.getAttribute("href")).toBe("/privacy");
  });

  it("이용약관 is internal (no target=_blank)", () => {
    render(<Footer />);
    const link = screen.getByText("이용약관").closest("a");
    expect(link?.getAttribute("target")).not.toBe("_blank");
  });

  it("개인정보처리방침 is internal (no target=_blank)", () => {
    render(<Footer />);
    const link = screen.getByText("개인정보처리방침").closest("a");
    expect(link?.getAttribute("target")).not.toBe("_blank");
  });
});

describe("Footer — Data Sources 섹션", () => {
  it("'DATA SOURCES' 헤딩", () => {
    render(<Footer />);
    expect(screen.getByText(/DATA SOURCES/)).toBeInTheDocument();
  });

  it("기업마당 공공API → https://www.bizinfo.go.kr/", () => {
    render(<Footer />);
    const link = screen.getByText("기업마당 공공API").closest("a");
    expect(link?.getAttribute("href")).toBe("https://www.bizinfo.go.kr/");
  });

  it("정부24 → https://www.gov.kr/", () => {
    render(<Footer />);
    const link = screen.getByText("정부24").closest("a");
    expect(link?.getAttribute("href")).toBe("https://www.gov.kr/");
  });

  it("소상공인진흥공단 → https://www.semas.or.kr/", () => {
    render(<Footer />);
    const link = screen.getByText("소상공인진흥공단").closest("a");
    expect(link?.getAttribute("href")).toBe("https://www.semas.or.kr/");
  });

  it.each([
    ["기업마당 공공API"],
    ["정부24"],
    ["소상공인진흥공단"],
  ])("'%s' opens in new tab", (label) => {
    render(<Footer />);
    const link = screen.getByText(label).closest("a");
    expect(link?.getAttribute("target")).toBe("_blank");
  });

  it.each([
    ["기업마당 공공API"],
    ["정부24"],
    ["소상공인진흥공단"],
  ])("'%s' uses noopener rel", (label) => {
    render(<Footer />);
    const link = screen.getByText(label).closest("a");
    expect(link?.getAttribute("rel")).toContain("noopener");
  });
});

describe("Footer — 브랜드", () => {
  it("브랜드 이름 '리스탠드'", () => {
    render(<Footer />);
    expect(screen.getAllByText(/리스탠드/).length).toBeGreaterThan(0);
  });

  it("브랜드 카피 'AI 분석 결과는 참고용이며'", () => {
    render(<Footer />);
    expect(
      screen.getByText(/AI 분석 결과는 참고용이며/),
    ).toBeInTheDocument();
  });
});

describe("Footer — 저작권 (년도)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("2026년 표기", () => {
    vi.setSystemTime(new Date("2026-05-30T00:00:00Z"));
    render(<Footer />);
    expect(screen.getByText(/© 2026/)).toBeInTheDocument();
  });

  it("2027년 표기 (미래)", () => {
    vi.setSystemTime(new Date("2027-12-31T23:59:59Z"));
    render(<Footer />);
    expect(screen.getByText(/© 2027/)).toBeInTheDocument();
  });

  it("2025년 표기 (과거)", () => {
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));
    render(<Footer />);
    expect(screen.getByText(/© 2025/)).toBeInTheDocument();
  });

  it("저작권 안내 'All rights reserved.'", () => {
    vi.setSystemTime(new Date("2026-05-30T00:00:00Z"));
    render(<Footer />);
    expect(screen.getByText(/All rights reserved/i)).toBeInTheDocument();
  });
});
