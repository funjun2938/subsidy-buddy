import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import SuccessPage from "@/app/checkout/success/page";

/**
 * /checkout/success 페이지 테스트
 *
 * 토스 결제 완료 후 리다이렉트되는 페이지.
 * - searchParams로 paymentKey/orderId/amount 받음
 * - 백엔드 /api/payments/confirm 호출로 승인 처리
 * - 성공/실패/로딩 3가지 상태 머신
 * - 영수증 형태로 결과 표시
 */

function makeSearchParams(params: {
  paymentKey?: string;
  orderId?: string;
  amount?: string;
}): Promise<typeof params> {
  return Promise.resolve(params);
}

describe("SuccessPage", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("missing params state", () => {
    it("renders '결제 정보가 누락되었습니다' when no params", async () => {
      const ui = await Promise.resolve(
        <SuccessPage searchParams={makeSearchParams({})} />,
      );
      render(ui);
      expect(
        await screen.findByText(/결제 정보가 누락되었습니다/),
      ).toBeInTheDocument();
    });

    it("does not call /api/payments/confirm when paymentKey missing", async () => {
      const ui = await Promise.resolve(
        <SuccessPage
          searchParams={makeSearchParams({
            orderId: "o1",
            amount: "9900",
          })}
        />,
      );
      render(ui);
      await waitFor(() => {
        expect(fetchMock).not.toHaveBeenCalled();
      });
    });

    it("renders failure heading when params missing", async () => {
      const ui = await Promise.resolve(
        <SuccessPage searchParams={makeSearchParams({})} />,
      );
      render(ui);
      expect(await screen.findByText("결제 승인 실패")).toBeInTheDocument();
    });

    it("shows 'returns to /pricing' link on failure", async () => {
      const ui = await Promise.resolve(
        <SuccessPage searchParams={makeSearchParams({})} />,
      );
      render(ui);
      const link = await screen.findByText("요금제로 돌아가기");
      expect(link.closest("a")?.getAttribute("href")).toBe("/pricing");
    });
  });

  describe("loading state", () => {
    it("shows '결제 승인 중...' while pending", async () => {
      fetchMock.mockImplementation(
        () => new Promise(() => {}),
      ); // never resolves
      const ui = await Promise.resolve(
        <SuccessPage
          searchParams={makeSearchParams({
            paymentKey: "pk",
            orderId: "o1",
            amount: "9900",
          })}
        />,
      );
      render(ui);
      expect(screen.getByText(/결제 승인 중/)).toBeInTheDocument();
    });

    it("shows loading spinner element", async () => {
      fetchMock.mockImplementation(() => new Promise(() => {}));
      const ui = await Promise.resolve(
        <SuccessPage
          searchParams={makeSearchParams({
            paymentKey: "pk",
            orderId: "o1",
            amount: "9900",
          })}
        />,
      );
      const { container } = render(ui);
      const spinner = container.querySelector(".animate-spin");
      expect(spinner).not.toBeNull();
    });

    it("displays explanatory 'waiting' message", async () => {
      fetchMock.mockImplementation(() => new Promise(() => {}));
      const ui = await Promise.resolve(
        <SuccessPage
          searchParams={makeSearchParams({
            paymentKey: "pk",
            orderId: "o1",
            amount: "9900",
          })}
        />,
      );
      render(ui);
      expect(
        screen.getByText(/잠시만 기다려주세요/),
      ).toBeInTheDocument();
    });
  });

  describe("successful confirmation", () => {
    beforeEach(() => {
      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            orderName: "프리미엄 멤버십",
            method: "카드",
            approvedAt: "2026-05-30T12:00:00+09:00",
            totalAmount: 9900,
          }),
          { status: 200 },
        ),
      );
    });

    it("renders '결제 완료!' heading", async () => {
      const ui = await Promise.resolve(
        <SuccessPage
          searchParams={makeSearchParams({
            paymentKey: "pk",
            orderId: "o1",
            amount: "9900",
          })}
        />,
      );
      render(ui);
      expect(await screen.findByText("결제 완료!")).toBeInTheDocument();
    });

    it("shows celebration emoji 🎉", async () => {
      const ui = await Promise.resolve(
        <SuccessPage
          searchParams={makeSearchParams({
            paymentKey: "pk",
            orderId: "o1",
            amount: "9900",
          })}
        />,
      );
      render(ui);
      expect(await screen.findByText("🎉")).toBeInTheDocument();
    });

    it("displays the orderName in receipt", async () => {
      const ui = await Promise.resolve(
        <SuccessPage
          searchParams={makeSearchParams({
            paymentKey: "pk",
            orderId: "o1",
            amount: "9900",
          })}
        />,
      );
      render(ui);
      expect(
        await screen.findByText("프리미엄 멤버십"),
      ).toBeInTheDocument();
    });

    it("translates method '카드' to '신용/체크카드'", async () => {
      const ui = await Promise.resolve(
        <SuccessPage
          searchParams={makeSearchParams({
            paymentKey: "pk",
            orderId: "o1",
            amount: "9900",
          })}
        />,
      );
      render(ui);
      expect(await screen.findByText("신용/체크카드")).toBeInTheDocument();
    });

    it("formats the totalAmount with comma", async () => {
      const ui = await Promise.resolve(
        <SuccessPage
          searchParams={makeSearchParams({
            paymentKey: "pk",
            orderId: "o1",
            amount: "9900",
          })}
        />,
      );
      render(ui);
      expect(await screen.findByText("9,900원")).toBeInTheDocument();
    });

    it("calls /api/payments/confirm exactly once", async () => {
      const ui = await Promise.resolve(
        <SuccessPage
          searchParams={makeSearchParams({
            paymentKey: "pk",
            orderId: "o1",
            amount: "9900",
          })}
        />,
      );
      render(ui);
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    });

    it("sends paymentKey/orderId/amount in body", async () => {
      const ui = await Promise.resolve(
        <SuccessPage
          searchParams={makeSearchParams({
            paymentKey: "pk_real",
            orderId: "order_premium_99",
            amount: "9900",
          })}
        />,
      );
      render(ui);
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      const [, init] = fetchMock.mock.calls[0];
      const parsed = JSON.parse(init.body);
      expect(parsed.paymentKey).toBe("pk_real");
      expect(parsed.orderId).toBe("order_premium_99");
      expect(parsed.amount).toBe(9900);
    });

    it("converts amount string to number for API call", async () => {
      const ui = await Promise.resolve(
        <SuccessPage
          searchParams={makeSearchParams({
            paymentKey: "pk",
            orderId: "o1",
            amount: "49000",
          })}
        />,
      );
      render(ui);
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      const [, init] = fetchMock.mock.calls[0];
      const parsed = JSON.parse(init.body);
      expect(typeof parsed.amount).toBe("number");
      expect(parsed.amount).toBe(49000);
    });

    it("sends POST method", async () => {
      const ui = await Promise.resolve(
        <SuccessPage
          searchParams={makeSearchParams({
            paymentKey: "pk",
            orderId: "o1",
            amount: "9900",
          })}
        />,
      );
      render(ui);
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      const [, init] = fetchMock.mock.calls[0];
      expect(init.method).toBe("POST");
    });

    it("sends Content-Type: application/json", async () => {
      const ui = await Promise.resolve(
        <SuccessPage
          searchParams={makeSearchParams({
            paymentKey: "pk",
            orderId: "o1",
            amount: "9900",
          })}
        />,
      );
      render(ui);
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers["Content-Type"]).toBe("application/json");
    });

    it("renders post-success CTAs", async () => {
      const ui = await Promise.resolve(
        <SuccessPage
          searchParams={makeSearchParams({
            paymentKey: "pk",
            orderId: "o1",
            amount: "9900",
          })}
        />,
      );
      render(ui);
      expect(
        await screen.findByText("서비스 시작하기"),
      ).toBeInTheDocument();
      expect(screen.getByText("요금제 다시 보기")).toBeInTheDocument();
    });

    it("'서비스 시작하기' CTA points to /", async () => {
      const ui = await Promise.resolve(
        <SuccessPage
          searchParams={makeSearchParams({
            paymentKey: "pk",
            orderId: "o1",
            amount: "9900",
          })}
        />,
      );
      render(ui);
      const cta = await screen.findByText("서비스 시작하기");
      expect(cta.closest("a")?.getAttribute("href")).toBe("/");
    });

    it("'요금제 다시 보기' CTA points to /pricing", async () => {
      const ui = await Promise.resolve(
        <SuccessPage
          searchParams={makeSearchParams({
            paymentKey: "pk",
            orderId: "o1",
            amount: "9900",
          })}
        />,
      );
      render(ui);
      const cta = await screen.findByText("요금제 다시 보기");
      expect(cta.closest("a")?.getAttribute("href")).toBe("/pricing");
    });
  });

  describe("failed confirmation (4xx/5xx)", () => {
    it("shows error heading when API returns 400", async () => {
      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: false,
            error: "결제 금액이 일치하지 않습니다.",
          }),
          { status: 400 },
        ),
      );
      const ui = await Promise.resolve(
        <SuccessPage
          searchParams={makeSearchParams({
            paymentKey: "pk",
            orderId: "o1",
            amount: "9900",
          })}
        />,
      );
      render(ui);
      expect(await screen.findByText("결제 승인 실패")).toBeInTheDocument();
    });

    it("shows the upstream error message verbatim", async () => {
      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: false,
            error: "결제 금액이 일치하지 않습니다.",
          }),
          { status: 400 },
        ),
      );
      const ui = await Promise.resolve(
        <SuccessPage
          searchParams={makeSearchParams({
            paymentKey: "pk",
            orderId: "o1",
            amount: "9900",
          })}
        />,
      );
      render(ui);
      expect(
        await screen.findByText("결제 금액이 일치하지 않습니다."),
      ).toBeInTheDocument();
    });

    it("falls back to '결제 승인 실패' when error field missing", async () => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ ok: false }), { status: 500 }),
      );
      const ui = await Promise.resolve(
        <SuccessPage
          searchParams={makeSearchParams({
            paymentKey: "pk",
            orderId: "o1",
            amount: "9900",
          })}
        />,
      );
      render(ui);
      expect(await screen.findByText("결제 승인 실패")).toBeInTheDocument();
    });

    it("shows warning emoji ⚠️ on error", async () => {
      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({ ok: false, error: "x" }),
          { status: 400 },
        ),
      );
      const ui = await Promise.resolve(
        <SuccessPage
          searchParams={makeSearchParams({
            paymentKey: "pk",
            orderId: "o1",
            amount: "9900",
          })}
        />,
      );
      render(ui);
      expect(await screen.findByText("⚠️")).toBeInTheDocument();
    });

    it("shows '요금제로 돌아가기' link on error", async () => {
      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({ ok: false, error: "x" }),
          { status: 400 },
        ),
      );
      const ui = await Promise.resolve(
        <SuccessPage
          searchParams={makeSearchParams({
            paymentKey: "pk",
            orderId: "o1",
            amount: "9900",
          })}
        />,
      );
      render(ui);
      const link = await screen.findByText("요금제로 돌아가기");
      expect(link.closest("a")?.getAttribute("href")).toBe("/pricing");
    });
  });

  describe("network failure", () => {
    it("shows '서버와 통신할 수 없습니다' when fetch rejects", async () => {
      fetchMock.mockRejectedValue(new Error("Network down"));
      const ui = await Promise.resolve(
        <SuccessPage
          searchParams={makeSearchParams({
            paymentKey: "pk",
            orderId: "o1",
            amount: "9900",
          })}
        />,
      );
      render(ui);
      expect(
        await screen.findByText("서버와 통신할 수 없습니다."),
      ).toBeInTheDocument();
    });

    it("network failure shows error state", async () => {
      fetchMock.mockRejectedValue(new Error("Network down"));
      const ui = await Promise.resolve(
        <SuccessPage
          searchParams={makeSearchParams({
            paymentKey: "pk",
            orderId: "o1",
            amount: "9900",
          })}
        />,
      );
      render(ui);
      expect(await screen.findByText("결제 승인 실패")).toBeInTheDocument();
    });
  });

  describe("method label translation", () => {
    const cases = [
      { method: "카드", label: "신용/체크카드" },
      { method: "CARD", label: "신용/체크카드" },
      { method: "간편결제", label: "간편결제" },
      { method: "EASY_PAY", label: "간편결제" },
    ];

    it.each(cases)(
      "method '$method' → label '$label'",
      async ({ method, label }) => {
        fetchMock.mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: true,
              orderName: "X",
              method,
              approvedAt: "2026-05-30T00:00:00Z",
              totalAmount: 1000,
            }),
            { status: 200 },
          ),
        );
        const ui = await Promise.resolve(
          <SuccessPage
            searchParams={makeSearchParams({
              paymentKey: "pk",
              orderId: "o1",
              amount: "1000",
            })}
          />,
        );
        render(ui);
        expect(await screen.findByText(label)).toBeInTheDocument();
      },
    );

    it("unknown method passes through as-is", async () => {
      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            orderName: "X",
            method: "VIRTUAL_ACCOUNT",
            approvedAt: "2026-05-30T00:00:00Z",
            totalAmount: 1000,
          }),
          { status: 200 },
        ),
      );
      const ui = await Promise.resolve(
        <SuccessPage
          searchParams={makeSearchParams({
            paymentKey: "pk",
            orderId: "o1",
            amount: "1000",
          })}
        />,
      );
      render(ui);
      expect(await screen.findByText("VIRTUAL_ACCOUNT")).toBeInTheDocument();
    });
  });

  describe("amount formatting", () => {
    const cases = [
      { value: 1000, expected: "1,000원" },
      { value: 9900, expected: "9,900원" },
      { value: 49000, expected: "49,000원" },
      { value: 50000, expected: "50,000원" },
      { value: 1000000, expected: "1,000,000원" },
    ];

    it.each(cases)(
      "amount $value → '$expected'",
      async ({ value, expected }) => {
        fetchMock.mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: true,
              orderName: "X",
              method: "카드",
              approvedAt: "2026-05-30T00:00:00Z",
              totalAmount: value,
            }),
            { status: 200 },
          ),
        );
        const ui = await Promise.resolve(
          <SuccessPage
            searchParams={makeSearchParams({
              paymentKey: "pk",
              orderId: "o1",
              amount: String(value),
            })}
          />,
        );
        render(ui);
        expect(await screen.findByText(expected)).toBeInTheDocument();
      },
    );
  });

  describe("approvedAt formatting", () => {
    it("displays the approval time in Korean locale", async () => {
      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            orderName: "X",
            method: "카드",
            approvedAt: "2026-05-30T12:00:00+09:00",
            totalAmount: 1000,
          }),
          { status: 200 },
        ),
      );
      const ui = await Promise.resolve(
        <SuccessPage
          searchParams={makeSearchParams({
            paymentKey: "pk",
            orderId: "o1",
            amount: "1000",
          })}
        />,
      );
      render(ui);
      // Look for 2026 + month/day somewhere in the doc — locale formatting varies
      expect(
        await screen.findByText(/2026/),
      ).toBeInTheDocument();
    });
  });
});
