import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";

/**
 * /checkout 페이지 테스트
 *
 * 토스 SDK를 모킹하여 위젯 렌더링 단계까지 검증.
 * 실제 결제창 호출은 외부 도메인이라 E2E에서 처리.
 */

// ── 토스 SDK 모킹 ────────────────────────────────────────────────────────────
const mockWidgets = {
  setAmount: vi.fn().mockResolvedValue(undefined),
  renderPaymentMethods: vi.fn().mockResolvedValue({}),
  renderAgreement: vi.fn().mockResolvedValue({}),
  requestPayment: vi.fn().mockResolvedValue({}),
};

const mockTossPayments = {
  widgets: vi.fn().mockReturnValue(mockWidgets),
};

vi.mock("@tosspayments/tosspayments-sdk", () => ({
  loadTossPayments: vi.fn(() => Promise.resolve(mockTossPayments)),
  ANONYMOUS: "ANONYMOUS",
}));

// ── 테스트 ──────────────────────────────────────────────────────────────────
import { Suspense } from "react";
import CheckoutPage from "@/app/checkout/page";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";

function makeSearchParams(plan?: string): Promise<{ plan?: string }> {
  return Promise.resolve(plan === undefined ? {} : { plan });
}

async function renderCheckout(plan?: string) {
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <Suspense fallback={null}>
        <CheckoutPage searchParams={makeSearchParams(plan)} />
      </Suspense>,
    );
  });
  return result;
}

