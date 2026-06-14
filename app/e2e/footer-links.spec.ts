import { test, expect } from "@playwright/test";

/**
 * E2E: 사이트 전역 푸터 링크 검증
 *
 * Footer는 모든 페이지에 마운트되므로, 핵심 페이지 몇 개에서 검증.
 */

const PAGES_WITH_FOOTER = ["/", "/pricing", "/experts", "/checkout?plan=premium"];

test.describe("푸터 — 페이지별 마운트", () => {
  for (const path of PAGES_WITH_FOOTER) {
    test(`${path}: 푸터 마운트`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("footer")).toBeAttached();
    });
  }
});

test.describe("푸터 서비스 링크 → 페이지 전이", () => {
  test("푸터 'AI 문서생성' → /generate", async ({ page }) => {
    await page.goto("/pricing");
    const footer = page.locator("footer");
    await footer.getByRole("link", { name: "AI 문서생성" }).click();
    await expect(page).toHaveURL(/\/generate/);
  });

  test("푸터 '전문가 매칭' → /experts", async ({ page }) => {
    await page.goto("/pricing");
    const footer = page.locator("footer");
    await footer
      .getByRole("link", { name: "전문가 매칭" })
      .click();
    await expect(page).toHaveURL(/\/experts/);
  });

  test("푸터 '요금제' → /pricing", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await footer.getByRole("link", { name: "요금제" }).click();
    await expect(page).toHaveURL(/\/pricing/);
  });
});

test.describe("푸터 법적 정보 링크", () => {
  test("'이용약관' → /terms (200 응답)", async ({ page }) => {
    await page.goto("/pricing");
    const footer = page.locator("footer");
    const res = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/terms")),
      footer.getByRole("link", { name: "이용약관" }).click(),
    ]);
    expect(res[0].status()).toBeLessThan(400);
  });

  test("'개인정보처리방침' → /privacy (200 응답)", async ({ page }) => {
    await page.goto("/pricing");
    const footer = page.locator("footer");
    const res = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/privacy")),
      footer
        .getByRole("link", { name: "개인정보처리방침" })
        .click(),
    ]);
    expect(res[0].status()).toBeLessThan(400);
  });
});

test.describe("푸터 외부 링크 — target=_blank 검증", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pricing");
  });

  test("GitHub 링크는 새 탭으로 열림", async ({ page }) => {
    const link = page.locator("footer").getByText("GitHub").first();
    const target = await link.evaluate(
      (el) => el.closest("a")?.getAttribute("target"),
    );
    expect(target).toBe("_blank");
  });

  test("기업마당 외부 링크는 새 탭", async ({ page }) => {
    const link = page.locator("footer").getByText("기업마당 공공API");
    const target = await link.evaluate(
      (el) => el.closest("a")?.getAttribute("target"),
    );
    expect(target).toBe("_blank");
  });

  test("정부24 외부 링크는 새 탭", async ({ page }) => {
    const link = page.locator("footer").getByText("정부24");
    const target = await link.evaluate(
      (el) => el.closest("a")?.getAttribute("target"),
    );
    expect(target).toBe("_blank");
  });

  test("소상공인진흥공단 외부 링크는 새 탭", async ({ page }) => {
    const link = page.locator("footer").getByText("소상공인진흥공단");
    const target = await link.evaluate(
      (el) => el.closest("a")?.getAttribute("target"),
    );
    expect(target).toBe("_blank");
  });

  test("외부 링크는 noopener rel", async ({ page }) => {
    const externals = ["GitHub", "기업마당 공공API", "정부24"];
    for (const label of externals) {
      const link = page.locator("footer").getByText(label).first();
      const rel = await link.evaluate(
        (el) => el.closest("a")?.getAttribute("rel"),
      );
      expect(rel ?? "").toContain("noopener");
    }
  });
});

test.describe("푸터 brand carry-over", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pricing");
  });

  test("'보조금매칭AI' 브랜드명 표시", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer.getByText(/보조금매칭AI/)).toBeVisible();
  });

  test("브랜드 카피 'AI 분석 결과는 참고용이며'", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(
      footer.getByText(/AI 분석 결과는 참고용이며/),
    ).toBeVisible();
  });

  test("저작권 표기에 현재 연도", async ({ page }) => {
    const footer = page.locator("footer");
    const year = new Date().getFullYear();
    await expect(footer.getByText(new RegExp(String(year)))).toBeVisible();
  });

  test("저작권 표기에 'All rights reserved'", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer.getByText(/All rights reserved/i)).toBeVisible();
  });
});
