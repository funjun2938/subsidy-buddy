"use client";
import { useState } from "react";
import { useDocSession } from "./hooks/useDocSession";
import { StudioEntry } from "./components/StudioEntry";
import { ChatPanel } from "./components/ChatPanel";
import { DocPreview } from "./components/DocPreview";

export default function StudioPage() {
  const s = useDocSession();
  const [bizInfo, setBizInfo] = useState("");
  if (!s.structure) {
    return <StudioEntry onReady={(file, bi, grantTitle) => {
      // grantTitle 을 사업 정보 맨 앞에 접어 넣어 명령 LLM 이 어떤 지원사업인지 알게 한다.
      const merged = grantTitle.trim() ? `지원사업명: ${grantTitle.trim()}\n${bi}` : bi;
      setBizInfo(merged);
      s.openFile(file);
    }} />;
  }
  return (
    <div className="fixed inset-0 flex">
      <ChatPanel structure={s.structure} valueMap={s.valueMap} messages={s.messages} busy={s.busy}
        onSend={(cmd) => s.sendCommand(cmd, bizInfo)} onUndo={s.undo} canUndo={s.canUndo} onExport={s.exportDoc} />
      <DocPreview structure={s.structure} valueMap={s.valueMap} lastChanged={s.lastChanged} onEditCell={s.editCell} />
    </div>
  );
}
