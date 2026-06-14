// 프리뷰 표 렌더용 그리드 빌더.
//
// 병합셀(rowspan/colspan>1)은 좌상단 좌표에만 셀이 존재한다(HWPX). 전체 nrows×ncols
// 격자를 훑으면 병합에 가려진 좌표에서 "유령 빈칸"이 생긴다. 이 헬퍼는 각 행마다
// 그 행에서 "시작"하는 셀만(= cell.row === r) col 순으로 돌려줘서, <td>에 rowSpan/colSpan을
// 그대로 emit하면 병합이 정확히 재현되도록 한다.

import type { StructureCell, StructureTable } from "./doc-structure";

/** table 의 셀들을 행별로 묶어 반환 (각 행: 그 행에서 시작하는 셀들을 col 오름차순) */
export function buildPreviewRows(table: StructureTable): StructureCell[][] {
  const rows: StructureCell[][] = Array.from({ length: table.nrows }, () => []);
  for (const cell of table.cells) {
    if (cell.row >= 0 && cell.row < table.nrows) rows[cell.row].push(cell);
  }
  for (const row of rows) row.sort((a, b) => a.col - b.col);
  return rows;
}
