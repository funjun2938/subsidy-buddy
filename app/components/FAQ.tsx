"use client";

import { useState } from "react";

const faqs = [
  {
    q: "어떤 지원사업을 매칭해주나요?",
    a: "기업마당 공공API를 통해 중소벤처기업부, 소상공인시장진흥공단 등 정부 기관의 지원사업을 실시간으로 수집합니다. 현재 500건 이상의 지원사업을 분석하고 있습니다.",
  },
  {
    q: "AI 매칭은 정확한가요?",
    a: "AI 매칭은 업종, 매출, 지역, 업력, 대표자 나이 5가지 조건을 기반으로 분석합니다. 높음/보통/낮음 3단계로 적합도를 표시하며, 참고용으로 활용하시고 최종 자격 요건은 공고 원문을 확인해주세요.",
  },
  {
    q: "사업자등록증을 업로드하면 안전한가요?",
    a: "업로드된 문서는 AI 분석을 위해서만 사용되며, 서버에 영구 저장되지 않습니다. 분석이 완료되면 메모리에서 즉시 삭제됩니다.",
  },
  {
    q: "AI 신청서 생성은 어떻게 작동하나요?",
    a: "지원사업별 공식 양식(예비창업패키지, 초기창업패키지 등)에 맞춰 사업계획서 초안을 자동 생성합니다. 사업 정보를 입력하면 AI가 6개 섹션으로 구성된 문서를 작성하며, 필수 포함 항목 체크리스트도 제공합니다.",
  },
  {
    q: "무료로 이용할 수 있나요?",
    a: "AI 맞춤 매칭과 결과 3건 확인은 완전 무료입니다. 사업자등록증 AI 분석도 무료로 제공됩니다. AI 신청서 생성과 전문가 매칭은 유료 서비스입니다.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="max-w-3xl mx-auto px-5 py-20">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-black mb-3">자주 묻는 질문</h2>
        <p className="text-gray-500 text-sm">
          서비스 이용에 대해 궁금한 점을 확인하세요
        </p>
      </div>
      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className="glass rounded-2xl overflow-hidden transition-all"
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition"
            >
              <span className="font-semibold text-sm pr-4">{faq.q}</span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`text-gray-500 flex-shrink-0 transition-transform duration-200 ${
                  open === i ? "rotate-180" : ""
                }`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {open === i && (
              <div className="px-5 pb-5 text-sm text-gray-400 leading-relaxed">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
