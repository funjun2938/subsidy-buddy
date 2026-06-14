# HWP 양식 자동기입 통합 설계

> 브랜치: `feat/doc-studio` · 작성일: 2026-06-13
> 목표: 현재 **HWPX 전용** 표 셀 자동기입을 **HWP(바이너리 .hwp)까지** 확장한다.

---

## 1. 배경 & 목표

기업마당 등에서 내려받는 정부 지원사업 신청서 원문 양식은 상당수가 **구형 `.hwp` 바이너리**다.
현재 `/api/fill-hwp-ai`는 `.hwpx`만 받고 `.hwp`는 415로 거절한다 (`route.ts:40-48`).
사용자가 한컴오피스에서 직접 `.hwpx`로 변환해야 하는 마찰이 있다.

**목표**: `.hwp`를 업로드하면 그대로 표 셀을 자동기입하고 `.hwp`로 돌려준다. HWPX 경로는 그대로 유지한다.

---

## 2. 스파이크 결과 (의사결정 근거)

라이브러리 후보 검증 끝에 **`devxoul/hwpilot`** (MIT, TypeScript) 채택.

| 검증 항목 | 결과 |
|---|---|
| 실제 정부 양식(`표준근로계약서.hwp`, 69KB) 파싱 | ✅ 표 10개 인식 |
| 표 셀 채우기 → `.hwp`로 저장 → 재로딩 | ✅ 값 정확, 인접 셀 보존, 포맷 유지 |
| `validateHwpBuffer` 구조 검증 | ✅ 오류 없음 |
| 스택 호환 | ✅ `cfb`·`jszip`·`fast-xml-parser`·`pako` (우리가 쓰는 것과 동일) |
| 서버리스(Vercel nodejs runtime) | ✅ 순수 JS, 네이티브 의존 없음 |

**핵심 제약 (반드시 지킬 것):**
- ⚠️ **HWP 문단(paragraph) 직접 편집은 현재 버그** — 한컴뷰어 "손상" 경고 (개발자 e2e `KNOWN-ISSUES.md`에 문서화됨).
- ✅ **표 셀 편집(`tableEdit`)은 뷰어 통과** — 우리 용례가 정확히 이것이므로 **표 셀만 사용**한다. 문단/서식 편집 API는 HWP에 쓰지 않는다.
- ⚠️ **npm 미배포** (`npm i hwpilot` → 404) · v0.1.0 · 단일 개발자 → 의존 방식은 §7 참조.

### hwpilot SDK 핵심 API
```ts
import { documentFromBytes } from 'hwpilot'          // .hwp / .hwpx 자동 판별
const doc = await documentFromBytes(bytes)
doc.format                       // 'hwp' | 'hwpx'
doc.tableList()                  // [{ ref:'s0.t6', rows:5, cols:7 }, ...]
doc.tableRead('s0.t6')           // { rows: [{ cells: [{ ref:'s0.t6.r0.c1', text }] }] }
await doc.tableEdit('s0.t6.r0.c1', '값')
const out = await doc.export()   // Uint8Array (.hwp 그대로)
```

---

## 3. 현재 아키텍처 (HWPX 전용)

```
/api/fill-hwp-ai (route.ts)
  1. multipart 파싱 (hwpx만 허용)
  2. HwpxDocument.fromBytes()            ← lib/hwpx.ts
  3. summarizeForPreview() → tableGroups ← lib/hwpx-filler.ts  [라벨 추출]
  4. runLLMForLabels(tableGroups, ...)   ← route 내부  [Gemini→Claude, 포맷무관]
  5. fillDocument(doc, aiAnswers)        ← lib/hwpx-filler.ts  [라벨→인접셀]
  6. doc.toBytes() → zip(filled.hwpx + report.json + preview.txt)
```

**관찰**: 4단계(LLM 답변 생성)는 `tableGroups`(표별 라벨)만 입력받고 `{라벨: 값}`을 출력 → **완전히 포맷 무관**.
포맷에 묶인 건 ②파싱 ③라벨추출 ⑤셀주입 ⑥직렬화 뿐.

`fillDocument`의 로직(`lib/hwpx-filler.ts`)도 사실상 포맷 무관 — `Table`/`Cell`이 다음만 제공하면 된다:
`cell.text`, `cell.setText()`, `table.neighborRight(cell)`, `table.neighborBelow(cell)`, `table.cells`.

---

## 4. 목표 아키텍처 (포맷 추상화)

공통 인터페이스 `FormDoc`를 두고, 라우트는 포맷을 모른 채 오케스트레이션만 한다.

```ts
// lib/form-doc.ts (신규)
export interface FormCell { text: string; setText(v: string): void }
export interface FormTable {
  index: number; nrows: number; ncols: number;
  cells: FormCell[];
  neighborRight(c: FormCell): FormCell | null;
  neighborBelow(c: FormCell): FormCell | null;
}
export interface FormDoc {
  readonly format: 'hwp' | 'hwpx';
  allTables(): Iterable<FormTable>;
  toBytes(): Promise<Uint8Array>;
  toTextPreview(): string;
}
```

