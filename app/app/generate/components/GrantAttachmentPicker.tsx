"use client";
import { useCallback, useEffect, useState } from "react";

// 공고 → 첨부 신청서 자동 로드 → .hwp/.hwpx Blob 다운로드 → File 로 변환해 onPick.
// (구 page.tsx 의 loadAttachments / 마감임박 칩 / download-attachment 흐름을 라이트 네이티브로 이식)

interface GrantSummary { id: string; title: string; deadline: string; orgName?: string; }
interface GrantAttachment {
  filename: string;
  ext: string;
  downloadUrl: string;
  kind: "application" | "notice" | "other";
}

const KIND_LABEL: Record<GrantAttachment["kind"], string> = {
  application: "신청서",
  notice: "안내문",
  other: "기타",
};

const canAutoFill = (ext: string) => ext === "hwp" || ext === "hwpx";

export function GrantAttachmentPicker({ onPick }: { onPick: (file: File, grantTitle: string) => void }) {
  const [grantTitle, setGrantTitle] = useState("");
  const [pblancId, setPblancId] = useState("");
  const [options, setOptions] = useState<GrantSummary[]>([]);
  const [attachments, setAttachments] = useState<GrantAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [downloading, setDownloading] = useState(false);

  // 마감 임박 실제 공고 6개 — 진입 시 1회
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/grants");
        if (!res.ok) return;
        const data = await res.json();
        const list: GrantSummary[] = (data.grants || []).slice(0, 6).map(
          (g: { id: string; title: string; deadline: string; orgName?: string }) => ({
            id: g.id, title: g.title, deadline: g.deadline, orgName: g.orgName,
          }),
        );
        if (!cancelled) setOptions(list);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const loadAttachments = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    setAttachments([]);
    setStatus("");
    try {
      const res = await fetch(`/api/grant-attachments?pblancId=${encodeURIComponent(id)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus(`첨부 추출 실패: ${err.error || res.status}`);
        return;
      }
      const data = await res.json();
      const att: GrantAttachment[] = data.attachments || [];
      setAttachments(att);
      if (att.length === 0) setStatus("이 공고의 첨부파일을 찾지 못했습니다.");
      else if (!att.some((a) => canAutoFill(a.ext)))
        setStatus("AI 자동 기입 가능한 .hwp/.hwpx 신청서가 없습니다. 양식을 직접 업로드해 주세요.");
    } catch (e) {
      setStatus(`첨부 로드 오류: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const pickGrant = (g: GrantSummary) => {
    setGrantTitle(g.title);
    if (g.id.startsWith("PBLN_")) {
      setPblancId(g.id);
      void loadAttachments(g.id);
    } else {
      setPblancId("");
      setAttachments([]);
      setStatus("이 공고는 첨부 자동 인식을 지원하지 않습니다. pblancId 를 입력하거나 양식을 업로드하세요.");
    }
  };

  const selectAttachment = async (att: GrantAttachment) => {
    if (downloading) return;
    if (!canAutoFill(att.ext)) {
      setStatus(`⚠️ ${att.ext.toUpperCase()}는 AI 자동 기입 대상이 아니에요. "↓ 원본"으로 받아 직접 작성하세요.`);
      return;
    }
    setDownloading(true);
    setStatus(`공고 첨부 다운로드 중… (${att.filename})`);
    try {
      const res = await fetch(
        `/api/download-attachment?url=${encodeURIComponent(att.downloadUrl)}&filename=${encodeURIComponent(att.filename)}`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus(`공고 첨부 다운로드 실패: ${err.error || res.status}`);
        return;
      }
      const blob = await res.blob();
      const file = new File([blob], att.filename, { type: blob.type || "application/octet-stream" });
      onPick(file, grantTitle);
    } catch (e) {
      setStatus(`다운로드 오류: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-3">
      <input value={grantTitle} onChange={(e) => setGrantTitle(e.target.value)} placeholder="지원사업명(선택)"
        className="w-full border rounded-lg px-3 py-2 text-sm" />

      {options.length > 0 && (
        <div>
          <p className="text-[11px] text-gray-500 mb-1.5">📅 마감 임박 공고에서 선택 (클릭 시 첨부 양식 자동 로드)</p>
          <div className="flex flex-wrap gap-1.5">
            {options.map((g) => {
              const selected = grantTitle === g.title;
              return (
                <button key={g.id} type="button" onClick={() => pickGrant(g)}
                  title={`${g.title}${g.orgName ? ` · ${g.orgName}` : ""} · 마감 ${g.deadline}`}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition max-w-xs truncate ${
                    selected
                      ? "bg-blue-50 text-blue-700 border-blue-300"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}>
                  {g.id.startsWith("PBLN_") && <span className="mr-1 text-blue-500">●</span>}
                  {g.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <input value={pblancId} onChange={(e) => setPblancId(e.target.value)} placeholder="공고 pblancId 직접 입력 (예: PBLN_000…)"
          className="flex-1 border rounded-lg px-3 py-2 text-sm" />
        <button type="button" onClick={() => loadAttachments(pblancId)} disabled={!pblancId || loading}
          className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">
          첨부 불러오기
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs text-blue-600">
          <span className="w-3 h-3 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          공고 첨부파일 분석 중…
        </div>
      )}

      {attachments.length > 0 && (
        <div className="space-y-1.5 rounded-xl p-3 bg-blue-50/50 border border-blue-100">
          <p className="text-[11px] text-gray-500">공고 첨부파일 {attachments.length}개 · .hwp/.hwpx 신청서를 클릭하면 AI가 채워줍니다</p>
          {attachments.map((att, i) => {
            const fillable = canAutoFill(att.ext);
            return (
              <div key={i}
                onClick={() => selectAttachment(att)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition ${
                  fillable
                    ? "bg-white border border-blue-200 hover:border-blue-400 cursor-pointer"
                    : "bg-gray-50 border border-gray-200"
                }`}>
                <span className="text-base">
                  {att.ext === "hwpx" ? "📄" : att.ext === "hwp" ? "📕" : att.ext === "pdf" ? "📑" : "📦"}
                </span>
                <span className="flex-1 truncate text-gray-700">{att.filename}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 bg-gray-50 text-gray-600 border-gray-200">
                  {KIND_LABEL[att.kind]}
                </span>
                {fillable ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex-shrink-0">
                    클릭해 AI 채움
                  </span>
                ) : (
                  <a href={att.downloadUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 flex-shrink-0 hover:bg-gray-200"
                    title="파일을 그대로 내려받기">
                    ↓ 원본
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {status && <p className="text-[11px] text-gray-500 whitespace-pre-line">{status}</p>}
      {downloading && <p className="text-[11px] text-blue-600">신청서를 가져오는 중…</p>}
    </div>
  );
}
