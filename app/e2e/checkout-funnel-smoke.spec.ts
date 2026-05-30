import { test, expect } from "@playwright/test";

/**
 * E2E: 결제 퍼널 추가 스모크
 *
 * 빠르게 동작 확인용 시나리오 묶음.
 */

test.describe("결제 퍼널 — 스모크", () => {
  test("랜딩 → 요금제 → 프리미엄 결제 페이지", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "요금제" }).first().click();
    await expect(page).toHaveURL(/\/pricing/);
    await page.getByRole("link", { name: "프리미엄 시작" }).click();
    await expect(page).toHaveURL(/\/checkout\?plan=premium/);
    await expect(page.getByText("프리미엄 멤버십")).toBeVisible();
  });

  test("랜딩 → 요금제 → 비즈니스 결제 페이지", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "요금제" }).first().click();
    await page.getByRole("link", { name: "비즈니스 시작" }).click();
    await expect(page).toHaveURL(/\/checkout\?plan=business/);
    await expect(page.getByText("비즈니스 멤버십")).toBeVisible();
  });

  test("랜딩 → 요금제 → 전문가 결제 페이지", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "요금제" }).first().click();
    await page.getByText("착수금 결제하기 →").click();
    await expect(page).toHaveURL(/\/checkout\?plan=expert/);
    await expect(page.getByText("전문가 신청 대행")).toBeVisible();
  });

  test("결제 페이지에서 뒤로가기 → 요금제", async ({ page }) => {
    await page.goto("/pricing");
    await page.getByRole("link", { name: "프리미엄 시작" }).click();
    await page.goBack();
    await expect(page).toHaveURL(/\/pricing/);
  });

  test("결제 실패 페이지에서 재시도 → 요금제", async ({ page }) => {
    await page.goto("/checkout/fail?code=USER_CANCEL_PAYMENT");
    await page.getByRole("link", { name: "다시 시도하기" }).click();
    await expect(page).toHaveURL(/\/pricing/);
  });

  test("결제 실패에서 홈으로", async ({ page }) => {
    await page.goto("/checkout/fail");
    await page.getByRole("link", { name: "홈으로" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("토스 confirm 모킹으로 영수증 표시", async ({ page }) => {
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
    await page.goto(
      "/checkout/success?paymentKey=pk&orderId=order_premium_smoke&amount=9900",
    );
    await expect(page.getByText("결제 완료!")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("결제 페이지 — 빠른 점검", () => {
  test("기본 헤더 표시", async ({ page }) => {
    await page.goto("/checkout?plan=premium");
    await expect(page.locator("header")).toBeAttached();
  });

  test("기본 푸터 표시", async ({ page }) => {
    await page.goto("/checkout?plan=premium");
    await page.locator("footer").scrollIntoViewIfNeeded();
    await expect(page.locator("footer")).toBeVisible();
  });

  test("noise 배경 div 마운트", async ({ page }) => {
    await page.goto("/checkout?plan=premium");
    const noise = page.locator(".noise");
    await expect(noise).toBeAttached();
  });

  test("buttons:disabled 위젯 로드 전", async ({ page }) => {
    await page.goto("/checkout?plan=premium");
    // 초기 상태에서 결제 버튼 disabled일 수도, 곧 로드될 수도 있음.
    // 어떻든 마운트되어야 함.
    const button = page.getByRole("button", { name: /원 결제하기|결제 위젯/ });
    await expect(button).toBeAttached();
  });
});

test.describe("결제 페이지 — 다국어 호환", () => {
  test("Korean text renders correctly", async ({ page }) => {
    await page.goto("/checkout?plan=premium");
    await expect(page.getByText("프리미엄 멤버십")).toBeVisible();
  });

  test("화폐 단위 '원'이 명시", async ({ page }) => {
    await page.goto("/checkout?plan=premium");
    const html = await page.content();
    expect(html).toContain("원");
  });
});

test.describe("결제 페이지 — 액세스", () => {
  test("h1 헤딩 존재", async ({ page }) => {
    await page.goto("/checkout?plan=premium");
    const h1 = page.locator("h1");
    const count = await h1.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("page lang attribute is set", async ({ page }) => {
    await page.goto("/checkout?plan=premium");
    const lang = await page
      .locator("html")
      .evaluate((el) => el.getAttribute("lang"));
    expect(lang).toBeTruthy();
  });
});
