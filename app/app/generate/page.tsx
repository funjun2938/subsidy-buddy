"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { retrieveFile } from "@/lib/file-store";
import Link from "next/link";

const GRANT_EXAMPLES = [
  "2026년 예비창업패키지",
  "2026년 초기창업패키지",
  "소상공인 디지털 전환 지원",
  "중소기업 기술혁신개발사업 (R&D)",
  "AI 바우처 지원사업",
  "수출바우처 사업",
];

interface CheckItem {
  id: string;
  label: string;
  desc: string;
}

interface CheckResult {
  found: boolean;
  excerpt: string;
}

interface DocVersion {
  timestamp: string;
  documents: { docName: string; content: string }[];
}

// Section parsing: split content by [N. ...] pattern
function parseSections(content: string): { title: string; body: string }[] {
  const sectionRegex = /^(\[\d+\.\s[^\]]*\])/gm;
  const parts: { title: string; body: string }[] = [];
  let lastIndex = 0;
  let lastTitle = "";

  // Collect preamble (text before first section)
  const firstMatch = sectionRegex.exec(content);
  if (firstMatch) {
    const preamble = content.slice(0, firstMatch.index).trim();
    if (preamble) {
      parts.push({ title: "", body: preamble });
    }
    lastTitle = firstMatch[1];
    lastIndex = firstMatch.index + firstMatch[0].length;
  } else {
    // No sections found
    return [{ title: "", body: content }];
  }

  // Reset regex
  sectionRegex.lastIndex = firstMatch.index + firstMatch[0].length;

  let match;
  while ((match = sectionRegex.exec(content)) !== null) {
    const body = content.slice(lastIndex, match.index).trim();
    parts.push({ title: lastTitle, body });
    lastTitle = match[1];
    lastIndex = match.index + match[0].length;
  }

  // Last section
  const body = content.slice(lastIndex).trim();
  parts.push({ title: lastTitle, body });

  return parts;
}

// Reconstruct content from sections
function reconstructContent(sections: { title: string; body: string }[]): string {
  return sections
    .map((s) => (s.title ? `${s.title}\n${s.body}` : s.body))
    .join("\n\n");
}

// Hash helper for sessionStorage key
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

const MAX_VERSIONS = 5;

