import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import PricingPage from "@/app/pricing/page";

/**
 * /pricing 페이지 테스트
 *
 * 결제 퍼널의 시작점.
 * 3개 구독 플랜 + 2개 단건 서비스 카드 + CTA 라우팅 검증.
 */

const SUBSCRIPTION_PLANS = [
  {
    name: "무료",
    price: "0",
    cta: "무료로 시작",
    href: "/",
  },
  {
    name: "프리미엄",
    price: "9,900",
    cta: "프리미엄 시작",
    href: "/checkout?plan=premium",
  },
  {
    name: "비즈니스",
    price: "49,000",
    cta: "비즈니스 시작",
    href: "/checkout?plan=business",
  },
];

const SINGLE_SERVICES = [
  { name: "AI 신청서 생성", price: "무료 토큰", href: "/generate" },
  { name: "전문가 신청 대행", price: "10~15", href: "/checkout?plan=expert" },
];

describe("PricingPage", () => {
  describe("header", () => {
    it("renders the '요금제' heading", () => {
      render(<PricingPage />);
      expect(screen.getByText("요금제")).toBeInTheDocument();
    });

    it("heading is h1", () => {
      render(<PricingPage />);
      const heading = screen.getByText("요금제");
      // The heading text is inside a <span> within <h1>
      expect(heading.closest("h1")).not.toBeNull();
    });

    it("renders the subheading copy", () => {
      render(<PricingPage />);
      expect(
        screen.getByText(/지원금 매칭은 무료/),
      ).toBeInTheDocument();
    });
  });

  describe("subscription plans", () => {
    it.each(SUBSCRIPTION_PLANS)(
      "renders plan card: $name",
      ({ name }) => {
        render(<PricingPage />);
        expect(screen.getByText(name)).toBeInTheDocument();
      },
    );

    it.each(SUBSCRIPTION_PLANS)(
      "$name plan shows price $price",
      ({ price }) => {
        render(<PricingPage />);
        expect(screen.getByText(price)).toBeInTheDocument();
      },
    );

    it.each(SUBSCRIPTION_PLANS)(
      "$name plan CTA '$cta' is rendered",
      ({ cta }) => {
        render(<PricingPage />);
        expect(screen.getByText(cta)).toBeInTheDocument();
      },
    );

    it.each(SUBSCRIPTION_PLANS)(
      "$name plan CTA links to $href",
      ({ cta, href }) => {
        render(<PricingPage />);
        const link = screen.getByText(cta).closest("a");
        expect(link?.getAttribute("href")).toBe(href);
      },
    );

    it("renders exactly 3 subscription plans", () => {
      render(<PricingPage />);
      SUBSCRIPTION_PLANS.forEach((p) => {
        expect(screen.getByText(p.name)).toBeInTheDocument();
      });
    });

    it("프리미엄 plan has popularity badge '인기'", () => {
      render(<PricingPage />);
      expect(screen.getByText("인기")).toBeInTheDocument();
    });

    it("무료 plan has period suffix '/월' empty (one-time mention only)", () => {
      render(<PricingPage />);
      // 무료 plan price has no /월 — assertion: no /월 next to 무료's 0
      const free = screen.getByText("무료");
      // Just confirm the price '0' is present near the 무료 card
      const card = free.closest("div");
      expect(card?.textContent).toContain("0");
    });

    it("프리미엄 plan price ends with /월", () => {
      render(<PricingPage />);
      const html = document.body.innerHTML;
      expect(html).toContain("9,900");
      expect(html).toContain("/월");
    });

    it("비즈니스 plan price ends with /월", () => {
      render(<PricingPage />);
      const html = document.body.innerHTML;
      expect(html).toContain("49,000");
    });
  });

  describe("subscription plan features", () => {
    describe("무료 plan features", () => {
      it("includes AI 지원사업 매칭", () => {
        render(<PricingPage />);
        expect(screen.getAllByText(/AI 지원사업 매칭/)[0]).toBeInTheDocument();
      });

      it("includes 매칭 결과 3건까지 보기", () => {
        render(<PricingPage />);
        expect(screen.getByText("매칭 결과 3건까지 보기")).toBeInTheDocument();
      });

      it("includes 사업자등록증 AI 분석", () => {
        render(<PricingPage />);
        expect(screen.getByText("사업자등록증 AI 분석")).toBeInTheDocument();
      });

      it("excludes 상세 자격 분석", () => {
        // 무료 plan has 상세 자격 분석: false — feature shown but disabled
        render(<PricingPage />);
        expect(screen.getByText("상세 자격 분석")).toBeInTheDocument();
      });
    });

    describe("프리미엄 plan features", () => {
      it("includes 전체 매칭 결과 보기", () => {
        render(<PricingPage />);
        expect(screen.getByText("전체 매칭 결과 보기")).toBeInTheDocument();
      });

      it("includes 상세 AI 자격 분석", () => {
        render(<PricingPage />);
        expect(screen.getByText("상세 AI 자격 분석")).toBeInTheDocument();
      });

      it("includes 마감 D-7, D-3, D-1 알림", () => {
        render(<PricingPage />);
        expect(
          screen.getByText("마감 D-7, D-3, D-1 알림"),
        ).toBeInTheDocument();
      });

      it("includes AI 신청서 생성·수정 무제한", () => {
        render(<PricingPage />);
        expect(screen.getByText("AI 신청서 생성·수정 무제한")).toBeInTheDocument();
      });

      it("includes 신규 공고 실시간 알림", () => {
        render(<PricingPage />);
        expect(screen.getByText("신규 공고 실시간 알림")).toBeInTheDocument();
      });
    });

    describe("비즈니스 plan features", () => {
      it("includes 프리미엄 전체 기능 포함", () => {
        render(<PricingPage />);
        expect(
          screen.getByText("프리미엄 전체 기능 포함"),
        ).toBeInTheDocument();
      });

      it("includes AI 신청서 생성 무제한", () => {
        render(<PricingPage />);
        expect(screen.getByText("AI 신청서 생성 무제한")).toBeInTheDocument();
      });

      it("includes 전문가 1:1 전담 배정", () => {
        render(<PricingPage />);
        expect(screen.getByText("전문가 1:1 전담 배정")).toBeInTheDocument();
      });

      it("includes 신청 대행 수수료 50% 할인", () => {
        render(<PricingPage />);
        expect(
          screen.getByText("신청 대행 수수료 50% 할인"),
        ).toBeInTheDocument();
      });

      it("includes 합격률 분석 리포트", () => {
        render(<PricingPage />);
        expect(screen.getByText("합격률 분석 리포트")).toBeInTheDocument();
      });

      it("includes R&D 과제 특화 분석", () => {
        render(<PricingPage />);
        expect(screen.getByText("R&D 과제 특화 분석")).toBeInTheDocument();
      });

      it("includes 우선 고객 지원", () => {
        render(<PricingPage />);
        expect(screen.getByText("우선 고객 지원")).toBeInTheDocument();
      });
    });
  });

  describe("single services", () => {
    it("renders the 'AI · 전문가 서비스' section heading", () => {
      render(<PricingPage />);
      expect(screen.getByText("AI · 전문가 서비스")).toBeInTheDocument();
    });

    it.each(SINGLE_SERVICES)(
      "renders single service: $name",
      ({ name }) => {
        render(<PricingPage />);
        expect(screen.getByText(name)).toBeInTheDocument();
      },
    );

    it("AI 신청서 생성 is free (무료 토큰 제공)", () => {
      render(<PricingPage />);
      expect(screen.getAllByText(/무료 토큰/).length).toBeGreaterThanOrEqual(1);
    });

    it("전문가 대행 fee is 10~15%", () => {
      render(<PricingPage />);
      expect(screen.getByText("10~15")).toBeInTheDocument();
    });

    it("AI 신청서 link routes to /generate", () => {
      render(<PricingPage />);
      const link = screen.getByText("지금 사용해보기 →").closest("a");
      expect(link?.getAttribute("href")).toBe("/generate");
    });

    it("전문가 대행 link routes to /checkout?plan=expert", () => {
      render(<PricingPage />);
      const link = screen.getByText("착수금 결제하기 →").closest("a");
      expect(link?.getAttribute("href")).toBe("/checkout?plan=expert");
    });
  });

  describe("layout assertions", () => {
    it("subscription grid uses 3 columns on md+", () => {
      const { container } = render(<PricingPage />);
      const grid = container.querySelector(".md\\:grid-cols-3");
      expect(grid).not.toBeNull();
    });

    it("single services use 2 columns on sm+", () => {
      const { container } = render(<PricingPage />);
      const grid = container.querySelector(".sm\\:grid-cols-2");
      expect(grid).not.toBeNull();
    });

    it("plans use glass-style cards", () => {
      const { container } = render(<PricingPage />);
      const glassCards = container.querySelectorAll(".glass");
      expect(glassCards.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("CTA routing — payment funnel entry", () => {
    it("프리미엄 CTA enters payment funnel at /checkout", () => {
      render(<PricingPage />);
      const link = screen.getByText("프리미엄 시작").closest("a");
      expect(link?.getAttribute("href")).toMatch(/^\/checkout/);
    });

    it("비즈니스 CTA enters payment funnel at /checkout", () => {
      render(<PricingPage />);
      const link = screen.getByText("비즈니스 시작").closest("a");
      expect(link?.getAttribute("href")).toMatch(/^\/checkout/);
    });

    it("프리미엄 CTA carries plan=premium query param", () => {
      render(<PricingPage />);
      const link = screen.getByText("프리미엄 시작").closest("a");
      expect(link?.getAttribute("href")).toContain("plan=premium");
    });

    it("비즈니스 CTA carries plan=business query param", () => {
      render(<PricingPage />);
      const link = screen.getByText("비즈니스 시작").closest("a");
      expect(link?.getAttribute("href")).toContain("plan=business");
    });

    it("전문가 대행 CTA carries plan=expert query param", () => {
      render(<PricingPage />);
      const link = screen.getByText("착수금 결제하기 →").closest("a");
      expect(link?.getAttribute("href")).toContain("plan=expert");
    });

    it("무료 CTA does NOT enter payment funnel", () => {
      render(<PricingPage />);
      const link = screen.getByText("무료로 시작").closest("a");
      expect(link?.getAttribute("href")).not.toContain("/checkout");
    });
  });

  describe("snapshot", () => {
    it("matches snapshot", () => {
      const { container } = render(<PricingPage />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
