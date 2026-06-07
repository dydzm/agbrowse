# 01 — Send Button Stability

Severity: **P0**

## Problem

agbrowse의 전송 버튼 클릭이 간헐적으로 실패한다. 특히 파일 첨부 + Pro 모드에서.

## Oracle Approach

### 1. 타임아웃 전략 (promptComposer.ts:660-670)
```
텍스트 전용: 20,000ms
첨부파일 포함: 45,000ms (또는 --browser-attachment-timeout 값)
```

### 2. Enter 키 폴백 (promptComposer.ts:207-223)
```typescript
const clicked = await attemptSendButton(runtime, logger, attachmentNames, ...);
if (!clicked) {
    // CDP Input.dispatchKeyEvent로 Enter 키 전송
    await input.dispatchKeyEvent({ type: "keyDown", key: "Enter", code: "Enter", ... });
    await input.dispatchKeyEvent({ type: "keyUp", key: "Enter", ... });
}
```

### 3. 프롬프트 커밋 검증 (promptComposer.ts:690-854)
전송 후 conversation turn이 실제로 나타났는지 검증:
- 텍스트 매치 (전체 / prefix 120자)
- 새 turn 카운트 증가 확인
- Stop 버튼 / assistant role 출현 감지
- Composer 비움 + URL `/c/` 패턴 복합 폴백

### 4. 셀렉터 범위
```javascript
// oracle — 5개, 더 넓은 폴백
'button[data-testid="send-button"]',
'button[data-testid*="composer-send"]',
'form button[type="submit"]',           // ← agbrowse에 없음
'button[type="submit"][data-testid*="send"]',
'button[aria-label*="Send"]',           // ← 더 넓음
```

## agbrowse Current State

### 1. 타임아웃
```javascript
// chatgpt-composer.mjs:355
const deadline = Date.now() + 8_000;  // 고정 8초
```

### 2. Enter 키 폴백: **없음**
`clickEnabledSendButton()` 실패 시 `false` 반환하고 종료.

### 3. 프롬프트 커밋 검증: **부분적**
`submitPromptFromComposer()`에서 `commitTimeoutMs`까지 대기하지만,
oracle처럼 다중 신호 복합 검증은 하지 않음.

### 4. 셀렉터 범위
```javascript
// chatgpt-composer.mjs:63-69 — 5개, 더 좁은 범위
'button[data-testid="send-button"]',
'button[data-testid*="composer-send"]',
'button[type="submit"][data-testid*="send"]',
'button[aria-label*="Send prompt" i]',   // "Send prompt"만
'button[aria-label*="Send message" i]',  // "Send message"만
```

## Gap Summary

| Feature | oracle | agbrowse | Gap |
|---------|--------|----------|-----|
| Send timeout (text) | 20s | 8s | **2.5x 짧음** |
| Send timeout (file) | 45s | 8s | **5.6x 짧음** |
| Enter key fallback | ✅ | ❌ | **누락** |
| Commit verification | 다중 신호 복합 | 기본적 | **약함** |
| `form button[type="submit"]` | ✅ | ❌ | 폴백 누락 |
| Broad aria-label match | `Send` | `Send prompt/message` | 좁음 |

## Recommended Patches

1. **[즉시]** 텍스트 전용 타임아웃 8s → 20s, 첨부파일 시 45s
2. **[즉시]** 버튼 클릭 실패 시 Enter key fallback 추가 (CDP `Input.dispatchKeyEvent` 또는 Playwright `keyboard.press`)
3. **[다음]** `form button[type="submit"]` 셀렉터 추가
4. **[다음]** aria-label 매치를 `Send` 로 확장
5. **[중기]** 프롬프트 커밋 복합 검증 (turn count + stop button + composer cleared)