describe("CheckoutPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering — valid plan", () => {
    it("renders premium plan summary", async () => {
      await renderCheckout("premium");
      expect(
        await screen.findByText("프리미엄 멤버십"),
      ).toBeInTheDocument();
    });

    it("renders business plan summary", async () => {
      await renderCheckout("business");
      expect(
        await screen.findByText("비즈니스 멤버십"),
      ).toBeInTheDocument();
    });

    it("renders '결제하기' heading", async () => {
      await renderCheckout("premium");
      expect(await screen.findByText("결제하기")).toBeInTheDocument();
    });

    it("renders '월간 구독' label for premium", async () => {
      await renderCheckout("premium");
      expect(await screen.findByText("월간 구독")).toBeInTheDocument();
    });

    it("renders '월간 구독' label for business", async () => {
      await renderCheckout("business");
      expect(await screen.findByText("월간 구독")).toBeInTheDocument();
    });

    it("renders price 9,900원 for premium", async () => {
      await renderCheckout("premium");
      const prices = await screen.findAllByText(/9,900원/);
      expect(prices.length).toBeGreaterThanOrEqual(1);
    });

    it("renders price 49,000원 for business", async () => {
      await renderCheckout("business");
      const prices = await screen.findAllByText(/49,000원/);
      expect(prices.length).toBeGreaterThanOrEqual(1);
    });

    it("renders 'back to /pricing' link", async () => {
      await renderCheckout("premium");
      const back = await screen.findByText("← 요금제로 돌아가기");
      expect(back.closest("a")?.getAttribute("href")).toBe("/pricing");
    });

    it("renders '최종 결제 금액' label", async () => {
      await renderCheckout("premium");
      expect(
        await screen.findByText("최종 결제 금액"),
      ).toBeInTheDocument();
    });

    it("renders test-mode disclaimer", async () => {
      await renderCheckout("premium");
      expect(
        await screen.findByText(/테스트 결제 환경입니다/),
      ).toBeInTheDocument();
    });

    it("renders payment method hint", async () => {
      await renderCheckout("premium");
      expect(
        await screen.findByText(/카드 \/ 카카오페이 \/ 네이버페이/),
      ).toBeInTheDocument();
    });
  });

  describe("rendering — invalid plan", () => {
    it("renders '잘못된 플랜입니다' for unknown plan", async () => {
      await renderCheckout("foo");
      expect(
        await screen.findByText("잘못된 플랜입니다"),
      ).toBeInTheDocument();
    });

    it("renders '잘못된 플랜입니다' when plan is missing", async () => {
      await renderCheckout();
      expect(
        await screen.findByText("잘못된 플랜입니다"),
      ).toBeInTheDocument();
    });

    it("renders link back to /pricing on error", async () => {
      await renderCheckout("foo");
      const link = await screen.findByText("요금제로 돌아가기");
      expect(link.closest("a")?.getAttribute("href")).toBe("/pricing");
    });

    it("does NOT call loadTossPayments for invalid plan", async () => {
      await renderCheckout("foo");
      await waitFor(() => {
        expect(loadTossPayments).not.toHaveBeenCalled();
      });
    });
  });

  describe("plan feature display", () => {
    it("premium: shows all 5 features", async () => {
      await renderCheckout("premium");
      const features = [
        "AI 지원사업 매칭 무제한",
        "전체 매칭 결과 보기",
        "AI 신청서 생성 월 3건",
        "마감 알림 (D-7, D-3, D-1)",
        "신규 공고 실시간 알림",
      ];
      for (const f of features) {
        expect(await screen.findByText(f)).toBeInTheDocument();
      }
    });

    it("business: shows all 4 features", async () => {
      await renderCheckout("business");
      const features = [
        "프리미엄 전체 기능 포함",
        "AI 신청서 생성 무제한",
        "신청 대행 수수료 50% 할인",
        "합격률 분석 리포트",
      ];
      for (const f of features) {
        expect(await screen.findByText(f)).toBeInTheDocument();
      }
    });
  });

  describe("toss SDK integration", () => {
    it("calls loadTossPayments once with the client key", async () => {
      await renderCheckout("premium");
      await waitFor(() => {
        expect(loadTossPayments).toHaveBeenCalled();
      });
    });

    it("loadTossPayments receives a 'test_gck_' client key (widget mode)", async () => {
      await renderCheckout("premium");
      await waitFor(() => {
        expect(loadTossPayments).toHaveBeenCalled();
      });
      const [clientKey] = (loadTossPayments as any).mock.calls[0];
      expect(String(clientKey)).toMatch(/^test_gck_/);
    });

    it("calls widgets() with customerKey: ANONYMOUS", async () => {
      await renderCheckout("premium");
      await waitFor(() => {
        expect(mockTossPayments.widgets).toHaveBeenCalled();
      });
      const args = mockTossPayments.widgets.mock.calls[0][0];
      expect(args.customerKey).toBe("ANONYMOUS");
    });

    it("calls setAmount with KRW currency", async () => {
      await renderCheckout("premium");
      await waitFor(() => {
        expect(mockWidgets.setAmount).toHaveBeenCalled();
      });
      const args = mockWidgets.setAmount.mock.calls[0][0];
      expect(args.currency).toBe("KRW");
    });

    it("setAmount value matches plan price (premium → 9900)", async () => {
      await renderCheckout("premium");
      await waitFor(() => {
        expect(mockWidgets.setAmount).toHaveBeenCalled();
      });
      const args = mockWidgets.setAmount.mock.calls[0][0];
      expect(args.value).toBe(9900);
    });

    it("setAmount value matches plan price (business → 49000)", async () => {
      await renderCheckout("business");
      await waitFor(() => {
        expect(mockWidgets.setAmount).toHaveBeenCalled();
      });
      const args = mockWidgets.setAmount.mock.calls[0][0];
      expect(args.value).toBe(49000);
    });

    it("calls renderPaymentMethods with #payment-method selector", async () => {
      await renderCheckout("premium");
      await waitFor(() => {
        expect(mockWidgets.renderPaymentMethods).toHaveBeenCalled();
      });
      const args = mockWidgets.renderPaymentMethods.mock.calls[0][0];
      expect(args.selector).toBe("#payment-method");
    });

    it("uses variantKey 'DEFAULT' for payment methods", async () => {
      await renderCheckout("premium");
      await waitFor(() => {
        expect(mockWidgets.renderPaymentMethods).toHaveBeenCalled();
      });
      const args = mockWidgets.renderPaymentMethods.mock.calls[0][0];
      expect(args.variantKey).toBe("DEFAULT");
    });

    it("calls renderAgreement with #agreement selector", async () => {
      await renderCheckout("premium");
      await waitFor(() => {
        expect(mockWidgets.renderAgreement).toHaveBeenCalled();
      });
      const args = mockWidgets.renderAgreement.mock.calls[0][0];
      expect(args.selector).toBe("#agreement");
    });

    it("uses variantKey 'AGREEMENT' for agreement widget", async () => {
      await renderCheckout("premium");
      await waitFor(() => {
        expect(mockWidgets.renderAgreement).toHaveBeenCalled();
      });
      const args = mockWidgets.renderAgreement.mock.calls[0][0];
      expect(args.variantKey).toBe("AGREEMENT");
    });
  });

  describe("widget container DOM", () => {
    it("renders #payment-method container", async () => {
      const { container } = await renderCheckout("premium");
      expect(container.querySelector("#payment-method")).not.toBeNull();
    });

    it("renders #agreement container", async () => {
      const { container } = await renderCheckout("premium");
      expect(container.querySelector("#agreement")).not.toBeNull();
    });

    it("widgets are wrapped in 'toss-widget-frame' for dark theme", async () => {
      const { container } = await renderCheckout("premium");
      const frames = container.querySelectorAll(".toss-widget-frame");
      expect(frames.length).toBe(2);
    });

    it("renders the '결제 수단' label", async () => {
      await renderCheckout("premium");
      expect(await screen.findByText("결제 수단")).toBeInTheDocument();
    });

    it("renders the '약관 동의' label", async () => {
      await renderCheckout("premium");
      expect(await screen.findByText("약관 동의")).toBeInTheDocument();
    });
  });

  describe("error handling", () => {
    it("shows error if loadTossPayments rejects", async () => {
      (loadTossPayments as any).mockRejectedValueOnce(
        new Error("load failed"),
      );
      await renderCheckout("premium");
      expect(
        await screen.findByText(/load failed|결제 위젯 로드 실패/),
      ).toBeInTheDocument();
    });

    it("shows error if widgets() throws", async () => {
      mockTossPayments.widgets.mockImplementationOnce(() => {
        throw new Error("widgets failed");
      });
      await renderCheckout("premium");
      expect(
        await screen.findByText(/widgets failed|결제 위젯 로드 실패/),
      ).toBeInTheDocument();
    });
  });
});
