# 06 — DOM Diagnostics & Debug Artifacts

Severity: **P2**

## Problem

agbrowse에서 전송 실패나 응답 캡처 실패 시, 원인을 파악하려면 재현이 필요하다.
oracle은 실패 시점의 DOM 상태와 스크린샷을 자동 저장한다.

## Oracle Approach

### 1. logDomFailure (domDebug.ts:37-48)
모든 자동화 실패 지점에서 호출:
```typescript
export async function logDomFailure(Runtime, logger, context: string) {
    if (!logger?.verbose) return;
    logger(`Browser automation failure (${context}); capturing DOM snapshot...`);
    await logConversationSnapshot(Runtime, logger);
}
```

호출 위치:
- `promptComposer.ts`: focus 실패, prompt commit 실패, prompt too large
- `assistantResponse.ts`: 응답 캡처 실패, copy markdown 실패
- `attachments.ts`: 업로드 시그널 실패

### 2. Conversation Snapshot (domDebug.ts:19-32)
```typescript
// 최근 3개 turn의 role, text(200자), testid를 로그에 기록
const turns = Array.from(document.querySelectorAll(CONVERSATION_SELECTOR));
return turns.map((node) => ({
    role: node.getAttribute('data-message-author-role'),
    text: node.innerText?.slice(0, 200),
    testid: node.getAttribute('data-testid'),
}));
```

### 3. captureBrowserDiagnostics (domDebug.ts:50-100)
세션 ID가 있을 때 파일로 저장:
```typescript
export async function captureBrowserDiagnostics(Runtime, logger, context, options) {
    const dir = resolveSessionArtifactsDir(options.sessionId);
    // DOM snapshot → JSON 파일
    // { url, title, turns(last 6, 2000chars each), bodyText(5000chars) }
    await fs.writeFile(domPath, JSON.stringify(result, null, 2));
    // Screenshot → PNG 파일 (Page.captureScreenshot)
    const screenshot = await Page.captureScreenshot({ format: "png", captureBeyondViewport: true });
    await fs.writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
}
```

## agbrowse Current State

### 1. Error Logging
`WebAiError`에 `evidence` 필드로 일부 컨텍스트 저장.
`--json` 출력 시 에러 객체에 포함됨.

### 2. DOM Snapshot
없음. 실패 시 DOM 상태를 캡처하지 않음.

### 3. Screenshot on Failure
없음. `screenshot` 명령은 있으나 자동화 실패 시 자동 캡처하지 않음.

### 4. Session Artifacts
`session-artifacts.mjs` 존재하나, 실패 시 자동 저장은 미구현.

## Gap Summary

| Feature | oracle | agbrowse | Gap |
|---------|--------|----------|-----|
| Auto DOM snapshot on failure | ✅ JSON 파일 | ❌ | **P2** |
| Auto screenshot on failure | ✅ PNG 파일 | ❌ | **P2** |
| Conversation turn log | ✅ last 6 turns | ❌ | **누락** |
| Artifacts directory | ✅ per-session | 존재하나 미활용 | **약함** |
| Verbose mode gating | ✅ logger.verbose | ❌ | **누락** |

## Recommended Patches

1. **[다음]** 주요 실패 지점에서 DOM snapshot 자동 캡처 (conversation turns + body text)
2. **[다음]** 실패 시 screenshot 자동 저장 (CDP `Page.captureScreenshot`)
3. **[중기]** `session-artifacts.mjs`에 진단 데이터 저장 경로 통합
4. **[중기]** `--verbose` 모드에서만 진단 캡처 (성능 영향 최소화)
