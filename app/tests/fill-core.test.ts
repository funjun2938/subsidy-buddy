// fill-core 의 포맷 무관 로직 단위 테스트 (인메모리 mock FormDoc 사용).
// 실행: bun test tests/
import { describe, expect, test } from "bun:test";
import { fillForm, summarizeFormForPreview } from "../lib/fill-core";
import type { FormCell, FormDoc, FormTable } from "../lib/form-doc";

// ── 인메모리 mock ──────────────────────────────────────────────────────────────
class MockCell implements FormCell {
  private _text: string;
  constructor(text: string, readonly r: number, readonly c: number) {
    this._text = text;
  }
  get text() { return this._text; }
  setText(v: string) { this._text = v; }
}

class MockTable implements FormTable {
  readonly cells: MockCell[] = [];
  readonly nrows: number;
  readonly ncols: number;
  private grid: (MockCell | null)[][];
  constructor(rows: string[][]) {
    this.nrows = rows.length;
    this.ncols = Math.max(...rows.map((r) => r.length));
    this.grid = Array.from({ length: this.nrows }, () =>
      Array<MockCell | null>(this.ncols).fill(null),
    );
    rows.forEach((row, r) =>
      row.forEach((t, c) => {
        const cell = new MockCell(t, r, c);
        this.cells.push(cell);
        this.grid[r][c] = cell;
      }),
    );
  }
  neighborRight(cell: FormCell): FormCell | null {
    const m = cell as MockCell;
    return m.c + 1 < this.ncols ? this.grid[m.r][m.c + 1] : null;
  }
  neighborBelow(cell: FormCell): FormCell | null {
    const m = cell as MockCell;
    return m.r + 1 < this.nrows ? this.grid[m.r + 1][m.c] : null;
  }
}

class MockDoc implements FormDoc {
  readonly format = "hwpx" as const;
  constructor(private tables: MockTable[]) {}
  allTables() { return this.tables; }
  async toBytes() { return new Uint8Array(); }
  toTextPreview() { return ""; }
}

function cellTextOf(doc: MockDoc): string[] {
  const out: string[] = [];
  for (const t of doc.allTables()) for (const c of t.cells) out.push(c.text);
  return out;
}

// ── 테스트 ─────────────────────────────────────────────────────────────────────
describe("fillForm — 라벨 → 인접 셀 채우기", () => {
  test("라벨 오른쪽 빈 셀에 값을 채운다", async () => {
    const table = new MockTable([["기업명", "", "대표자", ""]]);
    const doc = new MockDoc([table]);
    const report = await fillForm(doc, { 기업명: "보조금버디", 대표자: "홍길동" });

    expect(report.filled_count).toBe(2);
    expect(table.cells[1].text).toBe("보조금버디"); // 기업명 오른쪽
    expect(table.cells[3].text).toBe("홍길동");     // 대표자 오른쪽
  });

  test("LABEL_MAP 동의어(상호 → companyName)와 필드키 매칭", async () => {
    const table = new MockTable([["상호", ""]]);
    const doc = new MockDoc([table]);
    // 필드키(companyName)로 답을 줘도 '상호' 라벨에 매칭되어야 함
    const report = await fillForm(doc, { companyName: "주식회사 테스트" });
    expect(report.filled_count).toBe(1);
    expect(table.cells[1].text).toBe("주식회사 테스트");
  });

  test("아래 인접 셀도 채운다(세로형 표)", async () => {
    const table = new MockTable([["연락처"], [""]]);
    const doc = new MockDoc([table]);
    const report = await fillForm(doc, { 연락처: "010-1234-5678" });
    expect(report.filled_count).toBe(1);
    expect(table.cells[1].text).toBe("010-1234-5678");
  });

  test("답이 없는 라벨은 unmatched/unknown 으로 보고하고 채우지 않는다", async () => {
    const table = new MockTable([["기업명", "", "취미", ""]]);
    const doc = new MockDoc([table]);
    const report = await fillForm(doc, {}); // 답 없음
    expect(report.filled_count).toBe(0);
    // 사전 매칭됐지만 값 없음 → unmatched, 사전에 없는 '취미' → unknown
    expect(report.unmatched_labels.some((s) => s.includes("기업명"))).toBe(true);
    expect(report.unknown_cells).toContain("취미");
  });

  test("표준 라벨/값 교차 행 — 값 셀만 채우고 라벨 셀은 보존한다", async () => {
    const table = new MockTable([["기업명", "", "대표자", ""]]);
    const doc = new MockDoc([table]);
    const report = await fillForm(doc, { 기업명: "A", 대표자: "B" });
    expect(report.filled_count).toBe(2);
    expect(table.cells[0].text).toBe("기업명"); // 라벨 보존
    expect(table.cells[2].text).toBe("대표자"); // 라벨 보존
    expect(table.cells[1].text).toBe("A");
    expect(table.cells[3].text).toBe("B");
  });

  test("채운 타깃 셀은 visitedTargets 로 재처리되지 않는다", async () => {
    // 답으로 라벨 키워드('대표자')를 넣어, 채운 셀이 라벨처럼 보이게 만든다.
    // 가드가 없으면 그 셀이 다시 라벨로 처리되어 옆 칸을 덮어쓸 수 있다.
    const table = new MockTable([["담당자", "", "대표자", ""]]);
    const doc = new MockDoc([table]);
    const report = await fillForm(doc, { 담당자: "대표자", 대표자: "사장님" });
    // 담당자 → 오른쪽(cells[1])에 "대표자" 기입. 이 셀은 visited 라 다시 라벨로 처리 안 됨.
    expect(table.cells[1].text).toBe("대표자");
    // 진짜 '대표자' 라벨(cells[2])의 오른쪽(cells[3])에 "사장님"
    expect(table.cells[3].text).toBe("사장님");
    expect(table.cells[2].text).toBe("대표자"); // 라벨 보존
    expect(report.filled_count).toBe(2);
  });
});

describe("summarizeFormForPreview", () => {
  test("표별 라벨 후보를 추출한다", () => {
    const doc = new MockDoc([new MockTable([["기업명", "", "대표자", ""]])]);
    const summary = summarizeFormForPreview("test.hwpx", doc);
    expect(summary.filename).toBe("test.hwpx");
    expect(summary.table_count).toBe(1);
    expect(summary.tables[0].label_candidates).toContain("기업명");
    expect(summary.tables[0].label_candidates).toContain("대표자");
  });
});

// cellTextOf 는 디버깅용 — 미사용 경고 방지
void cellTextOf;
