# 05 — Error Taxonomy Comparison

Severity: **P2**

## Problem

agbrowse는 단일 `WebAiError` 클래스에 errorCode 문자열로 분류한다.
oracle은 3-tier 에러 계층으로 에러 원인별 처리 경로를 구분한다.

## Oracle Error Hierarchy

```
OracleUserError (base)
├── FileValidationError     — 파일 검증 실패 (크기, 형식, 접근)
├── BrowserAutomationError  — 브라우저 자동화 실패 (DOM, 타임아웃, 셀렉터)
└── PromptValidationError   — 프롬프트 검증 실패 (길이, 형식)

OracleTransportError        — API 통신 에러 (별도 계층)
├── client-timeout
├── client-abort
├── connection-lost
├── model-unavailable
└── (API status별 세분화)

OracleResponseError         — API 응답 에러 (별도 계층)
├── responseId, status
├── incompleteReason
└── requestId
```

### 특징
- `category` 필드로 사용자 표시 여부 판단
- `details` 객체로 구조화된 컨텍스트 (promptLength, observedLength 등)
- `cause` 체이닝으로 원본 에러 보존
- Transport 에러에 모델별 가이드 메시지 (예: gpt-5.5-pro 미지원 시 안내)

## agbrowse Error System

```
WebAiError (단일 클래스)
├── errorCode: string       — 'provider.composer-not-visible', 'context.over-budget' 등
├── stage: string           — 'composer-prereq', 'poll', 'internal' 등
├── retryHint: string       — 're-snapshot', 'reduce-files' 등
├── vendor: string
├── selectorsTried: string[]
└── evidence: unknown
```

### 특징
- 잘 정의된 errorCode 카탈로그 (14개+)
- `retryHint`로 에이전트에게 복구 힌트 제공
- `toJSON()` 직렬화로 `--json` 출력 지원
- `wrapError()`로 일반 에러 → WebAiError 변환

## Comparison

| Aspect | oracle | agbrowse |
|--------|--------|----------|
| Error classes | 5개 (3-tier) | 1개 (flat) |
| Error codes | 암묵적 (message 기반) | 명시적 카탈로그 (14+) |
| Retry hint | 없음 (caller가 판단) | ✅ retryHint 필드 |
| JSON serialization | 없음 | ✅ toJSON() |
| Error cause chain | ✅ | ✅ |
| Transport vs User | ✅ 분리 | ❌ 혼합 |
| Structured details | ✅ details 객체 | evidence 필드 |

## Assessment

agbrowse의 에러 시스템은 **에이전트 친화적** (errorCode + retryHint + JSON)이라는 점에서
oracle보다 오히려 나은 면이 있다.

부족한 점:
1. Transport vs Browser vs Validation 구분이 없어 에러 핸들링 분기가 어려움
2. 파일 크기 초과 등 사전 검증 에러를 별도 클래스로 분리하면 UX 개선 가능

## Recommended Patches

1. **[중기]** `WebAiError` 서브클래스 추가: `TransportError`, `ValidationError`
2. **[중기]** errorCode에 severity/category prefix 추가 (예: `user.file-too-large`)
3. **[유지]** retryHint + toJSON 패턴은 oracle보다 나으므로 유지
