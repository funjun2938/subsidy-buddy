"use client";
import type { DocStructure, ValueMap } from "@/lib/doc-structure";

export function SummaryBubble({ structure, valueMap }: { structure: DocStructure; valueMap: ValueMap }) {
  const fields = structure.tables.flatMap(t => t.cells).filter(c => c.isFillable);
  return (
    <div className="self-start max-w-[88%] bg-white border border-[#e6e8ec] rounded-[14px_14px_14px_4px] px-3 py-2.5 text-[12.5px] text-[#2a2f3a] shadow-sm">
      지금까지 입력된 내용이에요 👇
      <div className="mt-2 flex flex-col gap-1">
        {fields.map(f => {
          const v = valueMap[f.ref]?.trim();
          return <div key={f.ref}>{v ? "✅" : "⬜"} {f.labelFor || f.label} — {v ? <b>{v.length > 24 ? v.slice(0, 24) + "…" : v}</b> : <span className="text-[#c0392b]">미입력</span>}</div>;
        })}
      </div>
    </div>
  );
}
