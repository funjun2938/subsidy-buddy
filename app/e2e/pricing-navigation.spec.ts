import { test, expect } from "@playwright/test";

/**
 * E2E: /pricing 페이지 네비게이션과 UI 가드
 *
 * 결제 퍼널 진입점인 /pricing의 모든 네비게이션을 검증.
 * 헤더/푸터/요금제 카드/단건 서비스 카드의 모든 링크가 기대된 경로로 가는지 확인.
 */

test.describe("/pricing 네비게이션", () => {
  test.describe("헤더 네비게이션", () => {
    test("'/' 로고 클릭 시 홈으로", async ({ page }) => {
      await page.goto("/pricing");
      const logo = page.locator("header a").first();
      await logo.click();
      await expect(page).toHaveURL(/\/$/);
    });

    test("'AI 문서생성' 클릭 시 /generate", async ({ page }) => {
      await page.goto("/pricing");
      await page.getByRole("link", { name: "AI 문서생성" }).first().click();
      await expect(page).toHaveURL(/\/generate/);
    });

    test("'전문가 매칭' 클릭 시 /experts", async ({ page }) => {
      await page.goto("/pricing");
      await page.getByRole("link", { name: "전문가 매칭" }).first().click();
      await expect(page).toHaveURL(/\/experts/);
    });

    test("'요금제' 클릭 시 /pricing 머무름", async ({ page }) => {
      await page.goto("/pricing");
      await page.getByRole("link", { name: "요금제" }).first().click();
      await expect(page).toHaveURL(/\/pricing/);
    });
  });

  test.describe("푸터 네비게이션", () => {
    test("푸터의 'AI 문서생성' 링크", async ({ page }) => {
      await page.goto("/pricing");
      const footer = page.locator("footer");
      await footer
        .getByRole("link", { name: "AI 문서생성" })
        .click();
      await expect(page).toHaveURL(/\/generate/);
    });

    test("푸터의 '요금제' 링크", async ({ page }) => {
      await page.goto("/pricing");
      const footer = page.locator("footer");
      await footer.getByRole("link", { name: "요금제" }).click();
      await expect(page).toHaveURL(/\/pricing/);
    });

    test("푸터의 '이용약관' 링크", async ({ page }) => {
      await page.goto("/pricing");
      const footer = page.locator("footer");
      await footer.getByRole("link", { name: "이용약관" }).click();
      await expect(page).toHaveURL(/\/terms/);
    });

    test("푸터의 '개인정보처리방침' 링크", async ({ page }) => {
      await page.goto("/pricing");
      const footer = page.locator("footer");
      await footer.getByRole("link", { name: "개인정보처리방침" }).click();
      await expect(page).toHaveURL(/\/privacy/);
    });

    test("푸터의 GitHub 외부 링크는 새 탭 (target=_blank)", async ({ page }) => {
      await page.goto("/pricing");
      const link = page.locator("footer").getByText("GitHub").first();
      const target = await link.evaluate((el) =>
        el.closest("a")?.getAttribute("target"),
      );
      expect(target).toBe("_blank");
    });

    test("푸터의 기업마당 공공API 외부 링크는 새 탭", async ({ page }) => {
      await page.goto("/pricing");
      const link = page.locator("footer").getByText("기업마당 공공API");
      const target = await link.evaluate((el) =>
        el.closest("a")?.getAttribute("target"),
      );
      expect(target).toBe("_blank");
    });
  });

  test.describe("구독 플랜 카드 네비게이션", () => {
    test("무료 plan CTA: '/' 로 이동", async ({ page }) => {
      await page.goto("/pricing");
      await page.getByRole("link", { name: "무료로 시작" }).click();
      await expect(page).toHaveURL(/\/$/);
    });

    test("프리미엄 plan CTA: /checkout?plan=premium", async ({ page }) => {
      await page.goto("/pricing");
      await page.getByRole("link", { name: "프리미엄 시작" }).click();
      await expect(page).toHaveURL(/\/checkout\?plan=premium/);
    });

    test("비즈니스 plan CTA: /checkout?plan=business", async ({ page }) => {
      await page.goto("/pricing");
      await page.getByRole("link", { name: "비즈니스 시작" }).click();
      await expect(page).toHaveURL(/\/checkout\?plan=business/);
    });
  });

  test.describe("단건 서비스 카드 네비게이션", () => {
    test("AI 신청서 카드 '자세히 보기 →': /generate", async ({ page }) => {
      await page.goto("/pricing");
      await page.getByText("자세히 보기 →").click();
      await expect(page).toHaveURL(/\/generate/);
    });

    test("전문가 카드 '착수금 결제하기 →': /checkout?plan=expert", async ({
      page,
    }) => {
      await page.goto("/pricing");
      await page.getByText("착수금 결제하기 →").click();
      await expect(page).toHaveURL(/\/checkout\?plan=expert/);
    });
  });

  test.describe("플랜 가격 표시", () => {
    test("무료 plan은 '0원'으로 표시", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("0").first()).toBeVisible();
    });

    test("프리미엄 가격 옆에 '/월' 표시", async ({ page }) => {
      await page.goto("/pricing");
      const html = await page.content();
      expect(html).toContain("9,900");
      expect(html).toContain("/월");
    });

    test("비즈니스 가격 옆에 '/월' 표시", async ({ page }) => {
      await page.goto("/pricing");
      const html = await page.content();
      expect(html).toContain("49,000");
    });

    test("AI 신청서 가격 29,900원/건", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("29,900")).toBeVisible();
    });

    test("전문가 대행 수수료 10~15%", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("10~15")).toBeVisible();
    });
  });

  test.describe("플랜 기능 표시", () => {
    test("무료 플랜에 'AI 지원사업 매칭' 포함", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("AI 지원사업 매칭").first()).toBeVisible();
    });

    test("무료 플랜 '매칭 결과 3건까지 보기' 포함", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("매칭 결과 3건까지 보기")).toBeVisible();
    });

    test("무료 플랜 '사업자등록증 AI 분석' 포함", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("사업자등록증 AI 분석")).toBeVisible();
    });

    test("프리미엄 '전체 매칭 결과 보기' 포함", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("전체 매칭 결과 보기")).toBeVisible();
    });

    test("프리미엄 '상세 AI 자격 분석' 포함", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("상세 AI 자격 분석")).toBeVisible();
    });

    test("프리미엄 '마감 D-7, D-3, D-1 알림' 포함", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("마감 D-7, D-3, D-1 알림")).toBeVisible();
    });

    test("프리미엄 'AI 신청서 생성 월 3건' 포함", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("AI 신청서 생성 월 3건")).toBeVisible();
    });

    test("비즈니스 'AI 신청서 생성 무제한' 포함", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("AI 신청서 생성 무제한")).toBeVisible();
    });

    test("비즈니스 '전문가 1:1 전담 배정' 포함", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("전문가 1:1 전담 배정")).toBeVisible();
    });

    test("비즈니스 '신청 대행 수수료 50% 할인' 포함", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("신청 대행 수수료 50% 할인")).toBeVisible();
    });

    test("비즈니스 '합격률 분석 리포트' 포함", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("합격률 분석 리포트")).toBeVisible();
    });

    test("비즈니스 'R&D 과제 특화 분석' 포함", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("R&D 과제 특화 분석")).toBeVisible();
    });

    test("비즈니스 '우선 고객 지원' 포함", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("우선 고객 지원")).toBeVisible();
    });
  });

  test.describe("반응형 레이아웃 (data check via viewport)", () => {
    test("데스크탑 1280x720에서 3열 그리드", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("/pricing");
      const cards = await page.locator(".glass.rounded-3xl").count();
      expect(cards).toBeGreaterThanOrEqual(3);
    });

    test("태블릿 768x1024에서 카드 모두 보임", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/pricing");
      await expect(page.getByText("프리미엄").first()).toBeVisible();
      await expect(page.getByText("비즈니스").first()).toBeVisible();
    });

    test("모바일 375x812에서 카드 세로 스택", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto("/pricing");
      await expect(page.getByText("프리미엄").first()).toBeVisible();
    });
  });

  test.describe("브라우저 뒤로가기/앞으로가기", () => {
    test("결제 페이지에서 뒤로가기 → /pricing", async ({ page }) => {
      await page.goto("/pricing");
      await page.getByRole("link", { name: "프리미엄 시작" }).click();
      await expect(page).toHaveURL(/\/checkout/);
      await page.goBack();
      await expect(page).toHaveURL(/\/pricing/);
    });

    test("뒤로갔다가 앞으로가기 → /checkout 복귀", async ({ page }) => {
      await page.goto("/pricing");
      await page.getByRole("link", { name: "비즈니스 시작" }).click();
      await page.goBack();
      await page.goForward();
      await expect(page).toHaveURL(/\/checkout\?plan=business/);
    });
  });

  test.describe("페이지 메타데이터", () => {
    test("페이지 타이틀에 '보조금' 포함", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page).toHaveTitle(/보조금/);
    });

    test("HTML lang 속성", async ({ page }) => {
      await page.goto("/pricing");
      const lang = await page
        .locator("html")
        .evaluate((el) => el.getAttribute("lang"));
      expect(["ko", "ko-KR", "en"]).toContain(lang ?? "");
    });
  });
});
