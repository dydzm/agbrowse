# 02 — Attachment Upload & Chip Verification

Severity: **P0**

## Problem

agbrowse는 파일 업로드 후 ChatGPT UI에 attachment chip이 나타났는지 확인하지 않고
바로 전송 버튼을 누른다. 업로드가 완료되지 않은 상태에서 전송하면 버튼이 disabled이거나
파일 없이 전송된다.

## Oracle Approach

### 1. Attachment Ready 확인 (promptComposer.ts:340-580)
oracle은 전송 전에 `buildAttachmentReadyExpression()` — 약 240줄의 DOM 검사 로직으로 다음을 확인:

- **Chip 매칭**: 업로드된 파일명이 UI chip의 텍스트/aria-label/title에 나타나는지
- **Truncation 대응**: ChatGPT가 긴 파일명을 `…`로 자르는 경우 prefix+suffix 매칭
- **Input[type=file] 검증**: `<input type="file">` 요소의 `files` 속성에 파일이 있는지
- **Count 폴백**: 이름 매칭 불가 시 "Remove" 버튼 수 ≥ 업로드 파일 수로 판단
- **Upload status 감지**: `[data-state="uploading"]`, `[aria-busy="true"]` 등으로 업로드 중 감지

### 2. Attachment Upload (attachments.ts)
```typescript
// 업로드 → 시그널 체크 루프
const signals = await readAttachmentSignals(attachment.name);
// uiMatch, inputMatch, uploading 등 복합 판단
```

- Composer root를 동적으로 탐색 (send 버튼, 프롬프트 입력 필드 기준)
- 파일 수 카운터로 전체 vs 부분 업로드 구별
- `attachmentDataTransfer.ts`: CDP DOM domain으로 직접 DataTransfer 이벤트 생성

### 3. 타임아웃
```typescript
// 첨부파일 있을 때 send button 대기: 45초 (기본)
// --browser-attachment-timeout으로 커스텀 가능
function sendButtonTimeoutMs(attachmentNames?, attachmentTimeoutMs?): number {
    if (!attachmentNames?.length) return 20_000;
    return attachmentTimeoutMs ?? 45_000;
}
```

## agbrowse Current State

### 1. Attachment Ready 확인
`chatgpt-attachments.mjs`에 `buildAttachmentReadyExpression()` 존재하나,
**send 플로우에서 호출하지 않음**. 독립적인 체크 함수로만 존재.

### 2. Upload Flow
```javascript
// chatgpt-attachments.mjs
// preflight → setInputFiles → chip 확인
```
Playwright `setInputFiles` 사용. chip 출현 대기는 있으나 send 전 검증과 분리됨.

### 3. 타임아웃
Send button: 고정 8초 (첨부파일 유무 무관)

## Gap Summary

| Feature | oracle | agbrowse | Gap |
|---------|--------|----------|-----|
| Chip readiness before send | ✅ 240줄 검증 | ❌ send와 분리 | **P0** |
| Upload status polling | `[data-state]`, `[aria-busy]` | 없음 | **누락** |
| Filename truncation match | prefix+suffix | 없음 | **누락** |
| Count-based fallback | Remove 버튼 수 | 없음 | **누락** |
| DataTransfer fallback | CDP DOM domain | 없음 | **누락** |
| Attachment-aware timeout | 45s configurable | 8s fixed | **P0** |

## Recommended Patches

1. **[즉시]** `attemptSendButton`에서 첨부파일 있을 때 chip ready 대기 로직 통합
2. **[즉시]** 첨부파일 전용 타임아웃 분리 (45초 기본)
3. **[다음]** upload status selector 감시 (`[data-state="uploading"]` 등)
4. **[다음]** 파일명 truncation 대응 (prefix/suffix 매칭)
5. **[중기]** CDP DataTransfer 폴백 (Playwright setInputFiles 실패 시)
