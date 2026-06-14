"use client";
import { useState } from "react";
import { useDocSession } from "./hooks/useDocSession";
import { useDocTokens } from "@/lib/docTokens";
import { StudioEntry } from "./components/StudioEntry";
import { ChatPanel } from "./components/ChatPanel";
import { DocPreview } from "./components/DocPreview";
import { UpgradeGate } from "./components/UpgradeGate";

export default function StudioPage() {
  const s = useDocSession();
  const tokens = useDocTokens();
  const [bizInfo, setBizInfo] = useState("");
  // 모바일에선 작성/미리보기를 한 화면에 둘 수 없어 탭으로 전환한다.
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");
  const [gateOpen, setGateOpen] = useState(false);

  // AI 생성/수정 명령 = 실제 사용 토큰만큼 무료 예산에서 차감. 소진 시 업그레이드 게이트.
  const handleSend = (cmd: string) => {
    if (!tokens.canUse) { setGateOpen(true); return; }
    s.sendCommand(cmd, bizInfo, (used) => tokens.consume(used));
  };

  if (!s.structure) {
    return <StudioEntry onReady={(file, bi, grantTitle) => {
      // grantTitle 을 사업 정보 맨 앞에 접어 넣어 명령 LLM 이 어떤 지원사업인지 알게 한다.
      const merged = grantTitle.trim() ? `지원사업명: ${grantTitle.trim()}\n${bi}` : bi;
      setBizInfo(merged);
      s.openFile(file);
    }} />;
  }
  return (
    <div className="fixed inset-0 flex flex-col">
      {/* 모바일 전용 탭 바 (데스크톱은 2단 동시 표시) */}
      <div className="md:hidden flex shrink-0 border-b border-[#e8eaee] bg-white text-[13px] font-semibold">
        {([["chat", "✍️ 작성"], ["preview", "📄 미리보기"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setMobileTab(key)}
            className={`flex-1 py-3 transition-colors ${mobileTab === key
              ? "text-[#2d6cf6] border-b-2 border-[#2d6cf6]"
              : "text-[#9aa1ad]"}`}>
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
        <div className={`${mobileTab === "preview" ? "flex" : "hidden"} md:flex flex-1 min-h-0`}>
          <DocPreview structure={s.structure} valueMap={s.valueMap} lastChanged={s.lastChanged} onEditCell={s.editCell} />
        </div>
      </div>

      <UpgradeGate open={gateOpen} onClose={() => setGateOpen(false)} />
    </div>
  );
}
