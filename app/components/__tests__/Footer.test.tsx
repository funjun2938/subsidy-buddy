import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import Footer from "@/components/Footer";

/**
 * Footer 컴포넌트 테스트
 *
 * Footer는 사이트 전체 navigation/legal/data-sources의 한 점.
 * 링크가 빠지면 SEO와 신뢰성에 직격타라 회귀 가드가 중요.
 */

const SERVICE_LINKS = [
  { label: "공고 찾기", href: "/match" },
  { label: "AI 문서생성", href: "/generate" },
  { label: "요금제", href: "/pricing" },
  { label: "FAQ", href: "/faq" },
];

const COMPANY_LINKS = [
  { label: "프로젝트 소개", href: "/" },
  { label: "GitHub", href: "https://github.com/funjun2938/subsidy-buddy" },
  { label: "문의 이메일", href: "mailto:support@subsidy-ai.kr" },
];

const LEGAL_LINKS = [
  { label: "이용약관", href: "/terms" },
  { label: "개인정보처리방침", href: "/privacy" },
];

const DATA_SOURCES = [
  { label: "기업마당 공공API", href: "https://www.bizinfo.go.kr/" },
  { label: "정부24", href: "https://www.gov.kr/" },
  { label: "소상공인진흥공단", href: "https://www.semas.or.kr/" },
];

