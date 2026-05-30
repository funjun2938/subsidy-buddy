import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("landing page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/보조금/);
    await expect(page.locator("h1")).toContainText(/정부 지원금/);
  });

  test("pricing page lists 3 subscription plans", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByText("무료").first()).toBeVisible();
    await expect(page.getByText("프리미엄").first()).toBeVisible();
    await expect(page.getByText("비즈니스").first()).toBeVisible();
  });

  test("clicking 프리미엄 시작 navigates to checkout", async ({ page }) => {
    await page.goto("/pricing");
    await page.getByRole("link", { name: "프리미엄 시작" }).click();
    await expect(page).toHaveURL(/\/checkout\?plan=premium/);
    await expect(page.getByText("프리미엄 멤버십")).toBeVisible();
  });

  test("checkout with invalid plan shows error message", async ({ page }) => {
    await page.goto("/checkout?plan=nonexistent");
    await expect(page.getByText("잘못된 플랜입니다")).toBeVisible();
  });

  test("FAQ section is present on landing page", async ({ page }) => {
    await page.goto("/");
    await page.locator("text=자주 묻는 질문").scrollIntoViewIfNeeded();
    await expect(page.getByText("자주 묻는 질문")).toBeVisible();
  });
});
