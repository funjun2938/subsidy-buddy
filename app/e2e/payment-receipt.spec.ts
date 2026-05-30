import { test, expect } from "@playwright/test";

/**
 * E2E: 결제 영수증 표시 (success page)
 *
 * 토스 confirm API를 모킹하여 다양한 응답에 따른 영수증 화면을 검증.
 */

const RECEIPT_FIELDS = ["상품", "결제 수단", "결제 금액", "승인 시각"];

test.describe("결제 성공 — 영수증", () => {
  test.describe("프리미엄 결제 성공", () => {
    test.beforeEach(async ({ page }) => {
      await page.route("**/api/payments/confirm", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            orderName: "프리미엄 멤버십",
            method: "카드",
            approvedAt: "2026-05-30T12:00:00+09:00",
            totalAmount: 9900,
          }),
        });
      });
    });

    test("'결제 완료!' 헤딩", async ({ page }) => {
      await page.goto(
        "/checkout/success?paymentKey=pk&orderId=order_premium_1&amount=9900",
      );
      await expect(page.getByText("결제 완료!")).toBeVisible({
        timeout: 10_000,
      });
    });

    test("🎉 이모지 표시", async ({ page }) => {
      await page.goto(
        "/checkout/success?paymentKey=pk&orderId=order_premium_1&amount=9900",
      );
      await expect(page.getByText("🎉")).toBeVisible({ timeout: 10_000 });
    });

    test.each(RECEIPT_FIELDS)("'%s' 필드 라벨 표시", async (field, { page }) => {
      await page.goto(
        "/checkout/success?paymentKey=pk&orderId=order_premium_1&amount=9900",
      );
      await expect(page.getByText(field)).toBeVisible({ timeout: 10_000 });
    });

    test("상품 값 '프리미엄 멤버십'", async ({ page }) => {
      await page.goto(
        "/checkout/success?paymentKey=pk&orderId=order_premium_1&amount=9900",
      );
      await expect(page.getByText("프리미엄 멤버십")).toBeVisible({
        timeout: 10_000,
      });
    });

    test("결제 수단 값 '신용/체크카드'", async ({ page }) => {
      await page.goto(
        "/checkout/success?paymentKey=pk&orderId=order_premium_1&amount=9900",
      );
      await expect(page.getByText("신용/체크카드")).toBeVisible({
        timeout: 10_000,
      });
    });

    test("결제 금액 값 '9,900원'", async ({ page }) => {
      await page.goto(
        "/checkout/success?paymentKey=pk&orderId=order_premium_1&amount=9900",
      );
      await expect(page.getByText("9,900원").first()).toBeVisible({
        timeout: 10_000,
      });
    });

    test("승인 시각이 2026 포함", async ({ page }) => {
      await page.goto(
        "/checkout/success?paymentKey=pk&orderId=order_premium_1&amount=9900",
      );
      await expect(page.getByText(/2026/).first()).toBeVisible({
        timeout: 10_000,
      });
    });

    test("'서비스 시작하기' CTA", async ({ page }) => {
      await page.goto(
        "/checkout/success?paymentKey=pk&orderId=order_premium_1&amount=9900",
      );
      await expect(page.getByText("서비스 시작하기")).toBeVisible({
        timeout: 10_000,
      });
    });

    test("'요금제 다시 보기' CTA", async ({ page }) => {
      await page.goto(
        "/checkout/success?paymentKey=pk&orderId=order_premium_1&amount=9900",
      );
      await expect(page.getByText("요금제 다시 보기")).toBeVisible({
        timeout: 10_000,
      });
    });
  });

  test.describe("비즈니스 결제 성공", () => {
    test.beforeEach(async ({ page }) => {
      await page.route("**/api/payments/confirm", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            orderName: "비즈니스 멤버십",
            method: "카드",
            approvedAt: "2026-05-30T12:00:00+09:00",
            totalAmount: 49000,
          }),
        });
      });
    });

    test("상품 값 '비즈니스 멤버십'", async ({ page }) => {
      await page.goto(
        "/checkout/success?paymentKey=pk&orderId=order_business_1&amount=49000",
      );
      await expect(page.getByText("비즈니스 멤버십")).toBeVisible({
        timeout: 10_000,
      });
    });

    test("결제 금액 '49,000원'", async ({ page }) => {
      await page.goto(
        "/checkout/success?paymentKey=pk&orderId=order_business_1&amount=49000",
      );
      await expect(page.getByText("49,000원").first()).toBeVisible({
        timeout: 10_000,
      });
    });
  });

  test.describe("전문가 결제 성공", () => {
    test.beforeEach(async ({ page }) => {
      await page.route("**/api/payments/confirm", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            orderName: "전문가 신청 대행",
            method: "카드",
            approvedAt: "2026-05-30T12:00:00+09:00",
            totalAmount: 50000,
          }),
        });
      });
    });

    test("상품 값 '전문가 신청 대행'", async ({ page }) => {
      await page.goto(
        "/checkout/success?paymentKey=pk&orderId=order_expert_1&amount=50000",
      );
      await expect(page.getByText("전문가 신청 대행")).toBeVisible({
        timeout: 10_000,
      });
    });

    test("결제 금액 '50,000원'", async ({ page }) => {
      await page.goto(
        "/checkout/success?paymentKey=pk&orderId=order_expert_1&amount=50000",
      );
      await expect(page.getByText("50,000원").first()).toBeVisible({
        timeout: 10_000,
      });
    });
  });

  test.describe("간편결제 (카카오페이) 성공", () => {
    test("결제 수단 '간편결제'로 표시", async ({ page }) => {
      await page.route("**/api/payments/confirm", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            orderName: "프리미엄 멤버십",
            method: "간편결제",
            approvedAt: "2026-05-30T12:00:00+09:00",
            totalAmount: 9900,
          }),
        });
      });
      await page.goto(
        "/checkout/success?paymentKey=pk&orderId=order_premium_1&amount=9900",
      );
      await expect(page.getByText("간편결제")).toBeVisible({
        timeout: 10_000,
      });
    });
  });

  test.describe("승인 후 네비게이션", () => {
    test.beforeEach(async ({ page }) => {
      await page.route("**/api/payments/confirm", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            orderName: "프리미엄 멤버십",
            method: "카드",
            approvedAt: "2026-05-30T12:00:00+09:00",
            totalAmount: 9900,
          }),
        });
      });
    });

    test("'서비스 시작하기' → 홈으로", async ({ page }) => {
      await page.goto(
        "/checkout/success?paymentKey=pk&orderId=order_premium_1&amount=9900",
      );
      await page
        .getByRole("link", { name: "서비스 시작하기" })
        .click();
      await expect(page).toHaveURL(/\/$/);
    });

    test("'요금제 다시 보기' → /pricing", async ({ page }) => {
      await page.goto(
        "/checkout/success?paymentKey=pk&orderId=order_premium_1&amount=9900",
      );
      await page
        .getByRole("link", { name: "요금제 다시 보기" })
        .click();
      await expect(page).toHaveURL(/\/pricing/);
    });
  });
});