function GenerateContent() {
  const searchParams = useSearchParams();
  const [grantTitle, setGrantTitle] = useState("");
  const [bizInfo, setBizInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<{ docName: string; content: string }[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [templateName, setTemplateName] = useState("");
  const [initialized, setInitialized] = useState(false);

  // File upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Checklist
  const [checklistItems, setChecklistItems] = useState<CheckItem[]>([]);
  const [checkResults, setCheckResults] = useState<Record<string, CheckResult>>({});
  const [checking, setChecking] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState("");

  // Version history
  const [versions, setVersions] = useState<DocVersion[]>([]);
  const [activeVersionIdx, setActiveVersionIdx] = useState(-1); // -1 = current

  // Section revision
  const [editingSectionIdx, setEditingSectionIdx] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [revisingSection, setRevisingSection] = useState(false);
  const [revisedSections, setRevisedSections] = useState<Set<number>>(new Set());

  // sessionStorage key
  const storageKey = grantTitle ? `doc-versions-${simpleHash(grantTitle)}` : "";

  // Load versions from sessionStorage on mount
  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed: DocVersion[] = JSON.parse(saved);
        setVersions(parsed);
      }
    } catch {
      // silent
    }
  }, [storageKey]);

  // Save versions to sessionStorage when they change
  useEffect(() => {
    if (!storageKey || versions.length === 0) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(versions));
    } catch {
      // silent - storage full etc
    }
  }, [versions, storageKey]);

  // Push current documents to version history
  function pushVersion(docs: { docName: string; content: string }[]) {
    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setVersions((prev) => {
      const next = [...prev, { timestamp, documents: docs }];
      if (next.length > MAX_VERSIONS) next.shift();
      return next;
    });
    setActiveVersionIdx(-1);
    setRevisedSections(new Set());
  }

  // Load a previous version
  function loadVersion(idx: number) {
    if (idx === -1) {
      setActiveVersionIdx(-1);
      return;
    }
    const ver = versions[idx];
    if (ver) {
      setDocuments(ver.documents.map((d) => ({ ...d })));
      setActiveTab(0);
      setActiveVersionIdx(idx);
      setEditingSectionIdx(null);
      setFeedbackText("");
      setRevisedSections(new Set());
    }
  }

  // URL 파라미터로부터 초기값 로드 (공고 상세 -> AI 신청서 연계)
  useEffect(() => {
    if (initialized) return;
    const paramGrant = searchParams.get("grantTitle");
    const paramBizInfo = searchParams.get("bizInfo");
    const paramKeywords = searchParams.get("keywords");
    const paramBizType = searchParams.get("bizType");

    if (paramGrant) {
      setGrantTitle(paramGrant);
      const items = getLocalChecklist(paramGrant);
      setChecklistItems(items);
    }

    const infoParts: string[] = [];
    if (paramBizInfo) infoParts.push(paramBizInfo);
    if (paramBizType) infoParts.push(`업종: ${paramBizType}`);
    if (paramKeywords) infoParts.push(`키워드: ${paramKeywords}`);
    if (infoParts.length > 0) setBizInfo(infoParts.join("\n"));

    // 지원사업 조회 후 넘어온 경우에만 이전 첨부파일 복원
    if (paramGrant) {
      const storedFile = retrieveFile();
      if (storedFile) setUploadedFile(storedFile);
    }

    setInitialized(true);
  }, [searchParams, initialized]);

  const loadChecklist = useCallback(async (title: string) => {
    if (!title) {
      setChecklistItems([]);
      setCheckResults({});
      return;
    }
    try {
      const items = getLocalChecklist(title);
      setChecklistItems(items);
      setCheckResults({});
    } catch {
      // fallback
    }
  }, []);

  function handleGrantSelect(title: string) {
    setGrantTitle(title);
    loadChecklist(title);
  }

  const ALLOWED_TYPES = [
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp",
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/haansofthwp", "application/x-hwp",
  ];
  const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".pdf", ".txt", ".doc", ".docx", ".hwp"];

  function validateFile(file: File): boolean {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(ext)) {
      setFileError("");
      return true;
    }
    setFileError(`지원되지 않는 파일 형식입니다 (${ext}). 이미지, PDF, TXT, DOC, HWP 파일만 업로드 가능합니다.`);
    return false;
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && validateFile(file)) setUploadedFile(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) setUploadedFile(file);
  }

  async function handleCheckDoc() {
    if (!uploadedFile && !bizInfo.trim()) return;
    if (!grantTitle.trim()) return;
    setChecking(true);
    try {
      const form = new FormData();
      if (uploadedFile) form.append("file", uploadedFile);
      if (bizInfo.trim()) form.append("text", bizInfo);
      form.append("grantTitle", grantTitle);

      const res = await fetch("/api/check-doc", { method: "POST", body: form });
      const data = await res.json();

      if (data.checklist) setChecklistItems(data.checklist);
      if (data.checks) setCheckResults(data.checks);
      if (data.extractedBizInfo) {
        setExtractedInfo(data.extractedBizInfo);
        if (!bizInfo.trim()) {
          setBizInfo(data.extractedBizInfo);
        }
      }
    } catch {
      // silent
    } finally {
      setChecking(false);
    }
  }

  async function handleGenerate() {
    if (!grantTitle.trim() || (!bizInfo.trim() && !uploadedFile)) return;
    setLoading(true);
    setDocuments([]);
    setActiveTab(0);
    try {
      const finalBizInfo = bizInfo + (extractedInfo && !bizInfo.includes(extractedInfo) ? "\n\n[AI 추출 정보]\n" + extractedInfo : "");
      const res = await fetch("/api/generate-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantTitle, bizInfo: finalBizInfo }),
      });
      const data = await res.json();
      let newDocs: { docName: string; content: string }[] = [];
      if (data.documents) {
        newDocs = data.documents;
      } else if (data.document) {
        newDocs = [{ docName: "사업계획서", content: data.document }];
      } else {
        newDocs = [{ docName: "오류", content: data.error || "생성 실패" }];
      }
      setDocuments(newDocs);
      pushVersion(newDocs);
      setTemplateName(data.template || "");
    } catch {
      setDocuments([{ docName: "오류", content: "문서 생성 중 오류가 발생했습니다." }]);
    } finally {
      setLoading(false);
    }
  }

  // Section revision handler
  async function handleReviseSection(sectionIdx: number, sectionsList: { title: string; body: string }[]) {
    if (!feedbackText.trim() || revisingSection) return;
    const section = sectionsList[sectionIdx];
    const originalSection = section.title ? `${section.title}\n${section.body}` : section.body;

    setRevisingSection(true);
    try {
      const res = await fetch("/api/revise-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalSection,
          feedback: feedbackText,
          grantTitle,
          bizInfo,
        }),
      });
      const data = await res.json();
      if (data.revisedSection) {
        const newSections = [...sectionsList];
        const revisedLines = data.revisedSection.split("\n");
        const titleMatch = revisedLines[0]?.match(/^\[\d+\.\s[^\]]*\]/);
        if (titleMatch && section.title) {
          newSections[sectionIdx] = {
            title: titleMatch[0],
            body: revisedLines.slice(1).join("\n").trim(),
          };
        } else {
          newSections[sectionIdx] = {
            title: section.title,
            body: data.revisedSection.replace(section.title, "").trim(),
          };
        }

        const newContent = reconstructContent(newSections);
        const newDocs = [...documents];
        newDocs[activeTab] = { ...newDocs[activeTab], content: newContent };
        setDocuments(newDocs);
        pushVersion(newDocs);
        setRevisedSections((prev) => new Set(prev).add(sectionIdx));
        setEditingSectionIdx(null);
        setFeedbackText("");
      }
    } catch {
      // silent
    } finally {
      setRevisingSection(false);
    }
  }

  const checkedCount = Object.values(checkResults).filter(r => r.found).length;
  const totalChecklist = checklistItems.length;
  const hasChecks = Object.keys(checkResults).length > 0;
  const hasResult = documents.length > 0;
  const activeDoc = documents[activeTab];

  const sections = activeDoc ? parseSections(activeDoc.content) : [];

  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-cyan-400 transition mb-6">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        홈으로
      </Link>

      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 text-xs font-semibold mb-4 border border-violet-500/15">
          건당 29,900원
        </div>
        <h1 className="text-3xl font-black mb-3">
          AI <span className="gradient-text">신청서 생성</span>
        </h1>
        <p className="text-gray-400">
          지원사업에서 요구하는 공식 양식에 맞춰 AI가 사업계획서를 작성합니다.
          <br />
          파일을 업로드하면 필수 정보 포함 여부를 자동으로 체크합니다.
        </p>
      </div>

      {!hasResult ? (
        <div className="space-y-5">
          {/* 지원사업 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">지원사업명</label>
            <input
              type="text"
              value={grantTitle}
              onChange={(e) => handleGrantSelect(e.target.value)}
              placeholder="예: 2026년 예비창업패키지"
              className="w-full px-4 py-3 bg-gray-900/80 border border-white/10 rounded-xl text-white text-sm placeholder:text-gray-600 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 outline-none transition"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {GRANT_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => handleGrantSelect(ex)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                    grantTitle === ex
                      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                      : "bg-white/3 text-gray-500 border-white/5 hover:border-white/15 hover:text-gray-300"
                  }`}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* 양식 안내 + 체크리스트 */}
          {grantTitle && checklistItems.length > 0 && (
            <div className="glass rounded-xl p-5 border border-cyan-500/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs">📋</span>
                  <span className="text-xs font-semibold text-cyan-400">
                    필수 포함 정보 체크리스트
                  </span>
                </div>
                {hasChecks && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    checkedCount === totalChecklist
                      ? "bg-emerald-500/10 text-emerald-400"
                      : checkedCount >= totalChecklist * 0.7
                      ? "bg-amber-500/10 text-amber-400"
                      : "bg-red-500/10 text-red-400"
                  }`}>
                    {checkedCount}/{totalChecklist} 확인
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {checklistItems.map((item) => {
                  const check = checkResults[item.id];
                  const found = check?.found;
                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-2 text-[12px] px-2.5 py-1.5 rounded-lg transition ${
                        hasChecks
                          ? found
                            ? "bg-emerald-500/5 border border-emerald-500/10"
                            : "bg-red-500/5 border border-red-500/10"
                          : "bg-white/2 border border-white/5"
                      }`}
                    >
                      <span className={`mt-0.5 flex-shrink-0 ${
                        hasChecks
                          ? found ? "text-emerald-400" : "text-red-400"
                          : "text-gray-600"
                      }`}>
                        {hasChecks ? (found ? "✅" : "❌") : "◻️"}
                      </span>
                      <div className="min-w-0">
                        <span className={hasChecks && found ? "text-gray-200" : hasChecks ? "text-gray-400" : "text-gray-400"}>
                          {item.label}
                        </span>
                        {check?.excerpt && (
                          <p className="text-[10px] text-emerald-400/70 truncate mt-0.5">{check.excerpt}</p>
                        )}
                        {!hasChecks && (
                          <p className="text-[10px] text-gray-600 mt-0.5">{item.desc}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {hasChecks && checkedCount < totalChecklist && (
                <p className="text-[11px] text-amber-400/80 mt-3">
                  💡 누락된 항목은 아래 사업 정보에 추가로 작성하면 더 완성도 높은 신청서가 생성됩니다.
                </p>
              )}
            </div>
          )}

          {/* 파일 업로드 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              서류 업로드 <span className="text-gray-600 font-normal">(사업자등록증, 사업설명서 등)</span>
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                dragOver
                  ? "border-cyan-400/50 bg-cyan-500/5"
                  : uploadedFile
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-white/10 hover:border-white/20 bg-white/2"
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf,.txt,.doc,.docx,.hwp"
                onChange={handleFileSelect}
                className="hidden"
              />
              {uploadedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-emerald-400 font-medium">{uploadedFile.name}</p>
                    <p className="text-[11px] text-gray-500">{(uploadedFile.size / 1024).toFixed(0)}KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setUploadedFile(null); setCheckResults({}); setExtractedInfo(""); setFileError(""); }}
                    className="ml-2 text-gray-500 hover:text-red-400 transition"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ) : (
                <div>
                  <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-white/5 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <p className="text-sm text-gray-400">파일을 드래그하거나 클릭하여 업로드</p>
                  <p className="text-[11px] text-gray-600 mt-1">사업자등록증, 사업계획서, IR자료 등 (이미지 / PDF / TXT / DOC / HWP)</p>
                </div>
              )}
            </div>
            {fileError && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/15">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400 flex-shrink-0">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <p className="text-xs text-red-400">{fileError}</p>
              </div>
            )}
            {(uploadedFile || bizInfo.trim()) && grantTitle && (
              <button
                type="button"
                onClick={handleCheckDoc}
                disabled={checking}
                className="mt-2 w-full py-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 text-sm font-semibold border border-cyan-500/15 hover:bg-cyan-500/15 transition disabled:opacity-40"
              >
                {checking ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                    AI가 필수 정보 확인 중...
                  </span>
                ) : (
                  "📋 필수 정보 자동 체크"
                )}
              </button>
            )}
          </div>

          {/* 사업 정보 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">내 사업 정보</label>
            <textarea
              value={bizInfo}
              onChange={(e) => setBizInfo(e.target.value)}
              rows={10}
              placeholder={"자유롭게 작성해주세요. AI가 양식에 맞게 재구성합니다.\n\n예시:\n- 서비스명: 보조금매칭AI\n- 업종: IT/소프트웨어 (AI 기반 SaaS)\n- 사업 내용: 소상공인·스타트업에게 맞춤형 정부 지원사업을 AI로 매칭\n- 핵심 기술: NLP 기반 자격요건 분석, Vision AI 사업자등록증 인식\n- 차별점: 사업자등록증만 올리면 자동 분석 + 합격 가능성 판단\n- 현재 상태: MVP 개발 완료, 베타 테스트 중\n- 매출: 아직 없음 (예비 창업)\n- 대표자: 32세, SK엔무브 AX(AI전환) 담당 2년 경력\n- 필요 자금: 5,000만원 (인건비 2,000 + 마케팅 1,500 + API 비용 1,000 + 기타 500)"}
              className="w-full px-4 py-3 bg-gray-900/80 border border-white/10 rounded-xl text-white text-sm placeholder:text-gray-600 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 outline-none transition resize-none leading-relaxed"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !grantTitle.trim() || (!bizInfo.trim() && !uploadedFile)}
            className="w-full py-4 bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold rounded-xl hover:from-violet-400 hover:to-pink-400 transition-all shadow-lg shadow-violet-500/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                AI가 공식 양식에 맞춰 작성 중... (약 30초)
              </span>
            ) : (
              "사업계획서 생성하기"
            )}
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">생성된 제출 서류</h2>
              {templateName && (
                <p className="text-xs text-cyan-400 mt-0.5">양식: {templateName} ({documents.length}개 문서)</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => activeDoc && navigator.clipboard.writeText(activeDoc.content)}
                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition"
              >
                현재 문서 복사
              </button>
              <button
                onClick={() => {
                  const all = documents.map(d => `=== ${d.docName} ===\n\n${d.content}`).join("\n\n\n");
                  navigator.clipboard.writeText(all);
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition"
              >
                전체 복사
              </button>
              <button
                onClick={() => { setDocuments([]); setTemplateName(""); setActiveTab(0); setVersions([]); setRevisedSections(new Set()); setEditingSectionIdx(null); }}
                className="text-xs px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition"
              >
                다시 생성
              </button>
            </div>
          </div>

          {/* Version History Selector */}
          {versions.length > 0 && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-[11px] text-gray-500 mr-1">버전:</span>
              {versions.map((ver, idx) => {
                const isLatest = idx === versions.length - 1;
                const isCurrent = isLatest && activeVersionIdx === -1;
                const isActive = activeVersionIdx === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (isLatest) {
                        loadVersion(-1);
                      } else {
                        loadVersion(idx);
                      }
                    }}
                    className={`text-[11px] px-2.5 py-1 rounded-full border backdrop-blur-sm transition ${
                      isCurrent || isActive
                        ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/25"
                        : "bg-white/5 text-gray-500 border-white/10 hover:text-gray-300 hover:border-white/20"
                    }`}
                  >
                    v{idx + 1} ({ver.timestamp})
                    {isCurrent && (
                      <span className="ml-1 text-[10px] text-cyan-400/70">현재</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* 탭 (문서가 2개 이상일 때) */}
          {documents.length > 1 && (
            <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
              {documents.map((doc, idx) => (
                <button
                  key={idx}
                  onClick={() => { setActiveTab(idx); setEditingSectionIdx(null); setFeedbackText(""); }}
                  className={`flex-shrink-0 text-xs px-4 py-2 rounded-lg font-semibold transition ${
                    activeTab === idx
                      ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20"
                      : "bg-white/3 text-gray-500 border border-white/5 hover:text-gray-300 hover:border-white/15"
                  }`}
                >
                  {doc.docName}
                </button>
              ))}
            </div>
          )}

          {/* 문서 내용 - Section-level rendering with revision */}
          {activeDoc && (
            <div>
              {documents.length <= 1 && (
                <div className="text-sm font-semibold text-gray-400 mb-2">{activeDoc.docName}</div>
              )}
              <div className="glass rounded-2xl p-6 border border-white/5 text-sm text-gray-300 leading-relaxed max-h-[70vh] overflow-y-auto">
                {sections.map((section, sIdx) => (
                  <div key={sIdx} className="group relative">
                    {/* Section content */}
                    <div className="relative">
                      {revisingSection && editingSectionIdx === sIdx && (
                        <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
                          <span className="flex items-center gap-2 text-cyan-400 text-sm">
                            <span className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                            섹션 수정 중...
                          </span>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">
                        {section.title && (
                          <span className="font-bold text-gray-100">{section.title}</span>
                        )}
                        {section.title && "\n"}
                        <DocumentRenderer text={section.body} />
                      </div>
                      {revisedSections.has(sIdx) && (
                        <span className="inline-block ml-2 text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 border border-violet-500/20">
                          수정됨
                        </span>
                      )}
                    </div>

                    {/* "수정 요청" button on hover */}
                    {section.title && (
                      <button
                        onClick={() => {
                          if (editingSectionIdx === sIdx) {
                            setEditingSectionIdx(null);
                            setFeedbackText("");
                          } else {
                            setEditingSectionIdx(sIdx);
                            setFeedbackText("");
                          }
                        }}
                        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 text-[11px] px-2 py-1 rounded-lg bg-white/5 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 transition-all backdrop-blur-sm"
                      >
                        수정 요청
                      </button>
                    )}

                    {/* Inline feedback input */}
                    {editingSectionIdx === sIdx && (
                      <div className="mt-3 mb-4 p-3 rounded-xl bg-white/3 backdrop-blur-md border border-white/10">
                        <p className="text-[11px] text-gray-500 mb-2">이 섹션을 어떻게 수정할까요?</p>
                        <textarea
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          rows={2}
                          placeholder={'"시장 규모를 더 구체적으로", "TAM-SAM-SOM 모델 추가", "표로 정리해줘"'}
                          className="w-full px-3 py-2 bg-gray-900/60 border border-white/10 rounded-lg text-white text-xs placeholder:text-gray-600 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 outline-none transition resize-none"
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => { setEditingSectionIdx(null); setFeedbackText(""); }}
                            className="text-[11px] px-3 py-1.5 rounded-lg bg-white/5 text-gray-500 hover:text-gray-300 transition"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => handleReviseSection(sIdx, sections)}
                            disabled={!feedbackText.trim() || revisingSection}
                            className="text-[11px] px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/25 transition disabled:opacity-30"
                          >
                            {revisingSection ? (
                              <span className="flex items-center gap-1.5">
                                <span className="w-3 h-3 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                                수정 중...
                              </span>
                            ) : (
                              "AI 수정"
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {sIdx < sections.length - 1 && section.title && (
                      <div className="border-b border-white/5 my-4" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] text-gray-600 mt-4 text-center">
            AI 생성 문서는 초안입니다. 실제 제출 전 반드시 내용을 검토하고 보완하세요.
          </p>
        </div>
      )}
    </div>
  );
}

// 마크다운 표 + 텍스트 파이프 표 -> HTML 표 변환 렌더러
function DocumentRenderer({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        elements.push(<MarkdownTable key={`tbl-${i}`} lines={tableLines} />);
        continue;
      }
      for (const line of tableLines) {
        elements.push(<span key={`ln-${i}-${line.slice(0,10)}`}>{line}{"\n"}</span>);
      }
      continue;
    }

    if (i + 2 < lines.length && /^[\s-]+\|[\s-|]+$/.test(lines[i + 1]?.trim() || "")) {
      const headerLine = lines[i];
      if (headerLine.includes("|")) {
        const tableLines = [headerLine];
        let j = i + 1;
        while (j < lines.length && /^[\s-|]+$/.test(lines[j].trim())) { j++; }
        while (j < lines.length && lines[j].includes("|") && lines[j].trim().length > 0) {
          tableLines.push(lines[j]);
          j++;
        }
        if (tableLines.length >= 2) {
          elements.push(<PipeTable key={`ptbl-${i}`} lines={tableLines} />);
          i = j;
          continue;
        }
      }
    }

    elements.push(<span key={`ln-${i}`}>{lines[i]}{"\n"}</span>);
    i++;
  }

  return <>{elements}</>;
}

function MarkdownTable({ lines }: { lines: string[] }) {
  const parseRow = (line: string) =>
    line.split("|").slice(1, -1).map(cell => cell.trim());

  const isSeparator = (l: string) => /^[|\s:-]+$/.test(l) && l.includes("---");
  const filtered = lines.filter(l => !isSeparator(l));

  if (filtered.length === 0) return null;
  const header = parseRow(filtered[0]);
  const rows = filtered.slice(1).map(parseRow);

  return (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            {header.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-semibold text-gray-200 bg-white/5 border border-white/10 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 border border-white/5 text-gray-400 whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PipeTable({ lines }: { lines: string[] }) {
  const parseRow = (line: string) =>
    line.split("|").map(cell => cell.trim()).filter(Boolean);

  const header = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);

  return (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            {header.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-semibold text-gray-200 bg-white/5 border border-white/10 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 border border-white/5 text-gray-400 whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    }>
      <GenerateContent />
    </Suspense>
  );
}

// Client-side checklist data (mirrors server-side)
function getLocalChecklist(grantTitle: string): CheckItem[] {
  const checklists: Record<string, CheckItem[]> = {
    "예비창업패키지": [
      { id: "service_name", label: "서비스/제품명", desc: "개발하려는 서비스 또는 제품의 명칭" },
      { id: "biz_type", label: "업종/분야", desc: "IT, 제조, 서비스업 등 사업 분야" },
      { id: "problem", label: "해결하려는 문제", desc: "고객의 Pain Point 또는 시장 문제" },
      { id: "solution", label: "솔루션/핵심 기술", desc: "문제 해결 방법 및 핵심 기술 스택" },
      { id: "differentiation", label: "차별화 요소", desc: "경쟁 서비스 대비 우위 포인트" },
      { id: "mvp_status", label: "MVP/시제품 현황", desc: "현재 개발 단계 또는 시제품 상태" },
      { id: "target_market", label: "목표 시장/고객", desc: "타겟 고객층 및 시장 규모" },
      { id: "biz_model", label: "수익 모델", desc: "비즈니스 모델 및 가격 정책" },
      { id: "ceo_career", label: "대표자 경력/역량", desc: "대표자의 학력, 경력, 전문성" },
      { id: "team", label: "팀 구성", desc: "팀원 구성 현황 또는 채용 계획" },
      { id: "funding_plan", label: "자금 운용 계획", desc: "필요 자금 총액 및 항목별 내역" },
      { id: "ip_plan", label: "지식재산권 계획", desc: "특허, 상표 등 IP 확보 전략" },
    ],
    "초기창업패키지": [
      { id: "company_info", label: "기업 현황", desc: "설립일, 주요 연혁, 현재 매출/고용" },
      { id: "service_name", label: "서비스/제품명", desc: "개발 중인 서비스 또는 제품의 명칭" },
      { id: "biz_type", label: "업종/분야", desc: "IT, 제조, 서비스업 등 사업 분야" },
      { id: "achievements", label: "핵심 성과", desc: "기 확보 고객, 매출, 투자 유치 실적" },
      { id: "problem", label: "시장 Pain Point", desc: "타겟 고객이 겪는 구체적 문제" },
      { id: "market_size", label: "시장 규모", desc: "TAM-SAM-SOM 기반 시장 규모 추정" },
      { id: "core_tech", label: "핵심 기술 상세", desc: "기술 스택, 구현 방법론" },
      { id: "differentiation", label: "차별화 요소", desc: "경쟁 서비스 대비 기술적 우위" },
      { id: "biz_model", label: "BM/수익 구조", desc: "비즈니스 모델 및 가격 정책" },
      { id: "go_to_market", label: "GTM 전략", desc: "고객 획득 채널 및 마케팅 전략" },
      { id: "ceo_career", label: "대표자 이력", desc: "대표자의 해당 분야 경험" },
      { id: "team", label: "핵심 인력", desc: "팀 구성 및 역할 분담" },
      { id: "funding_plan", label: "사업비 집행 계획", desc: "항목별 예산 및 분기별 스케줄" },
      { id: "ip_status", label: "지식재산권 현황", desc: "확보 또는 계획 중인 IP" },
    ],
  };

  for (const key of Object.keys(checklists)) {
    if (grantTitle.includes(key)) return checklists[key];
  }
  return [
    { id: "service_name", label: "서비스/제품명", desc: "사업 아이템의 명칭" },
    { id: "biz_type", label: "업종/분야", desc: "사업 분야 및 업종" },
    { id: "problem", label: "해결 문제", desc: "해결하려는 문제 정의" },
    { id: "solution", label: "솔루션", desc: "문제 해결 방법" },
    { id: "target_market", label: "타겟 시장", desc: "목표 고객 및 시장" },
    { id: "biz_model", label: "수익 모델", desc: "비즈니스 모델" },
    { id: "ceo_career", label: "대표자 역량", desc: "대표자 경력" },
    { id: "team", label: "팀 구성", desc: "팀원 현황" },
    { id: "funding_plan", label: "사업비 계획", desc: "자금 운용 내역" },
  ];
}
