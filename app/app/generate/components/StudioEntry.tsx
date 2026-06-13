"use client";
import { useState } from "react";

export function StudioEntry({ onReady }: { onReady: (file: File, bizInfo: string, grantTitle: string) => void }) {
  const [bizInfo, setBizInfo] = useState("");
  const [grantTitle, setGrantTitle] = useState("");
  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && /\.hwpx?$/i.test(f.name)) onReady(f, bizInfo, grantTitle);
  };
  return (
    <div className="max-w-2xl mx-auto p-8 space-y-4">
      <h1 className="text-xl font-bold">신청서 작성 스튜디오</h1>
      <input value={grantTitle} onChange={e => setGrantTitle(e.target.value)} placeholder="지원사업명(선택)"
        className="w-full border rounded-lg px-3 py-2 text-sm" />
      <textarea value={bizInfo} onChange={e => setBizInfo(e.target.value)} rows={5}
        placeholder="사업 정보(기업명/대표자/주소/사업개요 등) — AI가 이걸 보고 칸을 채웁니다"
        className="w-full border rounded-lg px-3 py-2 text-sm" />
      <label className="block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer text-sm text-gray-600 hover:border-blue-400">
        📤 신청서 양식 업로드 (.hwp / .hwpx)
        <input type="file" accept=".hwp,.hwpx" onChange={onUpload} className="hidden" />
      </label>
      {/* 후속: 지원사업 선택 → 공고 첨부 자동 로드 UI(기존 page.tsx 이전) */}
    </div>
  );
}
