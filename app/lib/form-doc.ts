// 포맷(HWPX/HWP) 무관 양식 추상화.
//
// 표 셀 자동기입 로직(lib/fill-core.ts)이 의존하는 최소 인터페이스.
// - HWPX: lib/hwpx.ts 의 Cell/Table/HwpxDocument 가 구조적으로 만족
// - HWP : lib/adapters/hwp-form-doc.ts 가 hwpilot Document 를 감싸 만족 (후속 단계)

export interface FormCell {
  /** 셀 안 텍스트(여러 텍스트 노드를 이어붙인 결과) */
  readonly text: string;
  /** 셀 텍스트를 새 값으로 교체 */
  setText(value: string): void;
}

export interface FormTable {
  readonly nrows: number;
  readonly ncols: number;
  readonly cells: FormCell[];
  /** 라벨 셀 오른쪽 인접 셀 */
  neighborRight(cell: FormCell): FormCell | null;
  /** 라벨 셀 아래 인접 셀 */
  neighborBelow(cell: FormCell): FormCell | null;
}

export interface FormDoc {
  readonly format: "hwp" | "hwpx";
  allTables(): Iterable<FormTable>;
  /** 변경분을 반영한 바이너리(원래 포맷 그대로) */
  toBytes(): Promise<Uint8Array>;
  /** 사람이 읽을 수 있는 텍스트 미리보기 */
  toTextPreview(): string;
}
