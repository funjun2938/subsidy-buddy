import { test, expect } from "@playwright/test";

/**
 * E2E: /checkout 페이지의 각 플랜별 데이터 검증
 *
 * 플랜 요약, 가격, 기능, 결제 버튼 텍스트가 일관되게 표시되는지.
 */

test.describe("/checkout 플랜별 데이터 검증", () => {
  test.describe("프리미엄 플랜", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/checkout?plan=premium");
    });

    test("플랜 이름 '프리미엄 멤버십'", async ({ page }) => {
      await expect(page.getByText("프리미엄 멤버십")).toBeVisible();
    });

    test("플랜 설명 표시", async ({ page }) => {
      await expect(
        page.getByText("지원사업을 놓치지 않는 월간 구독 플랜"),
      ).toBeVisible();
    });

    test("플랜 라벨 '월간 구독'", async ({ page }) => {
      await expect(page.getByText("월간 구독")).toBeVisible();
    });

    test("플랜 가격 9,900원", async ({ page }) => {
      await expect(page.getByText("9,900원").first()).toBeVisible();
    });

    test("기능 1: AI 지원사업 매칭 무제한", async ({ page }) => {
      await expect(page.getByText("AI 지원사업 매칭 무제한")).toBeVisible();
    });

    test("기능 2: 전체 매칭 결과 보기", async ({ page }) => {
      await expect(page.getByText("전체 매칭 결과 보기")).toBeVisible();
    });

    test("기능 3: AI 신청서 생성 월 3건", async ({ page }) => {
      await expect(page.getByText("AI 신청서 생성 월 3건")).toBeVisible();
    });

    test("기능 4: 마감 알림 (D-7, D-3, D-1)", async ({ page }) => {
      await expect(page.getByText("마감 알림 (D-7, D-3, D-1)")).toBeVisible();
    });

    test("기능 5: 전문가 매칭 10% 할인", async ({ page }) => {
      await expect(page.getByText("전문가 매칭 10% 할인")).toBeVisible();
    });

    test("결제 버튼 텍스트 '9,900원 결제하기'", async ({ page }) => {
      await expect(page.getByText("9,900원 결제하기")).toBeVisible({
        timeout: 15_000,
      });
    });

    test("최종 결제 금액 카드에 9,900원", async ({ page }) => {
      const card = page.getByText("최종 결제 금액").locator("..");
      await expect(card).toContainText("9,900");
    });
  });

  test.describe("비즈니스 플랜", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/checkout?plan=business");
    });

    test("플랜 이름 '비즈니스 멤버십'", async ({ page }) => {
      await expect(page.getByText("비즈니스 멤버십")).toBeVisible();
    });

    test("플랜 설명 표시", async ({ page }) => {
      await expect(
        page.getByText("신청 대행까지 한번에 해결하는 플랜"),
      ).toBeVisible();
    });

    test("플랜 라벨 '월간 구독'", async ({ page }) => {
      await expect(page.getByText("월간 구독")).toBeVisible();
    });

    test("플랜 가격 49,000원", async ({ page }) => {
      await expect(page.getByText("49,000원").first()).toBeVisible();
    });

    test("기능 1: 프리미엄 전체 기능 포함", async ({ page }) => {
      await expect(page.getByText("프리미엄 전체 기능 포함")).toBeVisible();
    });

    test("기능 2: AI 신청서 생성 무제한", async ({ page }) => {
      await expect(page.getByText("AI 신청서 생성 무제한")).toBeVisible();
    });

    test("기능 3: 전문가 1:1 전담 배정", async ({ page }) => {
      await expect(page.getByText("전문가 1:1 전담 배정")).toBeVisible();
    });

    test("기능 4: 신청 대행 수수료 50% 할인", async ({ page }) => {
      await expect(page.getByText("신청 대행 수수료 50% 할인")).toBeVisible();
    });

    test("기능 5: 합격률 분석 리포트", async ({ page }) => {
      await expect(page.getByText("합격률 분석 리포트")).toBeVisible();
    });

    test("결제 버튼 텍스트 '49,000원 결제하기'", async ({ page }) => {
      await expect(page.getByText("49,000원 결제하기")).toBeVisible({
        timeout: 15_000,
      });
    });

    test("최종 결제 금액 카드에 49,000원", async ({ page }) => {
      const card = page.getByText("최종 결제 금액").locator("..");
      await expect(card).toContainText("49,000");
    });
  });

  test.describe("전문가 단건 결제", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/checkout?plan=expert");
    });

    test("플랜 이름 '전문가 신청 대행'", async ({ page }) => {
      await expect(page.getByText("전문가 신청 대행")).toBeVisible();
    });

    test("플랜 설명 표시", async ({ page }) => {
      await expect(
        page.getByText(/검증된 세무사·변리사·노무사가 직접 대행/),
      ).toBeVisible();
    });

    test("플랜 라벨 '단건 결제'", async ({ page }) => {
      await expect(page.getByText("단건 결제")).toBeVisible();
    });

    test("플랜 가격 50,000원", async ({ page }) => {
      await expect(page.getByText("50,000원").first()).toBeVisible();
    });

    test("기능 1: 1:1 전문가 배정", async ({ page }) => {
      await expect(page.getByText("1:1 전문가 배정")).toBeVisible();
    });

    test("기능 2: 서류 검토 및 보완", async ({ page }) => {
      await expect(page.getByText("서류 검토 및 보완")).toBeVisible();
    });

    test("기능 3: 신청서 직접 제출", async ({ page }) => {
      await expect(page.getByText("신청서 직접 제출")).toBeVisible();
    });

    test("기능 4: 성공 시 추가 수수료 10~15%", async ({ page }) => {
      await expect(page.getByText("성공 시 추가 수수료 10~15%")).toBeVisible();
    });

    test("결제 버튼 텍스트 '50,000원 결제하기'", async ({ page }) => {
      await expect(page.getByText("50,000원 결제하기")).toBeVisible({
        timeout: 15_000,
      });
    });

    test("최종 결제 금액 카드에 50,000원", async ({ page }) => {
      const card = page.getByText("최종 결제 금액").locator("..");
      await expect(card).toContainText("50,000");
    });
  });

  test.describe("플랜 비교", () => {
    test("비즈니스가 프리미엄보다 비싸다", async ({ page }) => {
      await page.goto("/checkout?plan=premium");
      const premiumPrice = await page.getByText("9,900원").first().textContent();
      await page.goto("/checkout?plan=business");
      const businessPrice = await page.getByText("49,000원").first().textContent();
      const p = parseInt((premiumPrice ?? "0").replace(/[^0-9]/g, ""), 10);
      const b = parseInt((businessPrice ?? "0").replace(/[^0-9]/g, ""), 10);
      expect(b).toBeGreaterThan(p);
    });

    test("전문가가 프리미엄보다 비싸다 (단건이지만)", async ({ page }) => {
      await page.goto("/checkout?plan=premium");
      const premiumPrice = await page.getByText("9,900원").first().textContent();
      await page.goto("/checkout?plan=expert");
      const expertPrice = await page.getByText("50,000원").first().textContent();
      const p = parseInt((premiumPrice ?? "0").replace(/[^0-9]/g, ""), 10);
      const e = parseInt((expertPrice ?? "0").replace(/[^0-9]/g, ""), 10);
      expect(e).toBeGreaterThan(p);
    });
  });
});
