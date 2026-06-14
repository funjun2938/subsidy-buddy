// 스튜디오 통합 테스트: buildStructure → filterChanges → applyValues 라운드트립.
// 합성 .hwp 양식(createHwp)으로 라벨셀 ref 는 폐기되고 fillable 값은 살아남는지 검증.
// 실행: cd app && bun test tests/
import { describe, expect, test } from "bun:test";
import { createHwp, documentFromBytes } from "../lib/hwpilot";
import { openFormDoc } from "../lib/open-form-doc";
import { buildStructure, applyValues, filterChanges } from "../lib/doc-structure";

describe("doc flow", () => {
  test("buildStructure → filterChanges → applyValues round-trip", async () => {
    const blank = await createHwp();
    const d = await documentFromBytes(blank);
    await d.addTable("s0", 1, 2, { data: [["기업명", ""]] });
    const bytes = await d.export();

    const s = buildStructure(await openFormDoc(bytes));
    const fillable = new Set(
      s.tables.flatMap((t) => t.cells).filter((c) => c.isFillable).map((c) => c.ref),
    );
    expect(fillable.size).toBeGreaterThan(0);

    const changes = filterChanges(
      [
        { ref: [...fillable][0], value: "보조금버디" },
        { ref: "t0.r0.c0", value: "해킹" }, // 라벨셀 — fillable 아님 → 폐기되어야 함
      ],
      fillable,
    );
    expect(changes.length).toBe(1);

    const out = await applyValues(
      await openFormDoc(bytes),
      Object.fromEntries(changes.map((c) => [c.ref, c.value])),
    );
    const re = await openFormDoc(out);
    const all: string[] = [];
    for (const t of re.allTables()) for (const c of t.cells) all.push(c.text);

    expect(all.some((x) => x.includes("보조금버디"))).toBe(true);
    expect(all.some((x) => x.includes("해킹"))).toBe(false); // 라벨셀 폐기됨
  });
});
