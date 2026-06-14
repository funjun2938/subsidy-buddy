"use client";
import { useCallback, useState } from "react";
import type { DocStructure, ValueMap, CellChange } from "@/lib/doc-structure";

export interface ChatMessage { role: "user" | "assistant"; text: string; }

export function useDocSession() {
  const [file, setFile] = useState<File | null>(null);
  const [structure, setStructure] = useState<DocStructure | null>(null);
  const [valueMap, setValueMap] = useState<ValueMap>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<ValueMap[]>([]);
  const [busy, setBusy] = useState(false);
  const [lastChanged, setLastChanged] = useState<string[]>([]);
  // 이번 세션에서 AI/사용자가 실제로 채운 칸 ref (양식 원본 텍스트와 구분 → 색칠 기준)
  const [filledRefs, setFilledRefs] = useState<Set<string>>(new Set());

  const pushHistory = useCallback((vm: ValueMap) => setHistory(h => [...h, vm]), []);

  const openFile = useCallback(async (f: File) => {
    setBusy(true);
    try {
      const fd = new FormData(); fd.append("file", f);
      const res = await fetch("/api/doc/open", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "열기 실패");
      setFile(f); setStructure(data.structure); setValueMap(data.initialValues || {});
      setMessages([{ role: "assistant", text: "양식을 불러왔어요. 채울 내용을 말해주세요. 예) ‘대표자를 홍길동으로’, ‘사업정보 보고 다 채워줘’" }]);
    } catch (e) { setMessages(m => [...m, { role: "assistant", text: `오류: ${e instanceof Error ? e.message : e}` }]); }
    finally { setBusy(false); }
  }, []);

  const applyChanges = useCallback((changes: CellChange[]) => {
    setValueMap(vm => { pushHistory(vm); const next = { ...vm }; for (const c of changes) next[c.ref] = c.value; return next; });
    setLastChanged(changes.map(c => c.ref));
    // 값이 있는 변경은 '채움'으로, 빈 값으로 지운 건 '채움 해제'로 기록
    setFilledRefs(prev => {
      const next = new Set(prev);
      for (const c of changes) { if (c.value.trim()) next.add(c.ref); else next.delete(c.ref); }
      return next;
    });
    setTimeout(() => setLastChanged([]), 2500);
  }, [pushHistory]);

  const fillableList = useCallback(() => {
    if (!structure) return [];
    const out: { ref: string; label: string; value: string }[] = [];
    for (const t of structure.tables) for (const c of t.cells)
      if (c.isFillable) out.push({ ref: c.ref, label: c.labelFor || c.label, value: valueMap[c.ref] || "" });
    return out;
  }, [structure, valueMap]);

  const sendCommand = useCallback(async (command: string, bizInfo: string, onUsage?: (tokens: number) => void) => {
    if (!command.trim()) return;
    setMessages(m => [...m, { role: "user", text: command }]); setBusy(true);
    try {
      const res = await fetch("/api/doc/command", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fillable: fillableList(), valueMap, command, bizInfo }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "명령 실패");
      if (typeof data.tokensUsed === "number") onUsage?.(data.tokensUsed); // 실제 토큰 사용량 차감
      if (Array.isArray(data.changes) && data.changes.length) applyChanges(data.changes);
      setMessages(m => [...m, { role: "assistant", text: data.reply || "완료" }]);
    } catch (e) { setMessages(m => [...m, { role: "assistant", text: `오류: ${e instanceof Error ? e.message : e}` }]); }
    finally { setBusy(false); }
  }, [fillableList, valueMap, applyChanges]);

  const editCell = useCallback((ref: string, value: string) => applyChanges([{ ref, value }]), [applyChanges]);
  const undo = useCallback(() => setHistory(h => { if (!h.length) return h; setValueMap(h[h.length - 1]); return h.slice(0, -1); }), []);

  // 현재 valueMap 을 적용한 문서 바이트 반환 (다운로드 없이) — 고충실 미리보기 재렌더용
  const exportBytes = useCallback(async (): Promise<Uint8Array | null> => {
    if (!file) return null;
    const fd = new FormData(); fd.append("file", file); fd.append("valueMap", JSON.stringify(valueMap));
    const res = await fetch("/api/doc/export", { method: "POST", body: fd });
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  }, [file, valueMap]);

  const exportDoc = useCallback(async () => {
    if (!file) return; setBusy(true);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("valueMap", JSON.stringify(valueMap));
      const res = await fetch("/api/doc/export", { method: "POST", body: fd });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "내보내기 실패"); }
      const blob = await res.blob();
      const ext = res.headers.get("X-Doc-Format") || "hwp";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${file.name.replace(/\.hwpx?$/i, "")}_AI작성.${ext}`; a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { setMessages(m => [...m, { role: "assistant", text: `내보내기 오류: ${e instanceof Error ? e.message : e}` }]); }
    finally { setBusy(false); }
  }, [file, valueMap]);

  return { file, structure, valueMap, messages, busy, lastChanged, filledRefs, openFile, sendCommand, editCell, undo, exportDoc, exportBytes, canUndo: history.length > 0 };
}
