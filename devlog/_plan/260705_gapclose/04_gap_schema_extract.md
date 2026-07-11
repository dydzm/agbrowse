# 04 — GAP CLOSE: schema extract를 validator에서 CLI 커맨드로 (M)

status: PLANNED / priority: 1 (시리즈 중 유일한 필수 기능 격차)

"이 페이지에서 가격표만 뽑아줘 → 스키마에 맞는 JSON"이 안 되는 것이
Stagehand 대비 유일하게 수용 불가능한 기능 열위다. 260628 조사
(`02_schema_bound_extraction.md`)가 격차를 정확히 정의했고, 그 후
`web-ai/extract-schema.mjs`가 fail-closed validator로 들어왔지만 command
surface에는 아직 없다. 이 문서는 validator를 실제 `agbrowse extract`
커맨드로 승격하는 범위를 고정한다.

---

## 현재 상태

- `web-ai/extract-schema.mjs`: JSON-schema subset validator (fail-closed).
- `adaptive-fetch/structured-extractor.mjs`: regex 기반 table/heading/list/
  JSON-LD 추출 — 스키마 정의 불가, 비정형 레이아웃 미커버.
- Stagehand 기준선: `extract()`가 Zod/JSON schema 입력을 받아 타입 추론된
  구조화 데이터 반환 (v3 docs 확인, 01번 참조).

## 목표 커맨드

```bash
agbrowse extract "<url-or-current-tab>" \
  --schema ./product.schema.json \
  [--selector "#pricing"] [--instruction "price table only"] \
  [--json] [--browser auto|never]
```

## 2-tier 설계 (260628 문서의 설계 유지, 범위만 확정)

- **Tier 1 (무료, LLM 없음)**: adaptive-fetch 콘텐츠 → structured-extractor
  후보 → schema 매핑 시도 → `extract-schema.mjs` validate. 표/리스트 등
  규칙적 구조에서만 성공. 실패 시 명시적 verdict로 fail-closed.
- **Tier 2 (web-AI fallback, opt-in)**: Tier 1 실패 시 `--escalate-web-ai`
  플래그가 있을 때만 페이지 콘텐츠 + 스키마를 web-AI 레인(로그인된
  ChatGPT/Gemini 세션)으로 보내 JSON 생성 → 동일 validator로 검증.
  **API 키 비용 0** — 이것이 Stagehand(LLM API 비용) 대비 차별점.

## 명시적 비목표

- Stagehand full parity (Zod TS 타입 추론, server-side cache) — 불필요.
- 자체 LLM API 호출 경로 추가 — web-AI 레인이 있는데 API 비용을 새로
  만드는 것은 포지션 훼손.
- structured-extractor의 전면 재작성 — Tier 1은 기존 추출기 재사용.

## 수용 기준

1. 정적 표 페이지에서 `--schema`로 valid JSON 반환 (Tier 1, LLM 0회).
2. 비정형 페이지에서 Tier 1이 fail-closed verdict 반환 (조용한 실패 금지).
3. `--escalate-web-ai` 시 web-AI 세션 경유 결과가 같은 validator 통과.
4. `--json` envelope에 tier/source/evidence 필드 포함 (기존 fetch envelope
   컨벤션 준수).
5. CAPABILITY_TRUTH_TABLE에 extract 행 추가 + 통합 테스트.

effort: M (validator·추출기·web-ai 레인 모두 기존 자산, 신규는 커맨드 배선과 스키마 매핑)
