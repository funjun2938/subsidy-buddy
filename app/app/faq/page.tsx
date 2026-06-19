import FAQ from "@/components/FAQ";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "자주 묻는 질문 — 리스탠드",
  description: "리스탠드 서비스 이용에 대해 자주 묻는 질문을 확인하세요.",
};

export default function FaqPage() {
  return (
    <div className="noise min-h-[70vh] pt-6">
      <FAQ />
    </div>
  );
}
