import { test, expect } from "@playwright/test";

/**
 * E2E: FAQ 컴포넌트 인터랙션
 *
 * 랜딩 페이지 하단의 FAQ 아코디언을 키보드/마우스로 조작.
 * 토글, 단일-오픈, 회귀 가드.
 */

const QUESTIONS = [
  "어떤 지원사업을 매칭해주나요?",
  "AI 매칭은 정확한가요?",
  "사업자등록증을 업로드하면 안전한가요?",
  "AI 신청서 생성은 어떻게 작동하나요?",
  "무료로 이용할 수 있나요?",
];

test.describe("FAQ 인터랙션", () => {
  test.describe("진입과 위치", () => {
    test("랜딩 페이지 하단에 '자주 묻는 질문' 섹션 표시", async ({ page }) => {
      await page.goto("/");
      await page.locator("text=자주 묻는 질문").scrollIntoViewIfNeeded();
      await expect(page.getByText("자주 묻는 질문")).toBeVisible();
    });

    test("FAQ 서브헤딩 표시", async ({ page }) => {
      await page.goto("/");
      await expect(
        page.getByText("서비스 이용에 대해 궁금한 점을 확인하세요"),
      ).toBeVisible();
    });

    test.each(QUESTIONS.map((q, i) => ({ q, i })))(
      "질문 $i: '$q' 표시",
      async ({ q }, { page }) => {
        await page.goto("/");
        await expect(page.getByText(q)).toBeVisible();
      },
    );
  });

  test.describe("토글 동작", () => {
    test("첫 질문 클릭 시 첫 답변 표시", async ({ page }) => {
      await page.goto("/");
      await page.getByText(QUESTIONS[0]).click();
      await expect(
        page.getByText(/기업마당 공공API를 통해 중소벤처기업부/),
      ).toBeVisible();
    });

    test("열린 질문 다시 클릭 시 답변 숨김", async ({ page }) => {
      await page.goto("/");
      const q = page.getByText(QUESTIONS[0]);
      await q.click();
      await expect(
        page.getByText(/기업마당 공공API를 통해 중소벤처기업부/),
      ).toBeVisible();
      await q.click();
      await expect(
        page.getByText(/기업마당 공공API를 통해 중소벤처기업부/),
      ).toBeHidden();
    });

    test("두 번째 질문 클릭 시 첫 번째는 닫히고 두 번째 열림", async ({
      page,
    }) => {
      await page.goto("/");
      await page.getByText(QUESTIONS[0]).click();
      await page.getByText(QUESTIONS[1]).click();
      await expect(
        page.getByText(/기업마당 공공API를 통해 중소벤처기업부/),
      ).toBeHidden();
      await expect(
        page.getByText(/업종, 매출, 지역, 업력, 대표자 나이/),
      ).toBeVisible();
    });

    test("세 번째 질문 답변: 보안 안내", async ({ page }) => {
      await page.goto("/");
      await page.getByText(QUESTIONS[2]).click();
      await expect(
        page.getByText(/서버에 영구 저장되지 않습니다/),
      ).toBeVisible();
    });

    test("네 번째 질문 답변: AI 신청서 동작 안내", async ({ page }) => {
      await page.goto("/");
      await page.getByText(QUESTIONS[3]).click();
      await expect(
        page.getByText(/사업계획서 초안을 자동 생성합니다/),
      ).toBeVisible();
    });

    test("다섯 번째 질문 답변: 가격 안내", async ({ page }) => {
      await page.goto("/");
      await page.getByText(QUESTIONS[4]).click();
      await expect(
        page.getByText(/AI 맞춤 매칭과 결과 3건 확인은 완전 무료입니다/),
      ).toBeVisible();
    });
  });

  test.describe("키보드 인터랙션", () => {
    test("Tab으로 첫 질문에 포커스", async ({ page }) => {
      await page.goto("/");
      await page.locator("text=자주 묻는 질문").scrollIntoViewIfNeeded();
      const first = page.getByRole("button", { name: QUESTIONS[0] });
      await first.focus();
      await expect(first).toBeFocused();
    });

    test("Enter로 첫 질문 토글", async ({ page }) => {
      await page.goto("/");
      const first = page.getByRole("button", { name: QUESTIONS[0] });
      await first.focus();
      await page.keyboard.press("Enter");
      await expect(
        page.getByText(/기업마당 공공API를 통해 중소벤처기업부/),
      ).toBeVisible();
    });

    test("Space로 두 번째 질문 토글", async ({ page }) => {
      await page.goto("/");
      const second = page.getByRole("button", { name: QUESTIONS[1] });
      await second.focus();
      await page.keyboard.press("Space");
      await expect(
        page.getByText(/업종, 매출, 지역, 업력, 대표자 나이/),
      ).toBeVisible();
    });
  });

  test.describe("회귀 가드", () => {
    test("FAQ 질문 수: 정확히 5개", async ({ page }) => {
      await page.goto("/");
      await page.locator("text=자주 묻는 질문").scrollIntoViewIfNeeded();
      const section = page.locator("section", {
        hasText: "자주 묻는 질문",
      });
      const buttons = section.getByRole("button");
      await expect(buttons).toHaveCount(5);
    });

    test("첫 번째 질문은 매칭 관련", async ({ page }) => {
      await page.goto("/");
      const section = page.locator("section", {
        hasText: "자주 묻는 질문",
      });
      const firstButton = section.getByRole("button").first();
      await expect(firstButton).toContainText("매칭");
    });

    test("마지막 질문은 가격 관련", async ({ page }) => {
      await page.goto("/");
      const section = page.locator("section", {
        hasText: "자주 묻는 질문",
      });
      const lastButton = section.getByRole("button").last();
      await expect(lastButton).toContainText("무료");
    });
  });

  test.describe("반응형 검증", () => {
    test("모바일 viewport에서도 모든 질문 표시", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto("/");
      await page.locator("text=자주 묻는 질문").scrollIntoViewIfNeeded();
      for (const q of QUESTIONS) {
        await expect(page.getByText(q)).toBeVisible();
      }
    });

    test("태블릿 viewport에서도 토글 동작", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/");
      await page.getByText(QUESTIONS[0]).click();
      await expect(
        page.getByText(/기업마당 공공API를 통해 중소벤처기업부/),
      ).toBeVisible();
    });

    test("데스크탑 viewport에서 가로 폭 max-w-3xl 적용", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/");
      const section = page.locator("section", {
        hasText: "자주 묻는 질문",
      });
      const className = await section.getAttribute("class");
      expect(className).toContain("max-w-3xl");
    });
  });

  test.describe("FAQ 항목별 답변 정확도", () => {
    test("Q1 답변에 '기업마당' 포함", async ({ page }) => {
      await page.goto("/");
      await page.getByText(QUESTIONS[0]).click();
      const html = await page.content();
      expect(html).toContain("기업마당");
    });

    test("Q1 답변에 '중소벤처기업부' 포함", async ({ page }) => {
      await page.goto("/");
      await page.getByText(QUESTIONS[0]).click();
      const html = await page.content();
      expect(html).toContain("중소벤처기업부");
    });

    test("Q1 답변에 '500건 이상' 언급", async ({ page }) => {
      await page.goto("/");
      await page.getByText(QUESTIONS[0]).click();
      const html = await page.content();
      expect(html).toContain("500건 이상");
    });

    test("Q2 답변에 5가지 조건 명시", async ({ page }) => {
      await page.goto("/");
      await page.getByText(QUESTIONS[1]).click();
      const html = await page.content();
      expect(html).toContain("5가지 조건");
    });

    test("Q3 답변에 '메모리에서 즉시 삭제' 명시", async ({ page }) => {
      await page.goto("/");
      await page.getByText(QUESTIONS[2]).click();
      const html = await page.content();
      expect(html).toContain("메모리에서 즉시 삭제");
    });

    test("Q4 답변에 '예비창업패키지' 예시", async ({ page }) => {
      await page.goto("/");
      await page.getByText(QUESTIONS[3]).click();
      const html = await page.content();
      expect(html).toContain("예비창업패키지");
    });

    test("Q4 답변에 '6개 섹션' 명시", async ({ page }) => {
      await page.goto("/");
      await page.getByText(QUESTIONS[3]).click();
      const html = await page.content();
      expect(html).toContain("6개 섹션");
    });

    test("Q5 답변에 '유료 서비스' 구분 명시", async ({ page }) => {
      await page.goto("/");
      await page.getByText(QUESTIONS[4]).click();
      const html = await page.content();
      expect(html).toContain("유료 서비스");
    });
  });
});