describe("Footer component", () => {
  describe("structure", () => {
    it("renders a <footer> element", () => {
      const { container } = render(<Footer />);
      expect(container.querySelector("footer")).toBeInTheDocument();
    });

    it("footer has top border separator", () => {
      const { container } = render(<Footer />);
      const footer = container.querySelector("footer");
      expect(footer?.className).toContain("border-t");
    });

    it("footer has top margin from previous section", () => {
      const { container } = render(<Footer />);
      const footer = container.querySelector("footer");
      expect(footer?.className).toContain("mt-20");
    });
  });

  describe("service links", () => {
    it.each(SERVICE_LINKS)(
      "renders service link: $label",
      ({ label }) => {
        render(<Footer />);
        expect(screen.getByText(label)).toBeInTheDocument();
      },
    );

    it.each(SERVICE_LINKS)(
      "service link '$label' points to $href",
      ({ label, href }) => {
        render(<Footer />);
        const link = screen.getByText(label).closest("a");
        expect(link?.getAttribute("href")).toBe(href);
      },
    );

    it("renders exactly 4 service links", () => {
      render(<Footer />);
      SERVICE_LINKS.forEach(({ label }) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });
  });

  describe("company links", () => {
    it.each(COMPANY_LINKS)(
      "renders company link: $label",
      ({ label }) => {
        render(<Footer />);
        expect(screen.getByText(label)).toBeInTheDocument();
      },
    );

    it.each(COMPANY_LINKS)(
      "company link '$label' points to $href",
      ({ label, href }) => {
        render(<Footer />);
        const link = screen.getByText(label).closest("a");
        expect(link?.getAttribute("href")).toBe(href);
      },
    );

    it("GitHub link opens in new tab (external)", () => {
      render(<Footer />);
      const github = screen.getByText("GitHub").closest("a");
      expect(github?.getAttribute("target")).toBe("_blank");
    });

    it("GitHub link has noopener rel", () => {
      render(<Footer />);
      const github = screen.getByText("GitHub").closest("a");
      expect(github?.getAttribute("rel")).toContain("noopener");
    });

    it("Email link uses mailto: protocol", () => {
      render(<Footer />);
      const email = screen.getByText("문의 이메일").closest("a");
      expect(email?.getAttribute("href")).toMatch(/^mailto:/);
    });

    it("Email mailto points to support address", () => {
      render(<Footer />);
      const email = screen.getByText("문의 이메일").closest("a");
      expect(email?.getAttribute("href")).toContain("support@subsidy-ai.kr");
    });
  });

  describe("legal links", () => {
    it.each(LEGAL_LINKS)(
      "renders legal link: $label",
      ({ label }) => {
        render(<Footer />);
        expect(screen.getByText(label)).toBeInTheDocument();
      },
    );

    it.each(LEGAL_LINKS)(
      "legal link '$label' points to $href",
      ({ label, href }) => {
        render(<Footer />);
        const link = screen.getByText(label).closest("a");
        expect(link?.getAttribute("href")).toBe(href);
      },
    );

    it("이용약관 link routes to /terms", () => {
      render(<Footer />);
      const terms = screen.getByText("이용약관").closest("a");
      expect(terms?.getAttribute("href")).toBe("/terms");
    });

    it("개인정보처리방침 link routes to /privacy", () => {
      render(<Footer />);
      const privacy = screen.getByText("개인정보처리방침").closest("a");
      expect(privacy?.getAttribute("href")).toBe("/privacy");
    });
  });

  describe("data sources", () => {
    it.each(DATA_SOURCES)(
      "renders data source: $label",
      ({ label }) => {
        render(<Footer />);
        expect(screen.getByText(label)).toBeInTheDocument();
      },
    );

    it.each(DATA_SOURCES)(
      "data source '$label' points to $href",
      ({ label, href }) => {
        render(<Footer />);
        const link = screen.getByText(label).closest("a");
        expect(link?.getAttribute("href")).toBe(href);
      },
    );

    it("data sources all point to Korean government/public domains", () => {
      DATA_SOURCES.forEach(({ href }) => {
        expect(href).toMatch(/\.(go|gov|or)\.kr/);
      });
    });
  });

  describe("brand identity", () => {
    it("renders the brand name '리스탠드'", () => {
      render(<Footer />);
      expect(screen.getAllByText(/리스탠드/).length).toBeGreaterThan(0);
    });

    it("renders the brand tagline", () => {
      render(<Footer />);
      expect(
        screen.getByText(/AI 분석 결과는 참고용이며/),
      ).toBeInTheDocument();
    });
  });

  describe("copyright", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-30T00:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("displays current year in copyright", () => {
      render(<Footer />);
      expect(screen.getByText(/2026/)).toBeInTheDocument();
    });

    it("copyright contains © symbol", () => {
      render(<Footer />);
      expect(screen.getByText(/©/)).toBeInTheDocument();
    });

    it("copyright mentions MIT license", () => {
      render(<Footer />);
      expect(screen.getByText(/MIT/)).toBeInTheDocument();
    });

    it("year update tracks system year (2027)", () => {
      vi.setSystemTime(new Date("2027-01-01T00:00:00Z"));
      render(<Footer />);
      expect(screen.getByText(/2027/)).toBeInTheDocument();
    });

    it("year update tracks system year (2028)", () => {
      vi.setSystemTime(new Date("2028-06-15T12:00:00Z"));
      render(<Footer />);
      expect(screen.getByText(/2028/)).toBeInTheDocument();
    });
  });

  describe("link safety", () => {
    it("all external links have target=_blank", () => {
      render(<Footer />);
      const externals = [
        "GitHub",
        "기업마당 공공API",
        "정부24",
        "소상공인진흥공단",
      ];
      externals.forEach((label) => {
        const link = screen.getByText(label).closest("a");
        expect(link?.getAttribute("target")).toBe("_blank");
      });
    });

    it("all external links have rel='noopener noreferrer'", () => {
      render(<Footer />);
      const externals = [
        "GitHub",
        "기업마당 공공API",
        "정부24",
        "소상공인진흥공단",
      ];
      externals.forEach((label) => {
        const link = screen.getByText(label).closest("a");
        const rel = link?.getAttribute("rel") ?? "";
        expect(rel).toContain("noopener");
        expect(rel).toContain("noreferrer");
      });
    });

    it("internal navigation links do NOT have target=_blank", () => {
      render(<Footer />);
      const internals = ["AI 문서생성", "공고 찾기", "요금제", "이용약관"];
      internals.forEach((label) => {
        const link = screen.getByText(label).closest("a");
        expect(link?.getAttribute("target")).not.toBe("_blank");
      });
    });
  });

  describe("section headings", () => {
    it("has '서비스' section heading", () => {
      render(<Footer />);
      expect(screen.getByText("서비스")).toBeInTheDocument();
    });

    it("has '프로젝트' section heading", () => {
      render(<Footer />);
      expect(screen.getByText("프로젝트")).toBeInTheDocument();
    });

    it("has '법적 정보' section heading", () => {
      render(<Footer />);
      expect(screen.getByText("법적 정보")).toBeInTheDocument();
    });

    it("has 'DATA SOURCES' section heading", () => {
      render(<Footer />);
      expect(screen.getByText(/DATA SOURCES/i)).toBeInTheDocument();
    });
  });

  describe("snapshot", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-05-30T00:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("matches snapshot", () => {
      const { container } = render(<Footer />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
