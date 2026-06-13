// 포맷(HWPX/HWP) 무관 양식 추상화.
//
// 표 셀 자동기입 로직(lib/fill-core.ts)이 의존하는 최소 인터페이스.
// - HWPX: lib/hwpx.ts 의 Cell/Table/HwpxDocument 가 구조적으로 만족
// - HWP : lib/adapters/hwp-form-doc.ts 가 hwpilot Document 를 감싸 만족 (후속 단계)

export interface FormCell {
  /** 셀 안 텍스트(여러 텍스트 노드를 이어붙인 결과) */
  readonly text: string;
  /** 행 인덱스 (0-based) */
  readonly row: number;
  /** 열 인덱스 (0-based) */
  readonly col: number;
  /** 셀 텍스트를 새 값으로 교체 */
  setText(value: string): void;
}

export interface FormTable {
  readonly nrows: number;
  readonly ncols: number;
  readonly cells: FormCell[];
  /** (row, col) 위치의 셀 반환; 없으면 null */
  cellAt(row: number, col: number): FormCell | null;
  /** 라벨 셀 오른쪽 인접 셀 */
  neighborRight(cell: FormCell): FormCell | null;
  /** 라벨 셀 아래 인접 셀 */
  neighborBelow(cell: FormCell): FormCell | null;
}

export interface FormDoc {
  readonly format: "hwp" | "hwpx";
  /**
   * 표 목록. **셀 객체의 동일성(identity)이 호출 간 안정적이어야 한다** —
   * buildStructure(doc-structure.ts)가 findLabelTargets 결과의 셀과
   * allTables() 셀을 객체 동일성으로 매칭해 fillable 판정을 한다.
   * (어댑터는 fromBytes 시점에 셀 배열을 1회 생성해 그대로 반환할 것.)
   */
  allTables(): Iterable<FormTable>;
  /** 변경분을 반영한 바이너리(원래 포맷 그대로) */
  toBytes(): Promise<Uint8Array>;
  /** 사람이 읽을 수 있는 텍스트 미리보기 */
  toTextPreview(): string;
}
