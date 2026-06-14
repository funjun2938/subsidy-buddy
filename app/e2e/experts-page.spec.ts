import { test, expect } from "@playwright/test";

/**
 * E2E: /experts 페이지 검증
 *
 * 전문가 카드 리스트, 상세 페이지, 결제 진입 등 검증.
 */

test.describe("/experts 페이지", () => {
  test("페이지 로드 (200)", async ({ page }) => {
    const res = await page.goto("/experts");
    expect(res?.status()).toBe(200);
  });

  test("페이지 타이틀에 '보조금' 포함", async ({ page }) => {
    await page.goto("/experts");
    await expect(page).toHaveTitle(/보조금/);
  });

  test.describe("전문가 카드", () => {
    test("'김변리사' 카드 표시", async ({ page }) => {
      await page.goto("/experts");
      await expect(page.getByText("김변리사")).toBeVisible();
    });

    test("변리사 직책 라벨", async ({ page }) => {
      await page.goto("/experts");
      await expect(page.getByText("변리사")).toBeVisible();
    });

    test("특허·R&D 과제 전문 분야", async ({ page }) => {
      await page.goto("/experts");
      await expect(page.getByText("특허·R&D 과제")).toBeVisible();
    });

    test("'R&D 과제' 태그", async ({ page }) => {
      await page.goto("/experts");
      await expect(page.getByText("R&D 과제")).toBeVisible();
    });

    test("성공률 87% 표시", async ({ page }) => {
      await page.goto("/experts");
      await expect(page.getByText(/87%/).first()).toBeVisible();
    });

    test("'평균 2시간 내 회신' 응답 시간", async ({ page }) => {
      await page.goto("/experts");
      await expect(page.getByText("평균 2시간 내 회신")).toBeVisible();
    });
  });

  test.describe("페이지 헤딩과 안내", () => {
    test("페이지에 h1 또는 h2 헤딩 존재", async ({ page }) => {
      await page.goto("/experts");
      const headings = page.locator("h1, h2");
      const count = await headings.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe("네비게이션", () => {
    test("푸터로 스크롤 시 푸터 표시", async ({ page }) => {
      await page.goto("/experts");
      await page.locator("footer").scrollIntoViewIfNeeded();
      await expect(page.locator("footer")).toBeVisible();
    });

    test("헤더의 로고로 홈 복귀", async ({ page }) => {
      await page.goto("/experts");
      const logo = page.locator("header a").first();
      await logo.click();
      await expect(page).toHaveURL(/\/$/);
    });

    test("푸터 '요금제'로 /pricing", async ({ page }) => {
      await page.goto("/experts");
      const footer = page.locator("footer");
      await footer.getByRole("link", { name: "요금제" }).click();
      await expect(page).toHaveURL(/\/pricing/);
    });
  });

  test.describe("반응형", () => {
    test("모바일에서 전문가 카드 표시", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto("/experts");
      await expect(page.getByText("김변리사")).toBeVisible();
    });

    test("태블릿에서 전문가 카드 표시", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/experts");
      await expect(page.getByText("김변리사")).toBeVisible();
    });

    test("데스크탑에서 전문가 카드 표시", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto("/experts");
      await expect(page.getByText("김변리사")).toBeVisible();
    });
  });
});
