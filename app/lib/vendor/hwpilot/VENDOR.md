# Vendored: hwpilot (HWP/HWPX SDK)

`.hwp` 바이너리 양식의 **표 셀 자동기입**을 위해 [devxoul/hwpilot](https://github.com/devxoul/hwpilot)
SDK를 빌드해 필요한 서브셋만 들여왔다.

## 출처 / 핀
- repo: https://github.com/devxoul/hwpilot
- commit: `7471fdfa77c72245e538ef33852b3f60aa581042` (2026-04-20, PR #30)
- 빌드: `bun run build` (tsc + tsc-alias) 의 `dist/src/sdk/` 결과물 (alias 해소된 .js + .d.ts)

## 포함 / 제외
- ✅ 포함: `sdk/` (document, document-ops, format-detector, refs, types, edit-types, `formats/hwp/**`, `formats/hwpx/**`)
- ❌ 제외: `markdown/`(remark 의존), `cli/`(commander), `daemon/`, `shared/viewer`(child_process), 원본 `sdk/index.js` 배럴
- 진입점은 직접 만든 `app/lib/hwpilot.ts` (markdown 미참조).

## 런타임 의존성
vendored 코드가 실제로 import하는 npm 패키지: `cfb`, `pako`, `jszip`, `fast-xml-parser`
(`jszip`/`fast-xml-parser`는 기존 보유, `cfb`/`pako` 신규 추가).

## 사용 범위 제약
- **HWP는 표 셀 편집(`tableEdit`)만 사용.** 문단/서식 직접 편집은 현 버전에서
  한컴뷰어 "손상" 경고를 유발(업스트림 `e2e/KNOWN-ISSUES.md`). 어댑터에서 미노출.

## ⚠️ 라이선스 미해결 (TODO)
- 업스트림 README에 "MIT" 문구는 있으나 **LICENSE 파일/`package.json` license 필드가 없음.**
- 상용 배포 전 반드시: (1) 업스트림에 LICENSE 추가 요청 또는 (2) 저작자에게 서면 확인.
- 확정 시 이 디렉터리에 `LICENSE` 동봉할 것.

## 업데이트 방법
위 commit을 클론 → `bun install && bun run build` → `dist/src/sdk/` 를 이 디렉터리로 복사,
`markdown/`·`index.js` 제거, `*.map` 제거. 그 후 `lib/hwpilot.ts` 호환성 확인.
