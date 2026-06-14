// hwpilot SDK 진입점 (vendored).
//
// devxoul/hwpilot @ 7471fdfa 의 빌드된 dist 중 "표 셀 편집"에 필요한 서브셋만
// lib/vendor/hwpilot/ 에 들여왔다. markdown/cli/daemon/viewer 등은 제외.
// 자세한 출처/범위/라이선스는 lib/vendor/hwpilot/VENDOR.md 참고.
//
// ⚠️ HWP는 "표 셀 편집(tableEdit)"만 사용한다. 문단/서식 직접 편집은
//    현 버전에서 한컴뷰어 손상 경고를 유발하므로 어댑터에서 노출하지 않는다.

export { Document, documentFromBytes } from "./vendor/hwpilot/sdk/document.js";
export { detectFormat } from "./vendor/hwpilot/sdk/format-detector.js";
export type { HwpFormat } from "./vendor/hwpilot/sdk/format-detector.js";
export { validateHwpBuffer } from "./vendor/hwpilot/sdk/formats/hwp/validator.js";
export { createHwp } from "./vendor/hwpilot/sdk/formats/hwp/creator.js"; // 빈 .hwp 생성 (테스트/양식 생성용)
export type {
  HwpDocument,
  Section,
  Table as HwpilotTable,
  TableRow as HwpilotTableRow,
  TableCell as HwpilotTableCell,
} from "./vendor/hwpilot/sdk/types.js";
