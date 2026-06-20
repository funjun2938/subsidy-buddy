"use client";
import { useEffect, useState } from "react";
import { GrantAttachmentPicker } from "./GrantAttachmentPicker";

export function StudioEntry({ onReady }: { onReady: (file: File, bizInfo: string, grantTitle: string) => void }) {
  const [bizInfo, setBizInfo] = useState("");
  const [grantTitle, setGrantTitle] = useState("");
  const [mode, setMode] = useState<"upload" | "grant">("upload");
  const [initialPblancId, setInitialPblancId] = useState("");

  // 공고 화면에서 넘어온 경우: URL 쿼리(grantTitle/pblancId/bizInfo/bizType/keywords)를 읽어
  // 업로드했던 사업정보와 해당 공고를 자동으로 끌어온다. (클라에서만 읽어 hydration 안전)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const bi = sp.get("bizInfo") || "";
    const bt = sp.get("bizType") || "";
    const kw = (sp.get("keywords") || "").split(",").map((s) => s.trim()).filter(Boolean);
    const gt = sp.get("grantTitle") || "";
    const pid = sp.get("pblancId") || "";
    const composed = [bi, bt && `업종: ${bt}`, kw.length ? `키워드: ${kw.join(", ")}` : ""].filter(Boolean).join("\n");
    if (composed) setBizInfo(composed);
    if (gt) setGrantTitle(gt);
    if (pid) { setInitialPblancId(pid); setMode("grant"); }
  }, []);

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && /\.hwpx?$/i.test(f.name)) onReady(f, bizInfo, grantTitle);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-4">
      <h1 className="text-lg md:text-xl font-bold">신청서 작성 스튜디오</h1>

      <textarea value={bizInfo} onChange={(e) => setBizInfo(e.target.value)} rows={5}
        placeholder="사업 정보(기업명/대표자/주소/사업개요 등) — AI가 이걸 보고 칸을 채웁니다"
        className="w-full border rounded-lg px-3 py-2 text-base md:text-sm" />

      <div className="flex gap-2 text-sm">
        <button type="button" onClick={() => setMode("upload")}
          className={`flex-1 px-3 py-2 rounded-lg border font-medium transition ${
            mode === "upload" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
          }`}>
          📤 양식 직접 업로드
        </button>
        <button type="button" onClick={() => setMode("grant")}
          className={`flex-1 px-3 py-2 rounded-lg border font-medium transition ${
            mode === "grant" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
          }`}>
          🔎 공고에서 첨부 불러오기
        </button>
      </div>

      {mode === "upload" ? (
        <>
          <input value={grantTitle} onChange={(e) => setGrantTitle(e.target.value)} placeholder="지원사업명(선택)"
            className="w-full border rounded-lg px-3 py-2 text-base md:text-sm" />
          <label className="block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer text-sm text-gray-600 hover:border-blue-400">
            📤 신청서 양식 업로드 (.hwp / .hwpx)
            <input type="file" accept=".hwp,.hwpx" onChange={onUpload} className="hidden" />
          </label>
        </>
      ) : (
        <GrantAttachmentPicker onPick={(file, gt) => onReady(file, bizInfo, gt)}
          initialPblancId={initialPblancId} initialGrantTitle={grantTitle} />
      )}
    </div>
  );
}
