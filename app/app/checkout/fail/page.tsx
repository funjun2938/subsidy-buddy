"use client";

import { use } from "react";
import Link from "next/link";

type SearchParams = Promise<{
  code?: string;
  message?: string;
  orderId?: string;
}>;

export default function FailPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { code, message } = use(searchParams);

  return (
    <div className="max-w-md mx-auto px-5 py-24 text-center">
      <div className="text-6xl mb-6">😔</div>
      <h1 className="text-2xl font-black mb-3">결제에 실패했어요</h1>
      <p className="text-sm text-gray-400 mb-8">
        {message ?? "결제 진행 중 문제가 발생했습니다."}
      </p>

      {code && (
        <div className="glass rounded-2xl p-4 mb-8 text-left text-xs">
          <div className="text-gray-500 mb-1">에러 코드</div>
          <div className="text-gray-300 font-mono">{code}</div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Link
          href="/pricing"
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white text-sm font-semibold hover:from-cyan-400 hover:to-violet-400 transition shadow-lg shadow-cyan-500/20"
        >
          다시 시도하기
        </Link>
        <Link
          href="/"
          className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm transition"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}
