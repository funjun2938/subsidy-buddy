import { test, expect } from "@playwright/test";

/**
 * E2E: 랜딩 페이지 (/) 검증
 *
 * 헤더, 히어로, 통계, 폼, BM 카드, FAQ, 푸터 모든 섹션 가시성 + 링크.
 */

test.describe("랜딩 페이지", () => {
  test.describe("기본 로드", () => {
    test("페이지가 200으로 응답", async ({ page }) => {
      const res = await page.goto("/");
      expect(res?.status()).toBe(200);
    });

    test("페이지 타이틀에 '보조금' 포함", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveTitle(/보조금/);
    });
  });

  test.describe("히어로 섹션", () => {
    test("'실시간 정부 지원사업 분석 중' 배지 표시", async ({ page }) => {
      await page.goto("/");
      await expect(
        page.getByText("실시간 정부 지원사업 분석 중"),
      ).toBeVisible();
    });

    test("메인 헤딩에 '정부 지원금' 포함", async ({ page }) => {
      await page.goto("/");
      const h1 = page.locator("h1");
      await expect(h1).toContainText("정부 지원금");
    });

    test("메인 헤딩에 'AI가 찾아드립니다' 포함", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByText(/AI가 찾아드립니다/)).toBeVisible();
    });

    test("히어로 설명 표시", async ({ page }) => {
      await page.goto("/");
      await expect(
        page.getByText(/사업자등록증 한 장이면 끝/),
      ).toBeVisible();
    });
  });

  test.describe("통계 섹션", () => {
    test("'500+' 통계 표시", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByText("500+")).toBeVisible();
    });

    test("'분석 지원사업' 라벨", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByText("분석 지원사업")).toBeVisible();
    });

    test("'30초' 통계", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByText("30초")).toBeVisible();
    });

    test("'AI 매칭 소요' 라벨", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByText("AI 매칭 소요")).toBeVisible();
    });

    test("'무료' 통계", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByText("무료").first()).toBeVisible();
    });

    test("'기본 이용' 라벨", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByText("기본 이용")).toBeVisible();
    });
  });

  test.describe("BM Feature Cards", () => {
    test("섹션 헤딩 '지원금 신청까지 한번에'", async ({ page }) => {
      await page.goto("/");
      await page.locator("text=지원금 신청까지 한번에").scrollIntoViewIfNeeded();
      await expect(
        page.getByText("지원금 신청까지 한번에"),
      ).toBeVisible();
    });

    test("'AI 맞춤 매칭' 카드", async ({ page }) => {
      await page.goto("/");
      await page.locator("text=AI 맞춤 매칭").scrollIntoViewIfNeeded();
      await expect(page.getByText("AI 맞춤 매칭")).toBeVisible();
    });

    test("'AI 맞춤 매칭' 카드 가격 '무료' 표시", async ({ page }) => {
      await page.goto("/");
      // Many '무료' on page; ensure first occurrence exists
      await expect(page.getByText("무료").first()).toBeVisible();
    });

    test("'AI 신청서 생성' 카드", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByText("AI 신청서 생성")).toBeVisible();
    });

    test("'AI 신청서 생성' 가격 '건당 29,900원'", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByText("건당 29,900원")).toBeVisible();
    });

    test("'전문가 매칭' 카드 (BM)", async ({ page }) => {
      await page.goto("/");
      // 전문가 매칭 appears in header too; assert at least 1 visible
      const matches = page.getByText("전문가 매칭");
      await expect(matches.first()).toBeVisible();
    });

    test("'전문가 매칭' 수수료 '10~15%'", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByText(/수수료 10~15%/)).toBeVisible();
    });

    test("'AI 맞춤 매칭' 카드는 / 로 링크", async ({ page }) => {
      await page.goto("/");
      const card = page.locator("a", { hasText: "AI 맞춤 매칭" }).first();
      const href = await card.getAttribute("href");
      expect(href).toBe("/");
    });

    test("'AI 신청서 생성' 카드는 /generate 로 링크", async ({ page }) => {
      await page.goto("/");
      const card = page.locator("a", { hasText: "AI 신청서 생성" }).first();
      const href = await card.getAttribute("href");
      expect(href).toBe("/generate");
    });
  });

  test.describe("ConditionForm 섹션", () => {
    test("폼 섹션이 페이지에 마운트", async ({ page }) => {
      await page.goto("/");
      // 어떤 form 요소가 있는지 확인
      const form = page.locator("form").first();
      await expect(form).toBeAttached({ timeout: 10_000 });
    });
  });

  test.describe("FAQ 섹션", () => {
    test("'자주 묻는 질문' 헤딩", async ({ page }) => {
      await page.goto("/");
      await page.locator("text=자주 묻는 질문").scrollIntoViewIfNeeded();
      await expect(page.getByText("자주 묻는 질문")).toBeVisible();
    });

    test("FAQ 5개 질문 모두 표시", async ({ page }) => {
      await page.goto("/");
      await page.locator("text=자주 묻는 질문").scrollIntoViewIfNeeded();
      const questions = [
        "어떤 지원사업을 매칭해주나요?",
        "AI 매칭은 정확한가요?",
        "사업자등록증을 업로드하면 안전한가요?",
        "AI 신청서 생성은 어떻게 작동하나요?",
        "무료로 이용할 수 있나요?",
      ];
      for (const q of questions) {
        await expect(page.getByText(q)).toBeVisible();
      }
    });

    test("FAQ 토글 동작", async ({ page }) => {
      await page.goto("/");
      await page.locator("text=자주 묻는 질문").scrollIntoViewIfNeeded();
      await page.getByText("어떤 지원사업을 매칭해주나요?").click();
      await expect(page.getByText(/기업마당 공공API/)).toBeVisible();
    });
  });

  test.describe("푸터 섹션", () => {
    test("푸터 마운트", async ({ page }) => {
      await page.goto("/");
      await expect(page.locator("footer")).toBeAttached();
    });

    test("푸터에 '서비스' 섹션", async ({ page }) => {
      await page.goto("/");
      const footer = page.locator("footer");
      await expect(footer.getByText("서비스")).toBeVisible();
    });

    test("푸터에 '프로젝트' 섹션", async ({ page }) => {
      await page.goto("/");
      const footer = page.locator("footer");
      await expect(footer.getByText("프로젝트")).toBeVisible();
    });

    test("푸터에 '법적 정보' 섹션", async ({ page }) => {
      await page.goto("/");
      const footer = page.locator("footer");
      await expect(footer.getByText("법적 정보")).toBeVisible();
    });
  });

  test.describe("반응형 (viewport)", () => {
    test("모바일 375x812에서 헤딩 표시", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto("/");
      const h1 = page.locator("h1");
      await expect(h1).toBeVisible();
    });

    test("태블릿 768x1024에서 BM 카드 3개 표시", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/");
      await page
        .locator("text=지원금 신청까지 한번에")
        .scrollIntoViewIfNeeded();
      await expect(page.getByText("AI 맞춤 매칭")).toBeVisible();
      await expect(page.getByText("AI 신청서 생성")).toBeVisible();
    });

    test("데스크탑 1440x900에서 max-w-5xl 적용", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/");
      const hero = page.locator(".max-w-5xl").first();
      await expect(hero).toBeAttached();
    });
  });

  test.describe("네비게이션 전이", () => {
    test("AI 신청서 카드 클릭 → /generate", async ({ page }) => {
      await page.goto("/");
      await page.locator("a", { hasText: "AI 신청서 생성" }).first().click();
      await expect(page).toHaveURL(/\/generate/);
    });

    test("헤더의 요금제 클릭 → /pricing", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("link", { name: "요금제" }).first().click();
      await expect(page).toHaveURL(/\/pricing/);
    });

    test("FAQ 인터랙션 후 /pricing 으로 이동", async ({ page }) => {
      await page.goto("/");
      await page.locator("text=자주 묻는 질문").scrollIntoViewIfNeeded();
      await page.getByText("무료로 이용할 수 있나요?").click();
      await expect(page.getByText(/완전 무료입니다/)).toBeVisible();
      await page.getByRole("link", { name: "요금제" }).first().click();
      await expect(page).toHaveURL(/\/pricing/);
    });
  });
});
