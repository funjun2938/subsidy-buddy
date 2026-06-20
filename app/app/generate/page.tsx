"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDocSession } from "./hooks/useDocSession";
import { useDocTokens } from "@/lib/docTokens";
import { StudioEntry } from "./components/StudioEntry";
import { ChatPanel } from "./components/ChatPanel";
import { DocPreview } from "./components/DocPreview";
import { HwpPreview, exportHwpxFromBytes } from "./components/HwpPreview";
import { UpgradeGate } from "./components/UpgradeGate";
import { recordDoc } from "@/lib/userActivity";

export default function StudioPage() {
  const s = useDocSession();
  const tokens = useDocTokens();
  const [bizInfo, setBizInfo] = useState("");
  // 모바일에선 작성/미리보기를 한 화면에 둘 수 없어 탭으로 전환한다.
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");
  // 미리보기 모드: 원문(rhwp 고충실 렌더) / 편집(칸 채우기 표)
  const [previewMode, setPreviewMode] = useState<"fidelity" | "edit">("fidelity");
  const [docBytes, setDocBytes] = useState<Uint8Array | null>(null);     // 원본 양식 바이트
  const [gateOpen, setGateOpen] = useState(false);

  // 원본 양식 바이트 로드
  useEffect(() => {
    if (!s.file) { setDocBytes(null); return; }
    let cancelled = false;
    s.file.arrayBuffer().then((b) => { if (!cancelled) setDocBytes(new Uint8Array(b)); }).catch(() => {});
    return () => { cancelled = true; };
  }, [s.file]);

  // 원문 미리보기용 라벨→값 쌍. rhwp 가 렌더 직전 자기 문서에 직접 써넣어
  // 칸편집 값과 항상 일치하게 한다(hwpilot export 라운드트립 제거 → 500 폴백 버그 해소).
  const fills = useMemo(() => {
    if (!s.structure) return [];
    // label 은 rhwp 셀 텍스트와 매칭하는 RAW 라벨(그룹 미포함), group 은 중복 분해용.
    const out: { label: string; value: string; group?: string }[] = [];
    for (const t of s.structure.tables) for (const c of t.cells) {
      if (!c.isFillable) continue;
      const value = s.valueMap[c.ref];
      if (!value || !value.trim()) continue;
      out.push({ label: c.labelFor || c.label, value, group: c.group });
    }
    return out;
  }, [s.structure, s.valueMap]);

  // AI 생성/수정 명령 = 실제 사용 토큰만큼 무료 예산에서 차감. 소진 시 업그레이드 게이트.
  const handleSend = (cmd: string) => {
    if (!tokens.canUse) { setGateOpen(true); return; }
    s.sendCommand(cmd, bizInfo, (used) => tokens.consume(used));
  };

  // 진입 시 1회 자동 채움: 양식이 로드되고 사업 정보(사업자등록증 OCR + 인계 데이터)가
  // 있으면, 사용자가 명령하지 않아도 초안을 최대한 채워 보여준다. (미리보기·다운로드에 반영)
  const autoFilledRef = useRef(false);
  useEffect(() => {
    if (autoFilledRef.current) return;
    if (!s.structure || !bizInfo.trim()) return;
    if (!tokens.mounted) return;          // 토큰 상태 확정 후 판단
    autoFilledRef.current = true;
    if (!tokens.canUse) return;           // 무료 예산 소진 시 자동 채움만 생략(진입은 허용)
    s.sendCommand(
      "위 사업 정보를 바탕으로 이 신청서에서 채울 수 있는 모든 칸을 정확히 채워줘. 사업 정보로 알 수 없는 값은 비워둬.",
      bizInfo,
      (used) => tokens.consume(used),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.structure, bizInfo, tokens.mounted]);

  // 채운 양식을 HWPX 로 다운로드 (원본 + fills → rhwp 가 직접 채워 HWPX 내보내기)
  const [hwpxBusy, setHwpxBusy] = useState(false);
  const handleHwpxDownload = async () => {
    if (hwpxBusy || !docBytes) return;
    setHwpxBusy(true);
    try {
      const hwpx = await exportHwpxFromBytes(docBytes, fills);
      const blob = new Blob([hwpx as BlobPart], { type: "application/octet-stream" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${(s.file?.name || "신청서").replace(/\.hwpx?$/i, "")}_AI작성.hwpx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { /* 실패 시 기존 '한글' 다운로드 사용 */ }
    finally { setHwpxBusy(false); }
  };

  if (!s.structure) {
    return <StudioEntry onReady={(file, bi, grantTitle) => {
      const merged = grantTitle.trim() ? `지원사업명: ${grantTitle.trim()}\n${bi}` : bi;
      setBizInfo(merged);
      recordDoc(grantTitle.trim() || file.name.replace(/\.hwpx?$/i, ""));
      s.openFile(file);
    }} />;
  }

  const tabCls = (active: boolean) =>
    `flex-1 py-2.5 text-[12px] font-semibold transition-colors ${active ? "text-[#2d6cf6] border-b-2 border-[#2d6cf6]" : "text-[#9aa1ad]"}`;

  return (
    // 전역 헤더(PRO배너 40px + 헤더 64px = 104px) 아래에서 시작.
    // 불투명 배경 + z-40 으로 뒤의 Footer(로고 등)가 비치지 않게 완전히 덮는다.
    <div className="fixed inset-x-0 bottom-0 top-[104px] z-40 flex flex-col border-t border-[#e8eaee] bg-[#eef0f3]">
      {/* 모바일 전용 탭 바 (데스크톱은 2단 동시 표시) */}
      <div className="md:hidden flex shrink-0 border-b border-[#e8eaee] bg-white text-[13px] font-semibold">
        {([["chat", "✍️ 작성"], ["preview", "📄 미리보기"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setMobileTab(key)}
            className={`flex-1 py-3 transition-colors ${mobileTab === key ? "text-[#2d6cf6] border-b-2 border-[#2d6cf6]" : "text-[#9aa1ad]"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 flex min-h-0">
        <div className={`${mobileTab === "chat" ? "flex" : "hidden"} md:flex w-full md:w-[42%] md:shrink-0 min-h-0`}>
          <ChatPanel structure={s.structure} valueMap={s.valueMap} messages={s.messages} busy={s.busy}
            onSend={handleSend} onUndo={s.undo} canUndo={s.canUndo}
            onExport={s.exportDoc} onExportHwpx={handleHwpxDownload}
            onShowPreview={() => setMobileTab("preview")}
            tokenInfo={tokens.mounted ? { isPro: tokens.isPro, percent: tokens.percent } : null} />
        </div>
        <div className={`${mobileTab === "preview" ? "flex" : "hidden"} md:flex flex-1 min-h-0 flex-col`}>
          {/* 원문 / 편집 토글 */}
          <div className="flex shrink-0 border-b border-[#e2e5ea] bg-white">
            <button onClick={() => setPreviewMode("fidelity")} className={tabCls(previewMode === "fidelity")}>📄 원문 미리보기</button>
            <button onClick={() => setPreviewMode("edit")} className={tabCls(previewMode === "edit")}>✏️ 칸 편집</button>
          </div>
          {previewMode === "fidelity" ? (
            docBytes
              ? <HwpPreview bytes={docBytes} fills={fills} />
              : <div className="flex-1 flex items-center justify-center text-xs text-[#9aa1ad]">양식 불러오는 중…</div>
          ) : (
            <DocPreview structure={s.structure} valueMap={s.valueMap} lastChanged={s.lastChanged}
              filledRefs={s.filledRefs} onEditCell={s.editCell} />
          )}
        </div>
      </div>

      <UpgradeGate open={gateOpen} onClose={() => setGateOpen(false)} />
    </div>
  );
}
