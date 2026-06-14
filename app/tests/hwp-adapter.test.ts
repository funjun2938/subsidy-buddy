// HWP FormDoc 어댑터 통합 테스트.
// createHwp 로 합성 .hwp 양식(표 포함)을 만들어 openFormDoc → fillForm → round-trip 검증.
// 실행: bun test tests/
import { beforeAll, describe, expect, test } from "bun:test";
import { createHwp, documentFromBytes } from "../lib/hwpilot";
import { openFormDoc } from "../lib/open-form-doc";
import { fillForm } from "../lib/fill-core";

// 라벨/빈칸 구조의 합성 .hwp 양식
let hwpBytes: Uint8Array;

beforeAll(async () => {
  const blank = await createHwp();
  const doc = await documentFromBytes(blank);
  await doc.addTable("s0", 2, 4, {
    data: [
      ["기업명", "", "대표자", ""],
      ["주소", "", "연락처", ""],
    ],
  });
  hwpBytes = await doc.export();
});

describe("openFormDoc", () => {
  test("합성 바이트를 .hwp 로 판별한다", async () => {
    const doc = await openFormDoc(hwpBytes);
    expect(doc.format).toBe("hwp");
  });

  test("어댑터가 표/셀/라벨을 노출한다", async () => {
    const doc = await openFormDoc(hwpBytes);
    const tables = [...doc.allTables()];
    expect(tables.length).toBe(1);
    const labels = tables[0].cells.map((c) => c.text);
    expect(labels).toContain("기업명");
    expect(labels).toContain("대표자");
    expect(labels).toContain("주소");
    expect(labels).toContain("연락처");
  });
});

describe("fillForm on HWP — round-trip", () => {
  test("라벨 인접 셀을 채우고 .hwp 로 저장 후 값이 보존된다", async () => {
    const doc = await openFormDoc(hwpBytes);
    const answers = {
      기업명: "주식회사 보조금버디",
      대표자: "홍길동",
      주소: "서울특별시 강남구",
      연락처: "010-1234-5678",
    };
    const report = await fillForm(doc, answers);
    expect(report.filled_count).toBeGreaterThanOrEqual(3);

    const out = await doc.toBytes();
    // 여전히 .hwp 바이너리
    const reopened = await openFormDoc(out);
    expect(reopened.format).toBe("hwp");

    // 채운 값들이 재로딩 후에도 살아있어야 함
    const allText: string[] = [];
    for (const t of reopened.allTables()) for (const c of t.cells) allText.push(c.text);
    for (const v of Object.values(answers)) {
      expect(allText.some((t) => t.includes(v))).toBe(true);
    }
  });

  test("toBytes 전(메모리)에도 setText 가 반영된다", async () => {
    const doc = await openFormDoc(hwpBytes);
    await fillForm(doc, { 기업명: "메모리반영" });
    const inMemory: string[] = [];
    for (const t of doc.allTables()) for (const c of t.cells) inMemory.push(c.text);
    expect(inMemory).toContain("메모리반영");
  });
});
