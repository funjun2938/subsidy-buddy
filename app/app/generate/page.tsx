"use client";
import { useEffect, useState } from "react";
import { useDocSession } from "./hooks/useDocSession";
import { useDocTokens } from "@/lib/docTokens";
import { StudioEntry } from "./components/StudioEntry";
import { ChatPanel } from "./components/ChatPanel";
import { DocPreview } from "./components/DocPreview";
import { HwpPreview } from "./components/HwpPreview";
import { UpgradeGate } from "./components/UpgradeGate";

export default function StudioPage() {
  const s = useDocSession();
  const tokens = useDocTokens();
  const [bizInfo, setBizInfo] = useState("");
  // 모바일에선 작성/미리보기를 한 화면에 둘 수 없어 탭으로 전환한다.
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");
  // 미리보기 모드: 원문(rhwp 고충실 렌더) / 편집(칸 채우기 표)
  const [previewMode, setPreviewMode] = useState<"fidelity" | "edit">("fidelity");
  const [docBytes, setDocBytes] = useState<Uint8Array | null>(null);     // 원본 양식 바이트
  const [filledBytes, setFilledBytes] = useState<Uint8Array | null>(null); // 값 반영 바이트
  const [gateOpen, setGateOpen] = useState(false);

  // 원본 양식 바이트 로드
  useEffect(() => {
    if (!s.file) { setDocBytes(null); return; }
    let cancelled = false;
    s.file.arrayBuffer().then((b) => { if (!cancelled) setDocBytes(new Uint8Array(b)); }).catch(() => {});
    return () => { cancelled = true; };
  }, [s.file]);

  // 값 반영: 원문 미리보기 모드 + 채운 값이 있으면, 편집 후 디바운스로 export 바이트 재렌더
  const valueMapKey = JSON.stringify(s.valueMap);
  useEffect(() => {
    if (previewMode !== "fidelity") return;
    if (s.filledRefs.size === 0) { setFilledBytes(null); return; } // 채운 값 없으면 원본 렌더
    let cancelled = false;
    const t = setTimeout(async () => {
      const bytes = await s.exportBytes();
      if (!cancelled && bytes) setFilledBytes(bytes);
    }, 800);
    return () => { cancelled = true; clearTimeout(t); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewMode, valueMapKey, s.filledRefs.size]);

  // AI 생성/수정 명령 = 실제 사용 토큰만큼 무료 예산에서 차감. 소진 시 업그레이드 게이트.
  const handleSend = (cmd: string) => {
    if (!tokens.canUse) { setGateOpen(true); return; }
    s.sendCommand(cmd, bizInfo, (used) => tokens.consume(used));
  };

  if (!s.structure) {
    return <StudioEntry onReady={(file, bi, grantTitle) => {
      const merged = grantTitle.trim() ? `지원사업명: ${grantTitle.trim()}\n${bi}` : bi;
      setBizInfo(merged);
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
            onExport={s.exportDoc} onShowPreview={() => setMobileTab("preview")}
            tokenInfo={tokens.mounted ? { isPro: tokens.isPro, percent: tokens.percent } : null} />
        </div>
        <div className={`${mobileTab === "preview" ? "flex" : "hidden"} md:flex flex-1 min-h-0 flex-col`}>
          {/* 원문 / 편집 토글 */}
          <div className="flex shrink-0 border-b border-[#e2e5ea] bg-white">
            <button onClick={() => setPreviewMode("fidelity")} className={tabCls(previewMode === "fidelity")}>📄 원문 미리보기</button>
            <button onClick={() => setPreviewMode("edit")} className={tabCls(previewMode === "edit")}>✏️ 칸 편집</button>
          </div>
          {previewMode === "fidelity" ? (
            (filledBytes ?? docBytes)
              ? <HwpPreview bytes={(filledBytes ?? docBytes)!} />
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