```
                       ┌────────────────────────────┐
   .hwp / .hwpx  ──►   │  openFormDoc(bytes, name)   │  포맷 판별 + 어댑터 선택
                       └─────────────┬──────────────┘
                                     │ FormDoc
        ┌────────────────────────────┼────────────────────────────┐
        ▼                                                          ▼
  HwpxFormDoc (기존 lib/hwpx.ts 래핑, 무변경)         HwpFormDoc (hwpilot 래핑, 신규)
        │                                                          │
        └──────────────► lib/fill-core.ts (공유) ◄─────────────────┘
                 라벨 정규화 · 답변 lookup · pickTarget 인접 · fillForm()
```

### 4.1 공유 코어 추출 — `lib/fill-core.ts`
`lib/hwpx-filler.ts`에서 **포맷 무관 로직을 그대로 이동**:
`normalize`, `looksLikeLabel`, `LabelResolver`, `buildAnswerLookup`, `pickTarget`, 그리고
`fillForm(doc: FormDoc, answers)` (= 기존 `fillDocument`를 `FormDoc` 기준으로 일반화).
`summarizeForPreview`/`tableGroups` 추출도 `FormDoc` 기준으로 일반화.
→ **LLM 프롬프트, 라벨 사전(`label-map.ts`), 인접셀 점수 로직은 HWP/HWPX가 100% 공유.**

### 4.2 HWPX 어댑터 — `lib/adapters/hwpx-form-doc.ts`
기존 `HwpxDocument`/`Table`/`Cell`은 이미 시그니처가 일치 →
얇은 래퍼(또는 `implements FormDoc` 추가)만으로 끝. **기존 동작/검증 결과 보존**.

### 4.3 HWP 어댑터 — `lib/adapters/hwp-form-doc.ts` (신규)
hwpilot `Document`를 `FormDoc`로 감싼다.

- 로드: `documentFromBytes(bytes)` → `tableList()`/`tableRead()`로 그리드 구성.
- `FormCell`: `{ ref, text }`. `setText(v)`는 **즉시 쓰지 않고** 변경분을 큐에 모았다가
  `toBytes()` 직전 `await doc.tableEdit(ref, v)` 일괄 적용 (hwpilot의 op은 async라 동기 `setText` 시그니처와 맞추기 위함).
- `neighborRight`: 같은 row의 다음 cell. `neighborBelow`: 다음 row의 같은 col 인덱스.
  (hwpilot `rows[].cells[]`는 정규화된 그리드라 인덱스로 계산. 병합셀은 ref 중복으로 판별해 스킵.)
- `toBytes()`: 큐 flush 후 `doc.export()`.
- `toTextPreview()`: `doc.text()`.

> 동기 `setText` ↔ 비동기 `tableEdit` 간극은 "변경 큐 + flush" 패턴으로 흡수한다.
> (대안: `fill-core`를 async로 바꾸는 것 — 변경폭이 커서 비채택.)

### 4.4 라우트 변경 — `app/api/fill-hwp-ai/route.ts`
- 확장자 화이트리스트에 `.hwp` 추가, 415 거절 제거.
- ②③⑤⑥을 `openFormDoc()` + `fill-core` 호출로 교체 (포맷 분기 사라짐).
- 출력 파일명/zip 엔트리를 포맷에 맞게: `.hwp`면 `filled.hwp`, `.hwpx`면 `filled.hwpx`.
- 응답 헤더(`X-Filled-Count` 등) 동일 유지 → **클라이언트(`generate/page.tsx`) 변경 최소화**.
- `extract-fields` 경로도 동일 추상화 재사용 가능(후속).

---

## 5. 변경 범위 요약

| 파일 | 변경 |
|---|---|
| `lib/form-doc.ts` | 🆕 공통 인터페이스 |
| `lib/fill-core.ts` | 🆕 `hwpx-filler.ts`에서 포맷무관 로직 이동·일반화 |
| `lib/adapters/hwpx-form-doc.ts` | 🆕 기존 HwpxDocument 래핑 |
| `lib/adapters/hwp-form-doc.ts` | 🆕 hwpilot 래핑 (HWP) |
| `lib/hwpx-filler.ts` | ♻️ fill-core 재노출 shim으로 축소(하위호환) 또는 제거 |
| `app/api/fill-hwp-ai/route.ts` | ♻️ `.hwp` 허용 + openFormDoc 사용 |
| `lib/vendor/hwpilot/**` 또는 deps | 🆕 §7 |
| `next.config.ts` | ♻️ (git/vendoring 방식이면) transpile 설정 |
| `app/generate/page.tsx` | ♻️ 업로드 accept에 `.hwp` 추가, 안내문구 (소폭) |

---

## 6. 리스크 & 완화

