"use client";
import { useState } from "react";
import type { DocStructure, ValueMap } from "@/lib/doc-structure";
import type { ChatMessage } from "../hooks/useDocSession";
import { SummaryBubble } from "./SummaryBubble";

export function ChatPanel({ structure, valueMap, messages, busy, onSend, onUndo, canUndo, onExport, onShowPreview, tokenInfo }: {
  structure: DocStructure; valueMap: ValueMap; messages: ChatMessage[]; busy: boolean;
  onSend: (cmd: string) => void; onUndo: () => void; canUndo: boolean; onExport: () => void;
  onShowPreview?: () => void;
  tokenInfo?: { isPro: boolean; remaining: number; limit: number } | null;
}) {
  const [input, setInput] = useState("");
  const submit = () => { if (input.trim() && !busy) { onSend(input.trim()); setInput(""); } };
  return (
    <div className="w-full flex flex-col bg-[#f7f8fa] md:border-r border-[#e8eaee] min-h-0">
      <div className="px-4 py-3 border-b border-[#e8eaee] font-bold text-[#1f2430] text-sm flex items-center justify-between">
        <span className="flex items-center gap-2">
          ✍️ AI 신청서 작성
          {tokenInfo && (
            tokenInfo.isPro ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 text-white">PRO ∞</span>
            ) : (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${tokenInfo.remaining > 0 ? "text-[#2d6cf6] border-[#bcd0fb] bg-[#eef3ff]" : "text-[#c0392b] border-[#f3c4bd] bg-[#fdeeec]"}`}>
                무료 {tokenInfo.remaining}/{tokenInfo.limit}
              </span>
            )
          )}
        </span>
        <div className="flex gap-1.5">
          <button onClick={onUndo} disabled={!canUndo} className="text-[11px] px-2 py-1 rounded bg-white border border-[#d6dae1] disabled:opacity-40">되돌리기</button>
          <button onClick={onExport} className="text-[11px] px-2.5 py-1 rounded bg-[#2d6cf6] text-white font-semibold">한글 다운로드</button>
        </div>
      </div>
      <div className="flex-1 p-3.5 flex flex-col gap-2.5 overflow-auto">
        <SummaryBubble structure={structure} valueMap={valueMap} />
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user"
            ? "self-end max-w-[80%] bg-[#2d6cf6] text-white rounded-[14px_14px_4px_14px] px-3 py-2 text-[12.5px]"
            : "self-start max-w-[88%] bg-white border border-[#e6e8ec] rounded-[14px_14px_14px_4px] px-3 py-2.5 text-[12.5px] text-[#2a2f3a]"}>
            {m.text}
          </div>
        ))}
        {busy && <div className="self-start text-[11px] text-[#9aa1ad]">AI가 생각 중…</div>}
      </div>
      <div className="p-3.5 border-t border-[#e8eaee] bg-white">
        <div className="flex gap-2 items-end border border-[#d6dae1] rounded-[10px] px-2.5 py-2">
          <textarea value={input} onChange={e => setInput(e.target.value)} rows={1}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder="명령을 입력하세요… 예) 대표자를 ○○로 바꿔줘"
            className="flex-1 bg-transparent outline-none resize-none text-[16px] md:text-[12.5px]" />
          <button onClick={submit} disabled={busy} className="bg-[#2d6cf6] text-white rounded-lg px-3 py-2 md:py-1.5 text-[13px] md:text-[12px] font-semibold disabled:opacity-50">전송</button>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-[10.5px] text-[#9aa1ad]">자연어로 말하면 미리보기 문서의 <b>내용만</b> 수정됩니다.</span>
          {onShowPreview && (
            <button onClick={onShowPreview} className="md:hidden shrink-0 text-[11px] font-semibold text-[#2d6cf6]">📄 미리보기 →</button>
          )}
        </div>
      </div>
    </div>
  );
}
