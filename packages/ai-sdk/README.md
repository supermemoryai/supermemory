# @supermemory/ai-sdk (deprecated)

> [!WARNING]
> **Deprecated.** Use [`@supermemory/tools/ai-sdk`](https://www.npmjs.com/package/@supermemory/tools) instead:
>
> ```ts
> import { supermemoryTools } from "@supermemory/tools/ai-sdk"
> ```
>
> Since 2.0.0 this package is a re-export of `@supermemory/tools/ai-sdk` and
> inherits its container-scoping and coercion semantics. This is a behavior
> change:
>
> - Passing both `projectId` and `containerTags` now throws instead of silently
>   ignoring `containerTags`.
> - With no config, calls are scoped to `["sm_project_default"]`. Previously
>   they were unscoped, searching and writing across every project. If you
>   relied on that, pass `containerTags` explicitly.
> - `limit` is coerced, so a model emitting `"5"` is accepted.

## Installation

```bash
npm install @supermemory/ai-sdk
```

## Usage

```ts
import { supermemoryTools } from "@supermemory/ai-sdk"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

const result = await generateText({
  model: openai("gpt-5"),
  messages: [{ role: "user", content: "What do you remember about me?" }],
  tools: supermemoryTools(process.env.SUPERMEMORY_API_KEY!, {
    projectId: "your-project-id",
  }),
})
```

All tools and configuration options are documented under
[`@supermemory/tools`](https://www.npmjs.com/package/@supermemory/tools).

## License

MIT
