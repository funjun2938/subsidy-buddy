"use client";
import { useState } from "react";
import type { DocStructure, ValueMap } from "@/lib/doc-structure";
import { buildPreviewRows } from "@/lib/preview-grid";
import { isPlaceholderValue } from "@/lib/fill-core";

export function DocPreview({ structure, valueMap, lastChanged, filledRefs, onEditCell }: {
  structure: DocStructure; valueMap: ValueMap; lastChanged: string[];
  filledRefs?: Set<string>;
  onEditCell: (ref: string, value: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const changedSet = new Set(lastChanged);
  const filled = filledRefs ?? new Set<string>();

  return (
    <div className="flex-1 flex flex-col bg-[#eef0f3] min-h-0">
      <div className="px-3 md:px-4 py-2.5 md:py-3 border-b border-[#e2e5ea] bg-white flex items-center justify-between gap-2 flex-wrap">
        <span className="font-bold text-[#1f2430] text-[13px] md:text-sm truncate min-w-0">📄 {structure.title || "신청서"} 미리보기</span>
        <span className="text-[10px] md:text-[10.5px] text-[#1e8e5a] bg-[#e7f6ee] border border-[#bfe6cf] rounded-full px-2 md:px-2.5 py-0.5 font-semibold shrink-0">🔒 양식 고정 · 내용만 편집</span>
      </div>
      <div className="flex-1 overflow-auto p-2.5 md:p-5">
        <div className="bg-white max-w-[640px] mx-auto p-4 md:p-7 shadow-md rounded">
          {structure.tables.map((t) => (
            <table key={t.index} className="w-full border-collapse text-[12px] text-[#222] mb-4">
              <tbody>
                {buildPreviewRows(t).map((rowCells, r) => (
                  <tr key={r}>
                    {rowCells.map((cell) => {
                      const val = valueMap[cell.ref];
                      const hasValue = !!val?.trim();          // 표시용: 값(원본 텍스트 포함)이 있는가
                      const isFilled = filled.has(cell.ref);   // 색칠용: 이번 세션에 AI/내가 채웠는가
                      const isChanged = changedSet.has(cell.ref);
                      const bg = !cell.isFillable ? "bg-[#f3f5f8] font-semibold"
                        : isChanged ? "bg-[#eaf1ff] outline outline-2 outline-[#2d6cf6]"
                        : isFilled ? "bg-[#fffbe6]" : "bg-white";
                      const editingThis = editing === cell.ref;
                      return (
                        <td key={cell.ref}
                          rowSpan={cell.rowspan > 1 ? cell.rowspan : undefined}
                          colSpan={cell.colspan > 1 ? cell.colspan : undefined}
                          className={`border border-[#cfd3da] px-1.5 py-1.5 md:px-2.5 md:py-2 align-top ${bg} ${cell.isFillable ? "cursor-text" : ""}`}
                          onClick={() => { if (cell.isFillable && !editingThis) { setEditing(cell.ref); setDraft(val || ""); } }}>
                          {editingThis ? (
                            <textarea autoFocus value={draft} rows={1}
                              onChange={e => setDraft(e.target.value)}
                              onBlur={() => { onEditCell(cell.ref, draft); setEditing(null); }}
                              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onEditCell(cell.ref, draft); setEditing(null); } }}
                              className="w-full bg-transparent outline-none resize-none text-[16px] md:text-[12px]" />
                          ) : cell.isFillable
                            ? (hasValue
                                ? (!isFilled && isPlaceholderValue(val!)
                                    ? <span className="text-[#b0b6c0] italic" title="작성 예시 — 실제 값으로 덮어써집니다">{val}</span>
                                    : val)
                                : <span className="text-[#b0b6c0]">(클릭/명령으로 입력)</span>)
                            : cell.label}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
          <div className="text-[9.5px] text-[#9aa1ad] mt-2">🟡 AI가 채운 칸 · 🔵 방금 수정 · ⬜ 입력 가능한 빈 칸 · 🔘 양식 고정(라벨) / 표·칸 구조는 바뀌지 않음</div>
        </div>
      </div>
    </div>
  );
}
