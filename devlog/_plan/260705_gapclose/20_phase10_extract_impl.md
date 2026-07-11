# 20 — Phase 10 구현 계획: `agbrowse extract` (Tier 1 LLM-free)

status: DONE (2026-07-05) / work-phase: gapclose 기능 트랙 Phase 10

## A-audit 반영 (2026-07-05, FAIL → 수정)

감사에서 확인된 블로커와 수정:

1. **BLOCKER**: `runAdaptiveFetch` envelope은 raw `html`을 보존하지 않는다
   (`index.mjs:604-644` — content만, 그마저 bm25 필터 가능). →
   **수정 (v3, 더 단순)**: adaptive-fetch를 수정하지 않는다. extract는
   `fetcher.mjs`의 `fetchTextCandidate`를 직접 사용 — `fetched.text`가
   raw body라서 HTML이 보존된다. JS-rendered 페이지는 Phase 10 비목표로
   명시 (Tier 2 / 후속에서 CDP get-dom 경로 검토). blast radius가
   공유 코드 0으로 줄어든다.
2. `validateExtraction`은 코어션 없음 (원본 data 반환) → 매퍼에서 코어션
   후 validate (플랜 원안대로, 확인됨).
3. `structured-extractor`는 `<th>` 전수를 headers로 수집 (thead/첫행 구분
   없음), `mainText`/`wordCount`는 placeholder → 매퍼는 headers가 비어있을
   때 rows[0]을 헤더 후보로 시도하는 fallback을 갖는다.
4. `case 'extract':` 충돌 없음, fixture-server.mjs 패턴 존재, 넘버링 OK
   (확인됨).

## Loop-spec

- Loop archetype: spec-satisfaction repair (verifier = vitest + fail-closed 계약)
- Trigger: 04_gap_schema_extract.md 결정
- Goal: `agbrowse extract`가 URL/로컬 HTML에서 JSON-schema-bound 데이터를
  LLM 없이 추출하고, 실패 시 명시적 envelope로 fail-closed.
- Non-goals: Zod/TS 타입 추론, server cache, LLM API 경로, web-AI Tier 2
  자동 실행(Phase 10에서는 `--escalate-web-ai` 배선만, 기본 off).
- Verifier: `npx vitest run test/unit/browser-extract*.test.mjs
  test/integration/extract-cli.test.mjs` green + 기존 스위트 회귀 없음.
- Stop: 수용 기준 5개 충족 시 D. 동일 실패 2회 반복 시 root-cause 모드.
- Memory artifact: 이 문서 + D 시 결과 추기.

## 파일 변경 맵

| 파일 | 변경 | 내용 |
| --- | --- | --- |
| `skills/browser/extract.mjs` | NEW | `runExtractCli(argv, deps)` + 순수 매핑 함수 `mapStructuredToSchema` |
| `skills/browser/browser.mjs` | EDIT | `case 'extract':` 배선 + usage 헤더 1줄 |
| `test/unit/browser-extract-mapping.test.mjs` | NEW | 매핑 순수 함수 단위 테스트 |
| `test/integration/extract-cli.test.mjs` | NEW | CLI envelope 계약 테스트 (fixture HTML, 네트워크 없음) |
| `structure/commands.md` | EDIT | extract 커맨드 행 추가 (C 단계 SoT sync) |
| `structure/CAPABILITY_TRUTH_TABLE.md` | EDIT | extract 행 추가 (C 단계 SoT sync) |

## 설계

```
agbrowse extract [<url>] --schema <file.json>
    [--from-file <page.html>]      # fetch 생략, 로컬 HTML (테스트/오프라인)
    [--selector <css>]             # adaptive-fetch에 전달
    [--source table|jsonld|auto]   # 기본 auto: jsonld 먼저, 다음 tables
    [--json] [--browser auto|never|required]
    [--escalate-web-ai --vendor <v>]   # Tier 2 opt-in (기본 off)
```

- Tier 1 파이프라인: `--from-file` 로컬 HTML 또는 `fetchTextCandidate`
  (raw body 보존) → `extractStructuredContent` → 매핑 → `validateExtraction`.
  JS-rendered 페이지는 Phase 10 비목표 (fail-closed verdict로 안내).
- 매핑 규칙 (fail-closed):
  - schema `type:array, items:object` → 각 table에 대해 headers ↔ item
    properties 이름 매칭 (case-insensitive, trim). 최다 매칭 table 선택,
    required 전부 커버 못 하면 후보 탈락. 셀 값은 target type으로 보수적
    코어션 (number/integer: 숫자+구분자만 허용, boolean: true/false/yes/no).
  - schema `type:object` → JSON-LD 객체 중 required 키 커버하는 첫 후보,
    없으면 단일행 table 시도.
  - 후보 0개 → `ok:false, verdict:'no_mappable_structure'` + 가용 구조
    요약(테이블 수/헤더 목록) 리턴. 조용한 실패 금지.
- envelope: `schemaVersion:'agbrowse-extract-v1'`, ok, tier(1|2), verdict,
  data|null, errors[], candidatesConsidered, source, finalUrl, evidence[].
  기존 fetch/verify envelope 필드명 컨벤션 준수.
- Tier 2 (`--escalate-web-ai`): Tier 1 실패 시에만, `web-ai query
  --inline-only`로 content+schema 프롬프트 → 응답 JSON 파싱 →
  동일 `validateExtraction`. deps 주입으로 테스트에서 mock.

## 수용 기준 (04번 문서 승계)

1. 정적 표 HTML에서 `--schema`로 valid JSON (LLM 0회).
2. 매핑 불가 페이지에서 fail-closed verdict + 구조 요약.
3. `--escalate-web-ai` mock 경로가 동일 validator 통과.
4. `--json` envelope에 tier/source/evidence 포함.
5. truth table 행 + 테스트 green.

## 결과 (D에서 추기)

- 구현: `skills/browser/extract.mjs` (runExtractCli, mapStructuredToSchema,
  coerceCell, parseJsonFromText), `case 'extract':` 배선 + usage 라인.
- 감사 v3 반영: adaptive-fetch 미수정, `fetchTextCandidate` 직접 사용으로
  raw HTML 보존 (공유 코드 blast radius 0). th-없는 테이블은 rows[0] 헤더
  fallback.
- 테스트: 단위 18개(mapping/coercion/JSON 파싱/Tier2 mock 3종) + 통합
  6개(envelope 계약/fail-closed/exit code) = 24개 green. 전체 스위트
  1202 passed (기존 실패 2건은 stash 검증으로 본 변경과 무관 확인 —
  post-action-smoke, self-heal-smoke는 라이브 브라우저 필요 스위트).
- 라이브 스모크: w3schools 표 → 스키마 매핑 성공 (LLM 0회);
  MDN/Wikipedia처럼 구조 불일치 페이지 → `no_mappable_structure` +
  structuresAvailable 요약으로 fail-closed. 수용 기준 5개 전부 충족.
- SoT sync: `structure/commands.md` Extract 행, CAPABILITY_TRUTH_TABLE
  beta 행 추가.