| 리스크 | 완화 |
|---|---|
| hwpilot v0.1.0 미성숙·미배포 | 커밋 핀 고정(§7), **표 셀 API만** 사용, 우리 e2e로 가드 |
| HWP 문단편집 손상 버그 | 우리는 표 셀만 → 영향권 밖. 어댑터에서 문단/서식 쓰기 미노출 |
| 한컴뷰어 실측 미확인(Mac 한컴 부재) | 구조검증+개발자 e2e 의존. **GA 전 한컴 설치 PC에서 육안 1회 확인** 체크리스트화 |
| export 시 파일 크기 변동(재압축) | round-trip+validate 통과로 내용 보존 확인. 회귀 테스트에 크기 아닌 셀값 기준 |
| 병합셀(rowspan/colspan) 인접 계산 차이 | 우선 단순 그리드로 지원, 병합 양식은 unmatched로 리포트(기존도 동일 한계) |
| **다중 텍스트런 셀 잔여 텍스트**(Step 4 발견) | hwpilot 의 HWP 셀 쓰기는 첫 런만 교체 → placeholder("   시   분~   시   분") 잔여가 남음. HWPX(hwpx.ts)는 잔여 비움. 신청서 값 셀은 보통 비어있어 영향 적으나, 필요 시 hwpilot writer 패치 또는 셀 클리어 전처리 검토 |
| 업스트림 변경/방치 | MIT라 최악의 경우 vendoring 영구 동결 가능 |

---

## 7. 의존성 전략 (hwpilot 도입 방식)

hwpilot은 npm 미배포 + `exports`가 `.ts` 소스를 가리킴.

**1안 (PoC 권장): git 핀 + transpilePackages**
```jsonc
// package.json
"hwpilot": "github:devxoul/hwpilot#<commit-sha>"   // 커밋 고정
```
```ts
// next.config.ts — transpilePackages: ['hwpilot']  (TS 소스 직접 트랜스파일)
```
장점: 빠름, 업스트림 fix 흡수 용이. 단점: 빌드가 외부 소스 구조에 의존.

**2안 (GA 하드닝): 최소 서브셋 vendoring**
`src/sdk/`, `src/formats/hwp/`, `src/formats/hwpx/`(필요분), `src/shared/`만
`app/lib/vendor/hwpilot/`로 복사 + `@/` alias 치환 + 출처/LICENSE 명기.
장점: 공급망 리스크 0, 빌드 자립. 단점: 업스트림 fix 수동 반영.

> 권장 순서: **1안으로 PoC → 안정화되면 2안으로 동결**.
> 어느 쪽이든 `app/AGENTS.md` 지침대로 next.config 수정 전 `node_modules/next/dist/docs/` 확인.

---

## 8. 단계별 구현 계획

1. **의존성 도입** (1안) + 빌드 통과 확인 (`npm run build`).
2. **fill-core 추출** — `hwpx-filler.ts` → `fill-core.ts` (포맷무관 부분), HWPX 경로 회귀 무손상 확인.
3. **HWPX 어댑터** — 기존 동작 유지 (golden test: 동일 입력 → 동일 filled 결과).
4. **HWP 어댑터** — hwpilot 래핑 + 변경 큐/flush + 인접 계산.
5. **라우트 확장** — `.hwp` 허용, openFormDoc 분기.
6. **클라 소폭** — accept/안내.
7. **테스트** (§9) → §6 GA 체크.

---

## 9. 테스트 계획

- **단위**: `fill-core`의 `LabelResolver`/`pickTarget`/`buildAnswerLookup` (포맷 독립).
- **HWP 어댑터 e2e**: 실제 정부 .hwp 양식 N종(근로계약서/원천징수영수증/고소장 등 hwpilot fixture 재활용 + 기업마당 실양식 1~2종) →
  표 셀 채우기 → export → 재로딩 → 셀값 일치 + 인접 보존 + `validateHwpBuffer` 통과.
- **HWPX 회귀**: 기존 양식으로 변경 전/후 filled 결과 동일.
- **라우트 통합**: `.hwp`/`.hwpx` 각각 multipart POST → zip 응답·헤더 검증.
- **수동 1회**: 한컴오피스 설치 PC에서 filled.hwp 육안 오픈(손상경고 無) — GA 게이트.

---

## 10. 결정 사항 / 오픈 이슈

- ✅ 라이브러리: hwpilot (표 셀 한정).
- ✅ 추상화: `FormDoc` 공통 인터페이스 + 어댑터 2개, 공유 `fill-core`.
- ✅ 의존성: 1안(git 핀)으로 시작 — 핀 커밋 `7471fdfa77c72245e538ef33852b3f60aa581042` (2026-04-20, PR #30 nested-tables fix). 스파이크 검증에 사용한 그 커밋.
- ⏳ PDF 동시출력(현재 `X-Pdf-Status: skipped`)은 본 설계 범위 밖 — 별도 검토.
- ⏳ 별도 "문서 스튜디오" 페이지 분리(원래 대주제)는 이 통합 위에 얹는 후속 단계.
</content>
