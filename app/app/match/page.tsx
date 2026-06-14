import ConditionForm from "@/components/ConditionForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "지원금 찾기 — 보조금매칭AI",
  description: "사업 정보를 입력하면 AI가 30초 안에 맞춤 정부 지원사업을 찾아드립니다.",
};

export default function MatchPage() {
  return (
    <div className="noise min-h-[70vh]">
      <section className="relative max-w-2xl mx-auto px-5 pt-12 sm:pt-16 pb-24">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2 text-[var(--foreground)]">🎯 내 지원금 찾기</h1>
          <p className="text-[var(--muted)] text-sm">사업 정보를 입력하면 30초 안에 결과를 드려요 · 무료</p>
        </div>
        <div className="glass rounded-3xl p-7 sm:p-9 shadow-2xl shadow-black/10">
          <ConditionForm />
        </div>
      </section>
    </div>
  );
}
