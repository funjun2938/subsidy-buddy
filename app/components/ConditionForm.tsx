"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { storeFile } from "@/lib/file-store";
import { recordSearch } from "@/lib/userActivity";
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
  employeeCount?: string;
  ceoGender?: string;
  certifications?: string[];
  summary: string;
  keywords: string[];
}

const EMPLOYEE_COUNTS = ["없음", "1~4명", "5~9명", "10~49명", "50명 이상"] as const;

const CERT_OPTIONS = [
  "벤처기업 인증",
  "이노비즈 인증",
  "수출 기업",
  "특허·IP 보유",
  "여성 대표자",
  "장애인 기업",
] as const;

export default function ConditionForm() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("ai");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState<AnalyzedResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState("");
  const [analyzedSources, setAnalyzedSources] = useState<{
    mainFile?: string;
    extraFile?: string;
    hasDesc: boolean;
    employees?: string;
    gender?: string;
    certs: string[];
  } | null>(null);
  const [bizDesc, setBizDesc] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extraFileName, setExtraFileName] = useState("");
  const [extraFile, setExtraFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const extraFileRef = useRef<HTMLInputElement>(null);

  // 추가 정보
  const [employeeCount, setEmployeeCount] = useState("");
  const [ceoGender, setCeoGender] = useState<"남성" | "여성" | "">("");
  const [certifications, setCertifications] = useState<Set<string>>(new Set());

  const [bizType, setBizType] = useState("");
  const [revenue, setRevenue] = useState("");
  const [region, setRegion] = useState("");
  const [bizAge, setBizAge] = useState("");
  const [ceoAge, setCeoAge] = useState("");

  function toggleCert(cert: string) {
    setCertifications((prev) => {
      const next = new Set(prev);
      if (next.has(cert)) next.delete(cert);
      else next.add(cert);
      return next;
    });
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzed(null);
    setAnalyzeError("");
    setAnalyzedSources({
      mainFile: fileName || undefined,
      extraFile: extraFileName || undefined,
      hasDesc: !!bizDesc.trim(),
      employees: employeeCount || undefined,
      gender: ceoGender || undefined,
      certs: Array.from(certifications),
    });
    try {
      const fd = new FormData();
      if (uploadedFile) fd.append("file", uploadedFile);

      // 추가 정보 조합
      const extraParts: string[] = [];

      if (bizDesc.trim()) {
        extraParts.push(`[추가 사업 설명]\n${bizDesc}`);
      }

      const fieldLines: string[] = [];
      if (employeeCount) fieldLines.push(`상시 직원 수: ${employeeCount}`);
      if (ceoGender) fieldLines.push(`대표자 성별: ${ceoGender}`);
      if (certifications.size > 0) {
        fieldLines.push(`인증·특성: ${Array.from(certifications).join(", ")}`);
      }
      if (fieldLines.length > 0) {
        extraParts.push(`[추가 입력 정보]\n${fieldLines.join("\n")}`);
      }

      if (extraFile) {
        try {
          const text = await extraFile.text();
          extraParts.push(`[추가 서류: ${extraFile.name}]\n${text.slice(0, 2000)}`);
        } catch {}
      }

      if (!uploadedFile && extraParts.length === 0) {
        setAnalyzeError("분석할 내용을 입력하거나 파일을 첨부해주세요.");
        setAnalyzing(false);
        return;
      }

      if (extraParts.length > 0) {
        fd.append("extraText", extraParts.join("\n\n"));
      }

      const res = await fetch("/api/analyze-doc", { method: "POST", body: fd });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setAnalyzeError(e.error || "분석에 실패했습니다. 다시 시도해 주세요.");
        return;
      }
      const data = await res.json();
      if (data.result) {
        const r = data.result as AnalyzedResult;
        setAnalyzed(r);
        if (r.bizType) setBizType(r.bizType);
        if (r.revenue) setRevenue(r.revenue);
        if (r.region) setRegion(r.region);
        if (r.bizAge) setBizAge(r.bizAge);
        if (r.ceoAge) setCeoAge(r.ceoAge);
        // AI가 추론한 값으로 보충 (사용자가 이미 입력한 경우엔 유지)
        if (r.employeeCount && !employeeCount) setEmployeeCount(r.employeeCount);
        if (r.ceoGender && !ceoGender) setCeoGender(r.ceoGender as "남성" | "여성");
        if (r.certifications && r.certifications.length > 0 && certifications.size === 0) {
          setCertifications(new Set(r.certifications));
        }
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
    }
  }

  function handleExtraFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setExtraFileName(file.name);
      setExtraFile(file);
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
    }
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!bizType || !revenue || !region || !bizAge || !ceoAge) return;
    setLoading(true);
    const params = new URLSearchParams({ bizType, revenue, region, bizAge, ceoAge });
    if (analyzed?.summary) params.set("summary", analyzed.summary);
    if (analyzed?.keywords?.length) params.set("keywords", analyzed.keywords.join(","));
    if (employeeCount) params.set("employees", employeeCount);
    if (ceoGender) params.set("ceoGender", ceoGender);
    if (certifications.size > 0) params.set("certifications", Array.from(certifications).join(","));
    recordSearch(`${bizType} · ${region}`, "match");
    router.push(`/results?${params.toString()}`);
  }

  const canAnalyze =
    !analyzing &&
    (!!uploadedFile || !!bizDesc.trim() || !!extraFile || !!employeeCount || certifications.size > 0);

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
          {/* 사업자등록증 업로드 */}
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-2">
              사업자등록증
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                dragOver
                  ? "border-cyan-400 bg-cyan-500/5"
                  : "border-[var(--input-border)] hover:border-cyan-500/40 bg-[var(--input-bg)]"
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.txt,.pdf,.doc,.docx,.hwp"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="text-2xl mb-2">{fileName ? "📄" : "📎"}</div>
              {fileName ? (
                <p className="text-sm text-cyan-500 font-medium">{fileName}</p>
              ) : (
                <>
                  <p className="text-sm font-medium mb-1 text-[var(--foreground)]">
                    사업자등록증을 올려주세요
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    이미지(JPG, PNG), PDF 지원 | 드래그하거나 클릭
                  </p>
                </>
              )}
            </div>
          </div>

          {/* 추가 서류 첨부 */}
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-2">
              추가 서류 첨부{" "}
              <span className="font-normal text-[var(--muted)]">(선택)</span>
            </label>
            <div
              onClick={() => extraFileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[var(--input-border)] bg-[var(--input-bg)] cursor-pointer hover:border-cyan-500/40 transition-all"
            >
              <input
                ref={extraFileRef}
                type="file"
                accept="image/*,.txt,.pdf,.doc,.docx,.hwp"
                onChange={handleExtraFileChange}
                className="hidden"
              />
              <span className="text-base">📎</span>
              <span className="text-sm text-[var(--muted)]">
                {extraFileName ? (
                  <span className="text-cyan-500 font-medium">{extraFileName}</span>
                ) : (
                  "사업계획서, 제품소개서 등 추가 첨부"
                )}
              </span>
            </div>
          </div>

          {/* 추가적인 설명 */}
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] mb-2">
              추가적인 설명{" "}
              <span className="font-normal text-[var(--muted)]">(선택)</span>
            </label>
            <textarea
              value={bizDesc}
              onChange={(e) => setBizDesc(e.target.value)}
              placeholder="예: 서울 마포구에서 IT 스타트업을 운영하고 있습니다. 2024년에 창업했고, 앱 개발 서비스를 하고 있습니다. 매출은 아직 1억 미만이고, 대표자 나이는 32살입니다."
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all resize-none bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
            />
          </div>

          {/* 추가 정보 */}
          <div className="rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] p-4 space-y-4">
            <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
              추가 정보
            </p>

            {/* 상시 직원 수 + 대표자 성별 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                  상시 직원 수
                </label>
                <select
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(e.target.value)}
                  className={selectClass}
                >
                  <option value="">선택</option>
                  {EMPLOYEE_COUNTS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted)] mb-1.5">
                  대표자 성별
                </label>
                <div className="flex gap-2">
                  {(["남성", "여성"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setCeoGender((prev) => (prev === g ? "" : g))}
                      className={`flex-1 py-2.5 text-sm rounded-xl border transition-all ${
                        ceoGender === g
                          ? "border-cyan-500 bg-cyan-500/10 text-cyan-500"
                          : "border-[var(--input-border)] text-[var(--muted)] hover:border-cyan-500/40"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 인증·특성 */}
            <div>
              <label className="block text-xs font-medium text-[var(--muted)] mb-2">
                인증·특성{" "}
                <span className="font-normal">(해당 항목 선택)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CERT_OPTIONS.map((cert) => (
                  <button
                    key={cert}
                    type="button"
                    onClick={() => toggleCert(cert)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all text-left ${
                      certifications.has(cert)
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-500"
                        : "border-[var(--input-border)] text-[var(--muted)] hover:border-cyan-500/30"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                        certifications.has(cert)
                          ? "border-cyan-500 bg-cyan-500"
                          : "border-current"
                      }`}
                    >
                      {certifications.has(cert) && (
                        <span className="text-white text-[10px] leading-none">✓</span>
                      )}
                    </span>
                    {cert}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* AI 분석 결과 */}
          {(analyzed || analyzing || analyzeError) && (
            <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-500/5 to-violet-500/5 overflow-hidden">
              {/* 헤더 */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/20">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--foreground)]">AI 분석 결과</span>
                  {analyzing && (
                    <span className="flex items-center gap-1 text-xs text-cyan-500">
                      <span className="w-3 h-3 border border-cyan-500 border-t-transparent rounded-full animate-spin" />
                      분석 중...
                    </span>
                  )}
                </div>
                {analyzed && !analyzing && (
                  <span className="text-xs font-medium text-emerald-500 flex items-center gap-1">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[9px]">✓</span>
                    완료
                  </span>
                )}
              </div>

              {analyzed && !analyzing && analyzedSources && (
                <>
                  {/* 분석한 자료 목록 */}
                  <div className="px-4 pt-3 pb-2">
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-widest mb-2">
                      AI가 읽은 자료
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {analyzedSources.mainFile && (
                        <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                          <span>📄</span> {analyzedSources.mainFile}
                        </span>
                      )}
                      {analyzedSources.extraFile && (
                        <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                          <span>📎</span> {analyzedSources.extraFile}
                        </span>
                      )}
                      {analyzedSources.hasDesc && (
                        <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-slate-500/10 text-[var(--muted)] border border-slate-500/20">
                          <span>📝</span> 추가 설명
                        </span>
                      )}
                      {analyzedSources.employees && (
                        <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-slate-500/10 text-[var(--muted)] border border-slate-500/20">
                          <span>👥</span> 직원 {analyzedSources.employees}
                        </span>
                      )}
                      {analyzedSources.gender && (
                        <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-slate-500/10 text-[var(--muted)] border border-slate-500/20">
                          <span>👤</span> {analyzedSources.gender} 대표
                        </span>
                      )}
                      {analyzedSources.certs.map((c) => (
                        <span key={c} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <span>🏆</span> {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mx-4 border-t border-cyan-500/10 my-1" />

                  {/* 추출된 정보 그리드 */}
                  <div className="px-4 pt-2 pb-3">
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-widest mb-2">
                      추출된 사업 정보
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "업종", value: analyzed.bizType },
                        { label: "연 매출", value: analyzed.revenue },
                        { label: "지역", value: analyzed.region },
                        { label: "업력", value: analyzed.bizAge },
                        { label: "대표 나이", value: analyzed.ceoAge },
                        {
                          label: "직원 수",
                          value: analyzed.employeeCount || employeeCount || "-",
                        },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] px-3 py-2"
                        >
                          <p className="text-[10px] text-[var(--muted)] mb-0.5">{label}</p>
                          <p className="text-xs font-semibold text-[var(--foreground)] leading-tight">
                            {value || "-"}
                          </p>
                        </div>
                      ))}
                    </div>
                    {/* 인증·특성 */}
                    {(() => {
                      const certs =
                        (analyzed.certifications && analyzed.certifications.length > 0)
                          ? analyzed.certifications
                          : Array.from(certifications);
                      return certs.length > 0 ? (
                        <div className="mt-2 rounded-lg bg-[var(--input-bg)] border border-[var(--input-border)] px-3 py-2">
                          <p className="text-[10px] text-[var(--muted)] mb-1">인증·특성</p>
                          <div className="flex flex-wrap gap-1">
                            {certs.map((c) => (
                              <span
                                key={c}
                                className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>

                  <div className="mx-4 border-t border-cyan-500/10 my-1" />

                  {/* AI 종합 의견 */}
                  {analyzed.summary && (
                    <div className="px-4 pt-2 pb-3">
                      <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-widest mb-2">
                        AI 종합 의견
                      </p>
                      <p className="text-sm text-[var(--foreground)] leading-relaxed">
                        {analyzed.summary}
                      </p>
                    </div>
                  )}

                  {/* 매칭 키워드 */}
                  {analyzed.keywords && analyzed.keywords.length > 0 && (
                    <>
                      <div className="mx-4 border-t border-cyan-500/10 my-1" />
                      <div className="px-4 pt-2 pb-3">
                        <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-widest mb-2">
                          지원사업 매칭 키워드
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {analyzed.keywords.map((kw) => (
                            <span
                              key={kw}
                              className="text-xs px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20"
                            >
                              # {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              {analyzeError && (
                <p className="px-4 py-3 text-xs text-red-400">{analyzeError}</p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-violet-600 text-white font-semibold rounded-xl hover:from-cyan-500 hover:to-violet-500 transition disabled:from-slate-300 disabled:to-slate-400 disabled:text-slate-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {analyzing ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                AI가 분석하고 있습니다...
              </>
            ) : analyzed ? (
              "다시 분석하기"
            ) : (
              "AI로 사업 정보 분석하기"
            )}
          </button>
        </div>
      )}

      {/* 수동 입력 / AI 결과 확인 */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {(tab === "manual" || analyzed) && (
          <>
            {analyzed && tab === "ai" && (
              <p className="text-xs text-[var(--muted)] mb-2">
                AI가 추출한 정보를 확인하고 필요하면 수정하세요
              </p>
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
          ) : (
            "맞춤 지원금 찾기"
          )}
        </button>
      </form>
    </div>
  );
}
