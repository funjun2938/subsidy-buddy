// tests/doc-structure.test.ts
import { describe, expect, test, beforeAll } from "bun:test";
import { createHwp, documentFromBytes } from "../lib/hwpilot";
import { openFormDoc } from "../lib/open-form-doc";
import { buildStructure, applyValues, filterChanges } from "../lib/doc-structure";

let hwpBytes: Uint8Array;
beforeAll(async () => {
  const blank = await createHwp();
  const doc = await documentFromBytes(blank);
  await doc.addTable("s0", 2, 4, { data: [["기업명","","대표자",""],["주소","","연락처",""]] });
  hwpBytes = await doc.export();
});

describe("buildStructure", () => {
  test("표/셀/통일 ref/fillable 판정", async () => {
    const doc = await openFormDoc(hwpBytes);
    const s = buildStructure(doc);
    expect(s.format).toBe("hwp");
    expect(s.tables.length).toBe(1);
    const cells = s.tables[0].cells;
    // 라벨 셀
    const label = cells.find(c => c.label === "기업명");
    expect(label?.isFillable).toBe(false);
    // 기업명 오른쪽(r0c1)이 fillable, labelFor="기업명"
    const value = cells.find(c => c.ref === "t0.r0.c1");
    expect(value?.isFillable).toBe(true);
    expect(value?.labelFor).toBe("기업명");
  });
});

describe("applyValues", () => {
  test("ref별 값 주입 후 round-trip 보존", async () => {
    const doc = await openFormDoc(hwpBytes);
    const out = await applyValues(doc, { "t0.r0.c1": "보조금버디", "t0.r0.c3": "홍길동" });
    const re = await openFormDoc(out);
    const all: string[] = [];
    for (const t of re.allTables()) for (const c of t.cells) all.push(c.text);
    expect(all.some(x => x.includes("보조금버디"))).toBe(true);
    expect(all.some(x => x.includes("홍길동"))).toBe(true);
  });
});

describe("filterChanges", () => {
  test("fillable 집합에 없는 ref 는 폐기(구조 날조 방지)", () => {
    const fillable = new Set(["t0.r0.c1", "t0.r0.c3"]);
    const changes = [
      { ref: "t0.r0.c1", value: "A" },   // 허용
      { ref: "t0.r0.c0", value: "해킹" }, // 라벨셀 → 폐기
      { ref: "t9.r9.c9", value: "없음" }, // 미존재 → 폐기
    ];
    const ok = filterChanges(changes, fillable);
    expect(ok).toEqual([{ ref: "t0.r0.c1", value: "A" }]);
  });
});
