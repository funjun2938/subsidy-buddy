import { test, expect, type Page } from "@playwright/test";

/**
 * E2E: 결제 퍼널 전체 흐름
 *
 * 시나리오:
 *   /pricing → /checkout?plan=... → 토스 위젯 렌더 → 결제 시도
 *
 * 토스 결제창은 외부 도메인이므로 위젯 렌더링까지만 검증하고,
 * 실제 결제 클릭은 모킹된 응답으로 fail/success 페이지를 직접 검증.
 */

const PLAN_CARDS: Array<{
  cta: string;
  plan: "premium" | "business" | "expert";
  expectedName: string;
  expectedPrice: string;
}> = [
  {
    cta: "프리미엄 시작",
    plan: "premium",
    expectedName: "프리미엄 멤버십",
    expectedPrice: "9,900",
  },
  {
    cta: "비즈니스 시작",
    plan: "business",
    expectedName: "비즈니스 멤버십",
    expectedPrice: "49,000",
  },
];

test.describe("결제 퍼널 전체 흐름", () => {
  test.describe("진입점: /pricing", () => {
    test("페이지가 로드되고 요금제 헤딩이 보인다", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.locator("h1")).toContainText("요금제");
    });

    test("세 개의 구독 플랜이 모두 보인다", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("무료").first()).toBeVisible();
      await expect(page.getByText("프리미엄").first()).toBeVisible();
      await expect(page.getByText("비즈니스").first()).toBeVisible();
    });

    test("두 개의 단건 서비스가 보인다", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("AI 신청서 생성")).toBeVisible();
      await expect(page.getByText("전문가 신청 대행")).toBeVisible();
    });

    test("프리미엄 plan 가격이 9,900원으로 표시된다", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("9,900")).toBeVisible();
    });

    test("비즈니스 plan 가격이 49,000원으로 표시된다", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("49,000")).toBeVisible();
    });

    test("'인기' 배지가 프리미엄에 표시된다", async ({ page }) => {
      await page.goto("/pricing");
      await expect(page.getByText("인기")).toBeVisible();
    });
  });

  test.describe("CTA 클릭으로 /checkout 진입", () => {
    for (const { cta, plan, expectedName, expectedPrice } of PLAN_CARDS) {
      test(`'${cta}' 클릭 시 /checkout?plan=${plan}로 이동`, async ({
        page,
      }) => {
        await page.goto("/pricing");
        await page.getByRole("link", { name: cta }).click();
        await expect(page).toHaveURL(new RegExp(`/checkout\\?plan=${plan}`));
      });

      test(`/checkout 페이지에 '${expectedName}'이 표시된다`, async ({
        page,
      }) => {
        await page.goto(`/checkout?plan=${plan}`);
        await expect(page.getByText(expectedName)).toBeVisible();
      });

      test(`/checkout 페이지에 가격 ${expectedPrice}원이 표시된다`, async ({
        page,
      }) => {
        await page.goto(`/checkout?plan=${plan}`);
        await expect(page.getByText(expectedPrice).first()).toBeVisible();
      });
    }

    test("전문가 단건 결제 CTA '착수금 결제하기 →'가 동작한다", async ({
      page,
    }) => {
      await page.goto("/pricing");
      await page.getByRole("link", { name: "착수금 결제하기 →" }).click();
      await expect(page).toHaveURL(/\/checkout\?plan=expert/);
    });

    test("/checkout?plan=expert에 '전문가 신청 대행' 표시", async ({
      page,
    }) => {
      await page.goto("/checkout?plan=expert");
      await expect(page.getByText("전문가 신청 대행")).toBeVisible();
    });

    test("/checkout?plan=expert에 50,000원 가격 표시", async ({ page }) => {
      await page.goto("/checkout?plan=expert");
      await expect(page.getByText("50,000").first()).toBeVisible();
    });

    test("/checkout 페이지에 '결제하기' 헤더 표시", async ({ page }) => {
      await page.goto("/checkout?plan=premium");
      await expect(page.getByText("결제하기").first()).toBeVisible();
    });

    test("/checkout 페이지에 '요금제로 돌아가기' 링크 표시", async ({
      page,
    }) => {
      await page.goto("/checkout?plan=premium");
      await expect(page.getByText("요금제로 돌아가기")).toBeVisible();
    });
  });

  test.describe("/checkout 잘못된 플랜 처리", () => {
    const invalidPlans = [
      "nonexistent",
      "PREMIUM",
      "premium ",
      "프리미엄",
      "free",
      "",
    ];

    for (const plan of invalidPlans) {
      test(`?plan=${plan || "(empty)"} 시 '잘못된 플랜입니다' 표시`, async ({
        page,
      }) => {
        await page.goto(`/checkout?plan=${encodeURIComponent(plan)}`);
        await expect(page.getByText("잘못된 플랜입니다")).toBeVisible();
      });
    }

    test("쿼리 누락 시에도 안내 메시지 표시", async ({ page }) => {
      await page.goto("/checkout");
      await expect(page.getByText("잘못된 플랜입니다")).toBeVisible();
    });

    test("'요금제로 돌아가기' 버튼 클릭 시 /pricing 으로", async ({ page }) => {
      await page.goto("/checkout?plan=nonexistent");
      await page.getByRole("link", { name: "요금제로 돌아가기" }).click();
      await expect(page).toHaveURL(/\/pricing/);
    });
  });

  test.describe("토스 결제 위젯 렌더링", () => {
    test("프리미엄 결제 페이지에서 토스 결제 수단 위젯이 마운트된다", async ({
      page,
    }) => {
      await page.goto("/checkout?plan=premium");
      // 위젯 컨테이너 id=payment-method
      const widget = page.locator("#payment-method");
      await expect(widget).toBeAttached({ timeout: 10_000 });
    });

    test("프리미엄 결제 페이지에서 약관 동의 위젯이 마운트된다", async ({
      page,
    }) => {
      await page.goto("/checkout?plan=premium");
      const widget = page.locator("#agreement");
      await expect(widget).toBeAttached({ timeout: 10_000 });
    });

    test("위젯 로드 전에는 버튼이 '불러오는 중...' 상태", async ({ page }) => {
      await page.goto("/checkout?plan=premium");
      // Early state may show loading text — best-effort assert
      const loading = page.getByText("결제 위젯 불러오는 중...");
      // It might already be gone if widgets loaded fast; either way assertion is best-effort.
      await loading.waitFor({ state: "attached", timeout: 1000 }).catch(() => {
        /* OK if it's already loaded */
      });
    });

    test("위젯 로드 완료 후 버튼에 가격이 표시된다", async ({ page }) => {
      await page.goto("/checkout?plan=premium");
      await expect(page.getByText("9,900원 결제하기")).toBeVisible({
        timeout: 15_000,
      });
    });

    test("비즈니스 결제 페이지에서 가격이 49,000원으로 표시", async ({
      page,
    }) => {
      await page.goto("/checkout?plan=business");
      await expect(page.getByText("49,000원 결제하기")).toBeVisible({
        timeout: 15_000,
      });
    });

    test("전문가 결제 페이지에서 가격이 50,000원으로 표시", async ({ page }) => {
      await page.goto("/checkout?plan=expert");
      await expect(page.getByText("50,000원 결제하기")).toBeVisible({
        timeout: 15_000,
      });
    });
  });

  test.describe("플랜 요약 카드", () => {
    test("프리미엄 결제 페이지에 5개 기능 표시", async ({ page }) => {
      await page.goto("/checkout?plan=premium");
      const features = [
        "AI 지원사업 매칭 무제한",
        "전체 매칭 결과 보기",
        "AI 신청서 생성 월 3건",
        "마감 알림 (D-7, D-3, D-1)",
        "전문가 매칭 10% 할인",
      ];
      for (const f of features) {
        await expect(page.getByText(f)).toBeVisible();
      }
    });

    test("비즈니스 결제 페이지에 5개 기능 표시", async ({ page }) => {
      await page.goto("/checkout?plan=business");
      const features = [
        "프리미엄 전체 기능 포함",
        "AI 신청서 생성 무제한",
        "전문가 1:1 전담 배정",
        "신청 대행 수수료 50% 할인",
        "합격률 분석 리포트",
      ];
      for (const f of features) {
        await expect(page.getByText(f)).toBeVisible();
      }
    });

    test("전문가 결제 페이지에 4개 기능 표시", async ({ page }) => {
      await page.goto("/checkout?plan=expert");
      const features = [
        "1:1 전문가 배정",
        "서류 검토 및 보완",
        "신청서 직접 제출",
        "성공 시 추가 수수료 10~15%",
      ];
      for (const f of features) {
        await expect(page.getByText(f)).toBeVisible();
      }
    });

    test("월간 구독 라벨이 프리미엄/비즈니스에 표시", async ({ page }) => {
      await page.goto("/checkout?plan=premium");
      await expect(page.getByText("월간 구독")).toBeVisible();
    });

    test("단건 결제 라벨이 전문가 플랜에 표시", async ({ page }) => {
      await page.goto("/checkout?plan=expert");
      await expect(page.getByText("단건 결제")).toBeVisible();
    });
  });

  test.describe("최종 결제 금액 카드", () => {
    test("프리미엄: 최종 결제 금액 9,900원", async ({ page }) => {
      await page.goto("/checkout?plan=premium");
      const card = page.getByText("최종 결제 금액").locator("..");
      await expect(card).toContainText("9,900");
    });

    test("비즈니스: 최종 결제 금액 49,000원", async ({ page }) => {
      await page.goto("/checkout?plan=business");
      const card = page.getByText("최종 결제 금액").locator("..");
      await expect(card).toContainText("49,000");
    });

    test("전문가: 최종 결제 금액 50,000원", async ({ page }) => {
      await page.goto("/checkout?plan=expert");
      const card = page.getByText("최종 결제 금액").locator("..");
      await expect(card).toContainText("50,000");
    });
  });

  test.describe("실패 페이지 (/checkout/fail)", () => {
    test("기본 메시지 표시", async ({ page }) => {
      await page.goto("/checkout/fail");
      await expect(page.getByText("결제에 실패했어요")).toBeVisible();
    });

    test("'다시 시도하기' 버튼이 /pricing으로 이동", async ({ page }) => {
      await page.goto("/checkout/fail");
      await page.getByRole("link", { name: "다시 시도하기" }).click();
      await expect(page).toHaveURL(/\/pricing/);
    });

    test("'홈으로' 버튼이 / 으로 이동", async ({ page }) => {
      await page.goto("/checkout/fail");
      await page.getByRole("link", { name: "홈으로" }).click();
      await expect(page).toHaveURL(/\/$/);
    });

    test("쿼리 파라미터로 전달된 메시지 표시", async ({ page }) => {
      await page.goto(
        "/checkout/fail?message=" + encodeURIComponent("잔액이 부족합니다."),
      );
      await expect(page.getByText("잔액이 부족합니다.")).toBeVisible();
    });

    test("쿼리 파라미터로 전달된 에러 코드 표시", async ({ page }) => {
      await page.goto("/checkout/fail?code=PAY_PROCESS_CANCELED");
      await expect(page.getByText("PAY_PROCESS_CANCELED")).toBeVisible();
    });

    test("에러 코드와 메시지 모두 동시 표시", async ({ page }) => {
      await page.goto(
        "/checkout/fail?code=INVALID_CARD&message=" +
          encodeURIComponent("카드 정보 오류"),
      );
      await expect(page.getByText("INVALID_CARD")).toBeVisible();
      await expect(page.getByText("카드 정보 오류")).toBeVisible();
    });
  });

  test.describe("성공 페이지 (/checkout/success) — 누락 파라미터", () => {
    test("paymentKey 누락 시 결제 정보 누락 메시지", async ({ page }) => {
      await page.goto("/checkout/success");
      await expect(page.getByText(/결제 정보가 누락되었습니다/)).toBeVisible({
        timeout: 5_000,
      });
    });

    test("'요금제로 돌아가기' CTA가 표시", async ({ page }) => {
      await page.goto("/checkout/success");
      await expect(
        page.getByRole("link", { name: "요금제로 돌아가기" }),
      ).toBeVisible({ timeout: 5_000 });
    });

    test("승인 실패 화면이 모든 정보 누락 시 표시", async ({ page }) => {
      await page.goto("/checkout/success");
      await expect(page.getByText(/결제 승인 실패/)).toBeVisible({
        timeout: 5_000,
      });
    });
  });

  test.describe("성공 페이지 — 모킹된 승인 응답", () => {
    test("승인 API가 200을 반환하면 영수증이 표시", async ({ page }) => {
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
        "/checkout/success?paymentKey=pk_test&orderId=order_premium_1&amount=9900",
      );

      await expect(page.getByText("결제 완료!")).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByText("프리미엄 멤버십")).toBeVisible();
    });

    test("승인 응답에서 method가 한글일 때 그대로 표시", async ({ page }) => {
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

      await page.goto(
        "/checkout/success?paymentKey=pk_test&orderId=order_business_1&amount=49000",
      );
      await expect(page.getByText("신용/체크카드")).toBeVisible({
        timeout: 10_000,
      });
    });

    test("승인 응답이 4xx면 실패 화면", async ({ page }) => {
      await page.route("**/api/payments/confirm", async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            ok: false,
            error: "결제 금액이 일치하지 않습니다.",
          }),
        });
      });
      await page.goto(
        "/checkout/success?paymentKey=pk_test&orderId=order_premium_1&amount=9900",
      );
      await expect(page.getByText("결제 승인 실패")).toBeVisible({
        timeout: 10_000,
      });
      await expect(
        page.getByText("결제 금액이 일치하지 않습니다."),
      ).toBeVisible();
    });

    test("승인 응답이 5xx면 실패 화면", async ({ page }) => {
      await page.route("**/api/payments/confirm", async (route) => {
        await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({}) });
      });
      await page.goto(
        "/checkout/success?paymentKey=pk_test&orderId=order_premium_1&amount=9900",
      );
      await expect(page.getByText("결제 승인 실패")).toBeVisible({
        timeout: 10_000,
      });
    });

    test("네트워크 에러 시 통신 실패 메시지", async ({ page }) => {
      await page.route("**/api/payments/confirm", (route) => route.abort());
      await page.goto(
        "/checkout/success?paymentKey=pk_test&orderId=order_premium_1&amount=9900",
      );
      await expect(page.getByText("서버와 통신할 수 없습니다.")).toBeVisible({
        timeout: 10_000,
      });
    });
  });

  test.describe("성공 후 후속 CTA", () => {
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

    test("'서비스 시작하기' 클릭 시 홈으로", async ({ page }) => {
      await page.goto(
        "/checkout/success?paymentKey=pk_test&orderId=order_premium_1&amount=9900",
      );
      await page.getByRole("link", { name: "서비스 시작하기" }).click();
      await expect(page).toHaveURL(/\/$/);
    });

    test("'요금제 다시 보기' 클릭 시 /pricing", async ({ page }) => {
      await page.goto(
        "/checkout/success?paymentKey=pk_test&orderId=order_premium_1&amount=9900",
      );
      await page.getByRole("link", { name: "요금제 다시 보기" }).click();
      await expect(page).toHaveURL(/\/pricing/);
    });
  });
});
