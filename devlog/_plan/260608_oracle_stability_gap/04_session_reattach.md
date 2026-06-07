# 04 — Session Reattach / Resume

Severity: **P1**

## Problem

agbrowse는 프로세스 종료 후 진행 중인 ChatGPT Pro 세션에 재접속하는 기능이 없다.
Pro 모드는 응답에 2-10분 걸릴 수 있어, CLI가 죽거나 OS sleep 되면 결과를 잃는다.

## Oracle Approach

### 1. Signal Handler + In-Flight 보호 (chromeLifecycle.ts:60-130)
```typescript
const handleSignal = (signal: NodeJS.Signals) => {
    const inFlight = opts?.isInFlight?.() ?? false;
    const leaveRunning = keepBrowser || inFlight;
    if (leaveRunning) {
        // Chrome을 죽이지 않고 reattach hint만 저장
        await opts?.emitRuntimeHint?.();
        logger('Session still in flight; reattach with "oracle session <slug>"');
    } else {
        await chrome.kill();
    }
};
```

### 2. Reattach Flow (reattach.ts)
```
1. Runtime hint에서 chromePort / browserWSEndpoint 읽기
2. listRemoteChromeTargets()로 살아있는 탭 찾기
3. pickTarget()으로 대화 탭 선택
4. CDP 재연결 (Runtime/DOM/Page enable)
5. 대화가 열려있는지 확인 → 없으면 sidebar에서 검색
6. waitForAssistantResponse()로 진행 중인 응답 캡처
7. captureAssistantMarkdown()으로 최종 텍스트 추출
```

### 3. Conversation Recovery
```typescript
// sidebar에서 대화를 찾아 열기 (retry 포함)
const opened = await openConversationFromSidebarWithRetry(
    Runtime,
    { conversationId, preferProjects: true, promptPreview },
    15_000,
);
```

### 4. Deep Research Reattach
Deep Research 모드도 reattach 지원:
```typescript
if (config?.researchMode === "deep") {
    const researchResult = await waitForDeepResearch(Runtime, logger, timeoutMs, ...);
    return { answerText: researchResult.text, ... };
}
```

## agbrowse Current State

### 1. Session Persistence
`session-store.mjs`에 세션 데이터 저장 (sessionId, url, promptHash 등).
`--session <id>` 플래그로 이전 세션 참조 가능.

### 2. Session Resume
`session.mjs`에서 기본적인 세션 관리는 있으나:
- **프로세스 종료 시 Chrome 유지**: 미지원
- **CDP 재연결**: 미지원 (새 탭/새 대화만)
- **진행 중 응답 캡처**: 미지원
- **Sidebar 검색으로 대화 복구**: 미지원

### 3. Signal Handler
없음. SIGINT 시 Chrome이 함께 종료됨.

## Gap Summary

| Feature | oracle | agbrowse | Gap |
|---------|--------|----------|-----|
| SIGINT in-flight protection | ✅ Chrome 유지 | ❌ | **P1** |
| CDP reconnect to existing tab | ✅ | ❌ | **P1** |
| Sidebar conversation search | ✅ retry 포함 | ❌ | **누락** |
| Deep Research reattach | ✅ | ❌ | **누락** |
| Runtime hint persistence | ✅ | ❌ | **누락** |
| Session store | 유사 | ✅ | 비슷 |

## Recommended Patches

1. **[다음]** SIGINT handler에서 in-flight 감지 시 Chrome 유지 + runtime hint 저장
2. **[다음]** `web-ai poll --session <id>` 시 기존 Chrome 탭에 CDP 재연결
3. **[중기]** sidebar에서 conversationId로 대화 찾기/열기
4. **[중기]** Deep Research 세션 reattach 지원
