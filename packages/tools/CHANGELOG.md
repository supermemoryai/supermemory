# @supermemory/tools changelog

## 2.1.2 - 2026-07-18

- Fix OpenAI middleware to accept programmatic `apiKey` and `baseUrl` options.
- Make OpenAI middleware fail open when Supermemory memory retrieval fails for Chat Completions or Responses API calls.
- Align OpenAI middleware `addMemory` default to `never` and document explicit `always` opt-in for auto-save.
- Preserve query-mode search results that overlap profile memories.
- Add focused OpenAI middleware regression coverage.
