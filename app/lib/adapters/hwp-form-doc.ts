// HWP(.hwp 바이너리) 양식을 FormDoc 으로 감싸는 어댑터.
//
// vendored hwpilot SDK(lib/hwpilot.ts)의 Document 를 래핑한다.
// 핵심 제약:
//   - hwpilot 의 셀 편집(tableEdit)은 async 이지만 FormCell.setText 는 sync 다.
//     → setText 는 메모리 값만 갱신하고 변경분을 큐에 쌓아두었다가,
//        toBytes() 직전에 한 번에 tableEdit 로 flush 한다.
//   - HWP 는 "표 셀 편집"만 사용한다 (문단/서식 편집은 현 hwpilot 버전에서
//     한컴뷰어 손상 경고 유발 — VENDOR.md 참고). 이 어댑터는 셀 편집만 노출.

import type { FormCell, FormDoc, FormTable } from "../form-doc";
import { Document, documentFromBytes } from "../hwpilot";

// hwpilot Document.tableList()/tableRead() 는 unknown 을 반환하므로
// 내부에서 아래 알려진 형태로 캐스팅한다 (document-ops.d.ts 기준).
type TableListItem = { ref: string; rows: number; cols: number };
type TableData = {
  ref: string;
  rows: { cells: { ref: string; text: string }[] }[];
};

class HwpFormCell implements FormCell {
  private _text: string;
  constructor(
    readonly ref: string,
    initialText: string,
    readonly r: number,
    readonly c: number,
    private readonly owner: HwpFormDoc,
  ) {
    this._text = initialText;
  }
  get text(): string {
    return this._text;
  }
  get row(): number { return this.r; }
  get col(): number { return this.c; }
  // hwpilot 그리드는 병합을 1×1로 평탄화하므로 항상 1
  get rowspan(): number { return 1; }
  get colspan(): number { return 1; }
  setText(value: string): void {
    this._text = value;
    this.owner.enqueue(this.ref, value);
  }
}

class HwpFormTable implements FormTable {
  readonly cells: HwpFormCell[];
  readonly nrows: number;
  readonly ncols: number;
  private readonly grid: (HwpFormCell | null)[][];

  constructor(cells: HwpFormCell[], nrows: number, ncols: number) {
    this.cells = cells;
    this.nrows = nrows;
    this.ncols = ncols;
    this.grid = Array.from({ length: nrows }, () =>
      Array<HwpFormCell | null>(ncols).fill(null),
    );
    for (const cell of cells) {
      if (cell.r < nrows && cell.c < ncols) this.grid[cell.r][cell.c] = cell;
    }
  }

  cellAt(row: number, col: number): FormCell | null {
    return (row >= 0 && row < this.nrows && col >= 0 && col < this.ncols)
      ? this.grid[row][col]
      : null;
  }

  neighborRight(cell: FormCell): FormCell | null {
    const c = cell as HwpFormCell;
    return c.c + 1 < this.ncols ? this.grid[c.r][c.c + 1] : null;
  }

  neighborBelow(cell: FormCell): FormCell | null {
    const c = cell as HwpFormCell;
    return c.r + 1 < this.nrows ? this.grid[c.r + 1][c.c] : null;
  }
}

export class HwpFormDoc implements FormDoc {
  readonly format = "hwp" as const;
  private readonly _tables: HwpFormTable[] = [];
  private pending: { ref: string; text: string }[] = [];

  private constructor(private readonly doc: Document) {}

  static async fromBytes(bytes: Uint8Array): Promise<HwpFormDoc> {
    const doc = await documentFromBytes(bytes);
    const self = new HwpFormDoc(doc);
    const list = doc.tableList() as TableListItem[];
    for (const t of list) {
      const data = doc.tableRead(t.ref) as TableData;
      const cells: HwpFormCell[] = [];
      let ncols = 0;
      data.rows.forEach((row, r) => {
        row.cells.forEach((cell, c) => {
          cells.push(new HwpFormCell(cell.ref, cell.text, r, c, self));
          if (c + 1 > ncols) ncols = c + 1;
        });
      });
      self._tables.push(new HwpFormTable(cells, data.rows.length, ncols));
    }
    return self;
  }

  /** setText 가 쌓아두는 변경 큐 (같은 ref 는 마지막 값으로 덮어씀) */
  enqueue(ref: string, text: string): void {
    const existing = this.pending.find((p) => p.ref === ref);
    if (existing) existing.text = text;
    else this.pending.push({ ref, text });
  }

  allTables(): Iterable<FormTable> {
    return this._tables;
  }

  async toBytes(): Promise<Uint8Array> {
    // 큐에 쌓인 셀 편집을 순차 적용 (각 tableEdit 는 내부적으로 문서를 재로딩하지만
    // 텍스트만 바꾸므로 ref 는 안정적이다).
    for (const { ref, text } of this.pending) {
      await this.doc.tableEdit(ref, text);
    }
    this.pending = [];
    return this.doc.export();
  }

  toTextPreview(): string {
    return this.doc.text();
  }
}
