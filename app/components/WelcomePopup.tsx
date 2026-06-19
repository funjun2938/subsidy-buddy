"use client";

import { useEffect, useState } from "react";

export default function WelcomePopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("welcome-seen")) {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    localStorage.setItem("welcome-seen", "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={dismiss}
      />
      <div className="relative glass rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-black/40">
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition"
          aria-label="닫기"
        >
          ✕
        </button>

        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center mb-5 shadow-lg shadow-cyan-500/20">
          <span className="text-white font-black text-xl">R</span>
        </div>

        <h2 className="text-2xl font-black mb-2">
          <span className="gradient-text">리스탠드</span>에 오신 걸 환영합니다
        </h2>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          소상공인을 위한 정부 지원금 — 사업자등록증 한 장이면 AI가 30초 만에 찾아드립니다.
        </p>

        <ul className="space-y-3 mb-7">
          {[
            { icon: "🎯", text: "사업자등록증 또는 간단한 사업 설명만 입력하면 끝" },
            { icon: "🤖", text: "AI가 수백 개 지원사업을 분석해 딱 맞는 것만 추려드립니다" },
            { icon: "📋", text: "자격 요건, 지원 금액, 마감일을 한눈에 확인" },
            { icon: "📝", text: "합격률 높은 신청서 초안도 AI가 작성해드립니다" },
          ].map(({ icon, text }) => (
            <li key={text} className="flex items-start gap-3 text-sm text-gray-300">
              <span className="text-base leading-none mt-0.5">{icon}</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={dismiss}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 text-white font-bold hover:opacity-90 transition"
        >
          지금 바로 시작하기
        </button>
        <p className="text-center text-xs text-gray-600 mt-3">기본 이용은 무료입니다</p>
      </div>
    </div>
  );
}
