// 병합셀 인지 프리뷰 그리드 빌더 단위 테스트.
import { describe, expect, test } from "bun:test";
import { buildPreviewRows } from "../lib/preview-grid";
import type { StructureCell, StructureTable } from "../lib/doc-structure";

const cell = (row: number, col: number, rowspan = 1, colspan = 1): StructureCell => ({
  ref: `t0.r${row}.c${col}`, row, col, rowspan, colspan,
  label: `${row},${col}`, isFillable: false,
});

describe("buildPreviewRows", () => {
  test("일반 격자 — 모든 셀이 제자리 행에 들어간다", () => {
    const table: StructureTable = {
      index: 0, nrows: 2, ncols: 2,
      cells: [cell(0, 0), cell(0, 1), cell(1, 0), cell(1, 1)],
    };
    const rows = buildPreviewRows(table);
    expect(rows.length).toBe(2);
    expect(rows[0].map((c) => c.col)).toEqual([0, 1]);
    expect(rows[1].map((c) => c.col)).toEqual([0, 1]);
  });

  test("colspan=2 병합 — 병합셀은 한 번만, 가려진 좌표는 emit 안 함", () => {
    // r0: [colspan=2 한 셀], r1: [c0, c1]
    const table: StructureTable = {
      index: 0, nrows: 2, ncols: 2,
      cells: [cell(0, 0, 1, 2), cell(1, 0), cell(1, 1)],
    };
    const rows = buildPreviewRows(table);
    expect(rows[0].length).toBe(1);          // 유령 빈칸 없음
    expect(rows[0][0].colspan).toBe(2);
    expect(rows[1].length).toBe(2);
  });

  test("rowspan=2 병합 — 좌상단 행에만 존재", () => {
    const table: StructureTable = {
      index: 0, nrows: 2, ncols: 2,
      cells: [cell(0, 0, 2, 1), cell(0, 1), cell(1, 1)],
    };
    const rows = buildPreviewRows(table);
    expect(rows[0].map((c) => c.col)).toEqual([0, 1]); // r0: 병합시작 + c1
    expect(rows[0][0].rowspan).toBe(2);
    expect(rows[1].map((c) => c.col)).toEqual([1]);    // r1: c0은 위 셀이 차지 → 없음
  });
});
