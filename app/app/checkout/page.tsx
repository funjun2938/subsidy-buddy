"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getPlan, generateOrderId } from "@/lib/payment-plans";
import {
  loadTossPayments,
  ANONYMOUS,
  type TossPaymentsWidgets,
} from "@tosspayments/tosspayments-sdk";

// Toss 위젯 전용 테스트 클라이언트 키 (test_gck_*)
const TOSS_CLIENT_KEY = "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";

type SearchParams = Promise<{ plan?: string }>;

export default function CheckoutPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { plan: planId } = use(searchParams);
  const plan = getPlan(planId);

  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);

  useEffect(() => {
    if (!plan) return;
    let cancelled = false;

    (async () => {
      try {
        const toss = await loadTossPayments(TOSS_CLIENT_KEY);
        if (cancelled) return;
        const widgets = toss.widgets({ customerKey: ANONYMOUS });
        await widgets.setAmount({ currency: "KRW", value: plan.price });
        await Promise.all([
          widgets.renderPaymentMethods({
            selector: "#payment-method",
            variantKey: "DEFAULT",
          }),
          widgets.renderAgreement({
            selector: "#agreement",
            variantKey: "AGREEMENT",
          }),
        ]);
        if (cancelled) return;
        widgetsRef.current = widgets;
        setReady(true);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "결제 위젯 로드 실패";
        setError(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [plan]);

  if (!plan) {
    return (
      <div className="max-w-xl mx-auto px-5 py-20 text-center">
        <h1 className="text-2xl font-bold mb-3">잘못된 플랜입니다</h1>
        <p className="text-gray-400 mb-6">올바른 플랜을 선택해주세요.</p>
        <Link
          href="/pricing"
          className="inline-block px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-semibold transition"
        >
          요금제로 돌아가기
        </Link>
      </div>
    );
  }

  const handlePay = async () => {
    if (!widgetsRef.current) return;
    setError(null);
    setSubmitting(true);

    const orderId = generateOrderId(plan.id);
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";

    try {
      await widgetsRef.current.requestPayment({
        orderId,
        orderName: plan.name,
        successUrl: `${origin}/checkout/success`,
        failUrl: `${origin}/checkout/fail`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "결제 요청에 실패했습니다.";
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      <div className="mb-8">
        <Link
          href="/pricing"
          className="text-sm text-gray-500 hover:text-gray-300 transition"
        >
          ← 요금제로 돌아가기
        </Link>
      </div>

      <h1 className="text-3xl font-black mb-2">
        <span className="gradient-text">결제하기</span>
      </h1>
      <p className="text-gray-400 text-sm mb-8">
        선택하신 플랜의 결제 정보를 확인해주세요
      </p>

      {/* Plan Summary */}
      <div className="glass rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">
              {plan.type === "subscription" ? "월간 구독" : "단건 결제"}
            </div>
            <h2 className="text-xl font-bold">{plan.name}</h2>
            <p className="text-sm text-gray-400 mt-1">{plan.description}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black gradient-text">
              {plan.price.toLocaleString()}원
            </div>
            {plan.type === "subscription" && (
              <div className="text-xs text-gray-500">/월</div>
            )}
          </div>
        </div>

        <ul className="space-y-2 mt-5 pt-5 border-t border-white/5">
          {plan.features.map((f) => (
            <li
              key={f}
              className="flex items-start gap-2 text-sm text-gray-300"
            >
              <span className="text-cyan-400 mt-0.5">✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Toss Payment Widget (카드 / 카카오페이 / 토스페이 등) */}
      <div className="mb-3 px-1 text-xs text-gray-500 font-medium">
        결제 수단
      </div>
      <div className="glass rounded-2xl p-3 mb-5 overflow-hidden">
        <div className="toss-widget-frame">
          <div id="payment-method" />
        </div>
      </div>

      {/* Toss Agreement Widget (필수 약관) */}
      <div className="mb-3 px-1 text-xs text-gray-500 font-medium">
        약관 동의
      </div>
      <div className="glass rounded-2xl p-3 mb-6 overflow-hidden">
        <div className="toss-widget-frame">
          <div id="agreement" />
        </div>
      </div>

      {/* Total */}
      <div className="glass rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <span className="font-semibold">최종 결제 금액</span>
          <span className="text-2xl font-black">
            {plan.price.toLocaleString()}원
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">
          {error}
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={!ready || submitting}
        className="w-full py-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-cyan-500 to-violet-500 text-white hover:from-cyan-400 hover:to-violet-400 transition shadow-lg shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {!ready
          ? "결제 위젯 불러오는 중..."
          : submitting
            ? "결제 진행 중..."
            : `${plan.price.toLocaleString()}원 결제하기`}
      </button>

      <p className="text-xs text-gray-600 text-center mt-6 leading-relaxed">
        테스트 결제 환경입니다. 실제 금액은 청구되지 않습니다.
        <br />
        토스페이먼츠를 통해 카드 / 카카오페이 / 네이버페이 등으로 결제할 수 있어요.
      </p>
    </div>
  );
}
