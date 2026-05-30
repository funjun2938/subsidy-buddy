import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FailPage from "@/app/checkout/fail/page";

/**
 * /checkout/fail 페이지 테스트
 *
 * 결제 실패 시 사용자에게 명확한 에러 안내와 재시도/홈 복귀 경로 제공.
 * searchParams (Next 16 Promise) 처리, 메시지 표시, 에러 코드 표시, 링크 검증.
 */

function makeSearchParams(
  params: { code?: string; message?: string; orderId?: string },
) {
  return Promise.resolve(params);
}

describe("FailPage", () => {
  describe("rendering with no params", () => {
    it("renders fallback message when message missing", async () => {
      const ui = await Promise.resolve(
        <FailPage searchParams={makeSearchParams({})} />,
      );
      render(ui);
      expect(
        screen.getByText(/결제 진행 중 문제가 발생했습니다/),
      ).toBeInTheDocument();
    });

    it("does not display error code block when code missing", async () => {
      const ui = await Promise.resolve(
        <FailPage searchParams={makeSearchParams({})} />,
      );
      render(ui);
      expect(screen.queryByText(/에러 코드/)).toBeNull();
    });
  });

  describe("rendering with message", () => {
    it("displays provided message", async () => {
      const ui = await Promise.resolve(
        <FailPage
          searchParams={makeSearchParams({
            message: "잔액이 부족합니다.",
          })}
        />,
      );
      render(ui);
      expect(screen.getByText("잔액이 부족합니다.")).toBeInTheDocument();
    });

    it("displays a longer toss error message verbatim", async () => {
      const ui = await Promise.resolve(
        <FailPage
          searchParams={makeSearchParams({
            message:
              "사용자가 결제를 취소하였습니다. 다시 시도해주세요.",
          })}
        />,
      );
      render(ui);
      expect(
        screen.getByText(/사용자가 결제를 취소하였습니다/),
      ).toBeInTheDocument();
    });
  });

  describe("rendering with code", () => {
    it("displays code in dedicated block", async () => {
      const ui = await Promise.resolve(
        <FailPage
          searchParams={makeSearchParams({
            code: "PAY_PROCESS_CANCELED",
          })}
        />,
      );
      render(ui);
      expect(screen.getByText("에러 코드")).toBeInTheDocument();
      expect(screen.getByText("PAY_PROCESS_CANCELED")).toBeInTheDocument();
    });

    it("code text uses font-mono style", async () => {
      const ui = await Promise.resolve(
        <FailPage
          searchParams={makeSearchParams({
            code: "INVALID_CARD",
          })}
        />,
      );
      const { container } = render(ui);
      const mono = container.querySelector(".font-mono");
      expect(mono?.textContent).toBe("INVALID_CARD");
    });
  });

  describe("rendering with both code and message", () => {
    it("displays both code and message", async () => {
      const ui = await Promise.resolve(
        <FailPage
          searchParams={makeSearchParams({
            code: "INVALID_REQUEST",
            message: "주문 정보가 올바르지 않습니다.",
          })}
        />,
      );
      render(ui);
      expect(screen.getByText("INVALID_REQUEST")).toBeInTheDocument();
      expect(
        screen.getByText("주문 정보가 올바르지 않습니다."),
      ).toBeInTheDocument();
    });
  });

  describe("emoji and heading", () => {
    it("renders the 😔 emoji", async () => {
      const ui = await Promise.resolve(
        <FailPage searchParams={makeSearchParams({})} />,
      );
      render(ui);
      expect(screen.getByText("😔")).toBeInTheDocument();
    });

    it("renders '결제에 실패했어요' heading", async () => {
      const ui = await Promise.resolve(
        <FailPage searchParams={makeSearchParams({})} />,
      );
      render(ui);
      expect(screen.getByText("결제에 실패했어요")).toBeInTheDocument();
    });
  });

  describe("recovery actions", () => {
    it("renders '다시 시도하기' CTA", async () => {
      const ui = await Promise.resolve(
        <FailPage searchParams={makeSearchParams({})} />,
      );
      render(ui);
      expect(screen.getByText("다시 시도하기")).toBeInTheDocument();
    });

    it("'다시 시도하기' links to /pricing", async () => {
      const ui = await Promise.resolve(
        <FailPage searchParams={makeSearchParams({})} />,
      );
      render(ui);
      const link = screen.getByText("다시 시도하기").closest("a");
      expect(link?.getAttribute("href")).toBe("/pricing");
    });

    it("renders '홈으로' CTA", async () => {
      const ui = await Promise.resolve(
        <FailPage searchParams={makeSearchParams({})} />,
      );
      render(ui);
      expect(screen.getByText("홈으로")).toBeInTheDocument();
    });

    it("'홈으로' links to /", async () => {
      const ui = await Promise.resolve(
        <FailPage searchParams={makeSearchParams({})} />,
      );
      render(ui);
      const link = screen.getByText("홈으로").closest("a");
      expect(link?.getAttribute("href")).toBe("/");
    });

    it("'다시 시도하기' uses gradient style (primary)", async () => {
      const ui = await Promise.resolve(
        <FailPage searchParams={makeSearchParams({})} />,
      );
      render(ui);
      const cta = screen.getByText("다시 시도하기").closest("a");
      expect(cta?.className).toContain("bg-gradient-to-r");
    });

    it("'홈으로' uses subtle style (secondary)", async () => {
      const ui = await Promise.resolve(
        <FailPage searchParams={makeSearchParams({})} />,
      );
      render(ui);
      const cta = screen.getByText("홈으로").closest("a");
      expect(cta?.className).toContain("bg-white/5");
    });
  });

  describe("layout", () => {
    it("uses centered max-w-md container", async () => {
      const ui = await Promise.resolve(
        <FailPage searchParams={makeSearchParams({})} />,
      );
      const { container } = render(ui);
      const root = container.querySelector(".max-w-md");
      expect(root).not.toBeNull();
    });

    it("content is text-center", async () => {
      const ui = await Promise.resolve(
        <FailPage searchParams={makeSearchParams({})} />,
      );
      const { container } = render(ui);
      const root = container.querySelector(".text-center");
      expect(root).not.toBeNull();
    });
  });

  describe("toss error code mapping (sample real codes)", () => {
    const tossErrorSamples = [
      "PAY_PROCESS_CANCELED",
      "USER_CANCEL_PAYMENT",
      "INVALID_CARD",
      "INVALID_REQUEST",
      "EXCEED_MAX_AUTH_COUNT",
      "INVALID_STOPPED_CARD",
      "EXCEED_MAX_DAILY_PAYMENT_COUNT",
    ];

    it.each(tossErrorSamples)(
      "displays toss code: %s",
      async (code) => {
        const ui = await Promise.resolve(
          <FailPage searchParams={makeSearchParams({ code })} />,
        );
        render(ui);
        expect(screen.getByText(code)).toBeInTheDocument();
      },
    );
  });
});
