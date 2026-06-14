"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { activatePro } from "@/lib/docTokens";

type SearchParams = Promise<{
  paymentKey?: string;
  orderId?: string;
  amount?: string;
}>;

type ConfirmResult =
  | {
      ok: true;
      orderName: string;
      method: string;
      approvedAt: string;
      totalAmount: number;
    }
  | { ok: false; error: string };

export default function SuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = use(searchParams);
  const hasParams = Boolean(
    params.paymentKey && params.orderId && params.amount,
  );

  const [state, setState] = useState<"loading" | "success" | "error">(
    hasParams ? "loading" : "error",
  );
  const [result, setResult] = useState<ConfirmResult | null>(
    hasParams ? null : { ok: false, error: "결제 정보가 누락되었습니다." },
  );

  useEffect(() => {
    const { paymentKey, orderId, amount } = params;
    if (!paymentKey || !orderId || !amount) return;

    fetch("/api/payments/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount: Number(amount),
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setState("error");
          setResult({ ok: false, error: data.error ?? "결제 승인 실패" });
          return;
        }
        setState("success");
        setResult(data);
        activatePro(); // 결제 완료 → AI 문서생성 PRO 활성화(무제한)
      })
      .catch(() => {
        setState("error");
        setResult({ ok: false, error: "서버와 통신할 수 없습니다." });
      });
  }, [params]);

  if (state === "loading") {
    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center">
        <div className="inline-block w-10 h-10 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin mb-6" />
        <h1 className="text-xl font-bold mb-2">결제 승인 중...</h1>
        <p className="text-sm text-gray-400">
          잠시만 기다려주세요. 결제를 확인하고 있습니다.
        </p>
      </div>
    );
  }

  if (state === "error" || !result || !result.ok) {
    const msg =
      result && !result.ok ? result.error : "알 수 없는 오류가 발생했습니다.";
    return (
      <div className="max-w-md mx-auto px-5 py-24 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold mb-2">결제 승인 실패</h1>
        <p className="text-sm text-gray-400 mb-8">{msg}</p>
        <Link
          href="/pricing"
          className="inline-block px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-semibold transition"
        >
          요금제로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-5 py-16 text-center">
      <div className="text-6xl mb-6 float">🎉</div>
      <h1 className="text-3xl font-black mb-3">
        <span className="gradient-text">결제 완료!</span>
      </h1>
      <p className="text-gray-400 text-sm mb-10">
        결제가 정상적으로 처리되었습니다
      </p>

      <div className="glass rounded-2xl p-6 mb-8 text-left space-y-3">
        <Row label="상품" value={result.orderName} />
        <Row
          label="결제 수단"
          value={methodLabel(result.method)}
        />
        <Row
          label="결제 금액"
          value={`${result.totalAmount.toLocaleString()}원`}
        />
        <Row
          label="승인 시각"
          value={new Date(result.approvedAt).toLocaleString("ko-KR")}
        />
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/"
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white text-sm font-semibold hover:from-cyan-400 hover:to-violet-400 transition shadow-lg shadow-cyan-500/20"
        >
          서비스 시작하기
        </Link>
        <Link
          href="/pricing"
          className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm transition"
        >
          요금제 다시 보기
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200 font-medium">{value}</span>
    </div>
  );
}

function methodLabel(m: string): string {
  if (m.includes("카드") || m.toUpperCase() === "CARD") return "신용/체크카드";
  if (m.includes("간편") || m.toUpperCase().includes("EASY")) return "간편결제";
  return m;
}
