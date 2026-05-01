"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { storeFile } from "@/lib/file-store";
import {
  BIZ_TYPES,
  REVENUE_RANGES,
  REGIONS,
  BIZ_AGES,
  CEO_AGES,
} from "@/lib/types";

type Tab = "manual" | "ai";

interface AnalyzedResult {
  bizType: string;
  revenue: string;
  region: string;
  bizAge: string;
  ceoAge: string;
  summary: string;
  keywords: string[];
}

export default function ConditionForm() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("ai");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState<AnalyzedResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState("");
  const [bizDesc, setBizDesc] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [bizType, setBizType] = useState("");
  const [revenue, setRevenue] = useState("");
  const [region, setRegion] = useState("");
  const [bizAge, setBizAge] = useState("");
  const [ceoAge, setCeoAge] = useState("");

  async function handleAnalyze(file?: File) {
    setAnalyzing(true);
    setAnalyzed(null);
    setAnalyzeError("");
    try {
      const fd = new FormData();
      const targetFile = file ?? uploadedFile;
      if (targetFile) {
        fd.append("file", targetFile);
      } else if (bizDesc.trim()) {
        fd.append("text", bizDesc);
      } else {
        setAnalyzing(false);
        return;
      }
      const res = await fetch("/api/analyze-doc", { method: "POST", body: fd });
      const data = await res.json();
      if (data.result) {
        const r = data.result as AnalyzedResult;
        setAnalyzed(r);
        if (r.bizType) setBizType(r.bizType);
        if (r.revenue) setRevenue(r.revenue);
        if (r.region) setRegion(r.region);
        if (r.bizAge) setBizAge(r.bizAge);
        if (r.ceoAge) setCeoAge(r.ceoAge);
      } else {
        setAnalyzeError(data.error || "분석 결과를 가져오지 못했습니다.");
      }
    } catch (e) {
      setAnalyzeError("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
      console.error("[analyze]", e);
    } finally {
      setAnalyzing(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setUploadedFile(file);
      storeFile(file).catch(() => {});
      handleAnalyze(file);
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setFileName(file.name);
      setUploadedFile(file);
      storeFile(file).catch(() => {});
      handleAnalyze(file);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!bizType || !revenue || !region || !bizAge || !ceoAge) return;
    setLoading(true);
    const params = new URLSearchParams({ bizType, revenue, region, bizAge, ceoAge });
    if (analyzed?.summary) params.set("summary", analyzed.summary);
    if (analyzed?.keywords?.length) params.set("keywords", analyzed.keywords.join(","));
    router.push(`/results?${params.toString()}`);
  }

  const selectClass =
    "w-full px-4 py-3 rounded-xl text-sm outline-none transition-all " +
    "bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] " +
    "focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 hover:border-cyan-500/30";

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-6 bg-[var(--tab-bg)]">
        {(["ai", "manual"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
              tab === t
                ? "bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-cyan-500 shadow-lg shadow-cyan-500/10"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {t === "ai" ? "AI 자동 분석" : "직접 입력"}
          </button>
        ))}
      </div>

      {/* AI Tab */}
      {tab === "ai" && (
        <div className="space-y-4 mb-6">
          {/* 파일 업로드 */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              dragOver
                ? "border-cyan-400 bg-cyan-500/5"
                : "border-[var(--input-border)] hover:border-cyan-500/40 bg-[var(--input-bg)]"
            }`}
          >
            <input ref={fileRef} type="file" accept="image/*,.txt,.pdf,.doc,.docx,.hwp" onChange={handleFileChange} className="hidden" />
            <div className="text-3xl mb-3">{fileName ? "📄" : "📎"}</div>
            {fileName ? (
              <p className="text-sm text-cyan-500 font-medium">{fileName}</p>
            ) : (
              <>
                <p className="text-sm font-medium mb-1 text-[var(--foreground)]">
                  사업자등록증 또는 사업 관련 서류를 올려주세요
                </p>
                <p className="text-xs text-[var(--muted)]">
                  이미지(JPG, PNG), 텍스트 파일 지원 | 드래그하거나 클릭
                </p>
              </>
            )}
          </div>

          {/* 텍스트 입력 */}
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px flex-1 bg-[var(--separator)]" />
              <span className="text-xs text-[var(--muted)]">또는 사업 설명 입력</span>
              <div className="h-px flex-1 bg-[var(--separator)]" />
            </div>
            <textarea
              value={bizDesc}
              onChange={(e) => setBizDesc(e.target.value)}
              placeholder="예: 서울에서 IT 스타트업을 운영하고 있습니다. 2024년에 창업했고, 앱 개발 서비스를 하고 있습니다. 매출은 아직 1억 미만이고, 대표자 나이는 32살입니다."
              rows={4}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all resize-none bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
            />

            {/* 분석 결과 텍스트박스 */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--muted)]">AI 분석 결과</span>
                {analyzing && (
                  <span className="text-xs text-cyan-500 flex items-center gap-1">
                    <span className="w-2 h-2 border border-cyan-500 border-t-transparent rounded-full animate-spin inline-block" />
                    분석 중...
                  </span>
                )}
                {analyzed && !analyzing && (
                  <span className="text-xs text-emerald-500">✓ 완료</span>
                )}
              </div>
              <textarea
                readOnly
                value={analyzed?.summary ?? ""}
                placeholder="파일 또는 사업 설명을 입력하고 분석하면 요약 결과가 여기에 표시됩니다"
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none transition-all bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] placeholder:text-[var(--muted)] cursor-default opacity-80"
              />
              {analyzed?.keywords && analyzed.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {analyzed.keywords.map((kw) => (
                    <span key={kw} className="text-xs px-2 py-0.5 rounded-md bg-violet-500/10 text-[var(--accent2)] border border-violet-500/20">
                      {kw}
                    </span>
                  ))}
                </div>
              )}
              {analyzeError && (
                <p className="mt-2 text-xs text-red-400">{analyzeError}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleAnalyze()}
            disabled={analyzing || (!bizDesc.trim() && !fileName)}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-violet-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-violet-500 transition disabled:from-slate-300 disabled:to-slate-400 disabled:text-slate-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {analyzing ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />AI가 분석하고 있습니다...</>
            ) : analyzed ? "다시 분석하기" : "AI로 사업 정보 분석하기"}
          </button>
        </div>
      )}

      {/* 수동 입력 / AI 결과 확인 */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {(tab === "manual" || analyzed) && (
          <>
            {analyzed && tab === "ai" && (
              <p className="text-xs text-[var(--muted)] mb-2">AI가 추출한 정보를 확인하고 필요하면 수정하세요</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">업종</label>
                <select value={bizType} onChange={(e) => setBizType(e.target.value)} required className={selectClass}>
                  <option value="">선택</option>
                  {BIZ_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1">연 매출</label>
                <select value={revenue} onChange={(e) => setRevenue(e.target.value)} required className={selectClass}>
                  <option value="">선택</option>
                  {REVENUE_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "지역", val: region, set: setRegion, opts: REGIONS },
                { label: "업력", val: bizAge, set: setBizAge, opts: BIZ_AGES },
                { label: "대표자 나이", val: ceoAge, set: setCeoAge, opts: CEO_AGES },
              ].map(({ label, val, set, opts }) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-[var(--muted)] mb-1">{label}</label>
                  <select value={val} onChange={(e) => set(e.target.value)} required className={selectClass}>
                    <option value="">선택</option>
                    {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={loading || !bizType || !revenue || !region || !bizAge || !ceoAge}
          className="w-full py-4 bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-bold text-base rounded-xl hover:from-cyan-400 hover:to-violet-400 transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 disabled:from-slate-300 disabled:to-slate-400 disabled:text-slate-100 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              AI가 지원사업을 매칭하고 있습니다...
            </span>
          ) : "맞춤 지원금 찾기"}
        </button>
      </form>
    </div>
  );
}
