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

describe("buildStructure — 중복 라벨 그룹 구분 (신청인/배우자)", () => {
  // 신청인/배우자 그룹에 "성 명"·"주민번호" 가 반복되는 표.
  // 그룹 헤더(신청인/배우자)는 각 그룹 첫 행 col0, 값칸은 라벨 우측.
  let dupBytes: Uint8Array;
  beforeAll(async () => {
    const blank = await createHwp();
    const doc = await documentFromBytes(blank);
    await doc.addTable("s0", 4, 5, {
      data: [
        ["신청인", "성 명", "", "주민번호", ""],
        ["", "전화번호", "", "주소", ""],
        ["배우자", "성 명", "", "주민번호", ""],
        ["", "전화번호", "", "주소", ""],
      ],
    });
    dupBytes = await doc.export();
  });

  test("두 '성 명' fillable 이 group(신청인/배우자)으로 구분된다", async () => {
    const doc = await openFormDoc(dupBytes);
    const s = buildStructure(doc);
    const seongmyung = s.tables[0].cells.filter(
      (c) => c.isFillable && (c.labelFor || "").replace(/\s/g, "") === "성명",
    );
    expect(seongmyung.length).toBe(2);
    const groups = seongmyung.map((c) => c.group).sort();
    expect(groups).toEqual(["배우자", "신청인"]);
  });

  test("유일한 그룹 헤더(신청인)에는 group 노이즈를 붙이지 않는다", async () => {
    const doc = await openFormDoc(dupBytes);
    const s = buildStructure(doc);
    // 신청인 셀 자체는(fillable 이어도) 중복 라벨이 아니므로 group 없음
    const sincheonginCell = s.tables[0].cells.find((c) => c.label === "신청인");
    expect(sincheonginCell?.group).toBeUndefined();
  });

  test("신청인 성명 칸만 채우면 신청인 셀에 값이 들어간다(배우자 아님)", async () => {
    const doc0 = await openFormDoc(dupBytes);
    const s = buildStructure(doc0);
    const sincheonginName = s.tables[0].cells.find(
      (c) => c.isFillable && (c.labelFor || "").replace(/\s/g, "") === "성명" && c.group === "신청인",
    );
    expect(sincheonginName).toBeDefined();
    const out = await applyValues(await openFormDoc(dupBytes), { [sincheonginName!.ref]: "김희준" });
    const re = await openFormDoc(out);
    // 김희준 이 들어간 셀의 ref 가 신청인 성명 ref 와 같아야 함
    const hits: string[] = [];
    let ti = 0;
    for (const t of re.allTables()) {
      for (const c of t.cells) if (c.text.includes("김희준")) hits.push(`t${ti}.r${c.row}.c${c.col}`);
      ti++;
    }
    expect(hits).toEqual([sincheonginName!.ref]);
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
