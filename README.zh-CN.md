<p align="center">
  <picture>
    <source srcset="apps/web/public/logo-fullmark.svg" media="(prefers-color-scheme: dark)">
    <source srcset="apps/web/public/logo-light-fullmark.svg" media="(prefers-color-scheme: light)">
    <img src="apps/web/public/logo-fullmark.svg" alt="Supermemory" width="400" />
  </picture>
</p>

<p align="center">
  <strong>面向 AI 的记忆与上下文引擎，业界领先。也可以把它当作公司或个人的「大脑」来用。</strong>
</p>

<p align="center">
  <a href="https://supermemory.ai/docs">文档</a> ·
  <a href="https://supermemory.ai/docs/quickstart">快速开始</a> ·
  <a href="https://console.supermemory.ai">控制台</a> ·
  <a href="https://supermemory.link/discord">Discord</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/supermemory"><img src="https://img.shields.io/npm/v/supermemory?style=flat-square&color=blue" alt="npm" /></a>
  <a href="https://pypi.org/project/supermemory/"><img src="https://img.shields.io/pypi/v/supermemory?style=flat-square&color=blue" alt="pypi" /></a>
  <a href="https://supermemory.ai/docs"><img src="https://img.shields.io/badge/docs-supermemory.ai-blue?style=flat-square" alt="docs" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> · <strong>简体中文</strong>
</p>

---

Supermemory 是为 AI 设计的记忆与上下文层。在 **[LongMemEval](https://github.com/xiaowu0162/LongMemEval)、[LoCoMo](https://github.com/snap-research/locomo) 和 [ConvoMem](https://github.com/Salesforce/ConvoMem)** 这三大 AI 记忆基准上均位列第一。

我们是一个研究团队，围绕这个引擎打造插件和工具生态。

你的 AI 在对话之间会把一切忘干净，Supermemory 就是来解决这个问题的。

它会自动从对话中学习，提取事实、构建用户画像、处理知识更新与冲突、淘汰过期信息，并在合适的时机交付合适的上下文。完整 RAG、连接器、文件处理——整个上下文栈，一套系统全部搞定。

| | |
|---|---|
| 🧠 **记忆** | 从对话中提取事实，处理时间变化、冲突，以及自动遗忘。 |
| 👤 **用户画像** | 自动维护的用户上下文——稳定事实 + 近期动态。一次调用，约 50ms。 |
| 🔍 **混合检索** | 一次查询同时跑 RAG 和记忆。知识库文档与个性化上下文一起返回。 |
| 🔌 **连接器** | Google Drive · Gmail · Notion · OneDrive · GitHub——实时 webhook 自动同步。 |
| 📄 **多模态抽取** | PDF、图片（OCR）、视频（转写）、代码（按 AST 切分）。上传即用。 |

这一切都收敛在我们统一的记忆结构和本体里。

<img width="1414" height="937" alt="image" src="https://github.com/user-attachments/assets/8863b6d9-c043-4c75-b200-4f1759e7edaf" />


---

## 怎么用 Supermemory

<table>
<tr>
<td width="50%" valign="top">

<h3>🧑‍💻 我只是 AI 工具的用户</h3>

直接用我们的应用，给自己搭一份专属的 supermemory。它会**在每次对话之间维护一张持久的记忆图谱**。

你的 AI 会记住你的偏好、项目、历史讨论——而且越用越聪明。

**[→ 跳到用户安装指南](#给你的-ai-装上记忆)**

</td>
<td width="50%" valign="top">

<h3>🔧 我在做 AI 产品</h3>

通过**一套 API**，就能给你的 agent 和应用加上记忆、RAG、用户画像和连接器。

无需配置向量数据库，无需搭 embedding 流水线，无需操心切分策略。

**[→ 跳到开发者快速开始](#用-supermemory-api-构建)**

</td>
</tr>
</table>

---

## 给你的 AI 装上记忆

Supermemory 的应用、浏览器扩展、插件和 MCP 服务器，可以为任何兼容的 AI 助手提供持久记忆。装一次，AI 从此记住你。

### 应用

不用写代码，直接用我们面向消费者的应用——免费。

入口：https://app.supermemory.ai

<img width="1705" height="1030" alt="image" src="https://github.com/user-attachments/assets/5b43af30-b998-4585-8de6-f3e9a26d894a" />

应用里内置了一个 agent，我们叫它 Nova。

### Supermemory 插件

Supermemory 已经为 Claude Code、OpenCode、OpenClaw、Hermes 提供了开箱即用的插件。

<img width="844" height="484" alt="image" src="https://github.com/user-attachments/assets/ecb879a2-8652-495d-9228-f305a97ba603" />

这些插件本质上是 supermemory API 的实现，全部开源：

- Openclaw 插件：https://github.com/supermemoryai/openclaw-supermemory
- Claude Code 插件：https://github.com/supermemoryai/claude-supermemory
- OpenCode 插件：https://github.com/supermemoryai/opencode-supermemory
- Hermes agent（Supermemory 作为记忆 provider）：https://github.com/NousResearch/hermes-agent

### MCP

服务地址：

```text
https://mcp.supermemory.ai/mcp
```

```json
{
  "mcpServers": {
    "supermemory": {
      "url": "https://mcp.supermemory.ai/mcp"
    }
  }
}
```

更多 MCP 细节见：https://supermemory.ai/docs/supermemory-mcp/mcp

### AI 接入后能用到什么

| 工具 | 作用 |
|---|---|
| `memory` | 保存或删除信息。每当你说出值得记住的内容，AI 会自动调用。 |
| `recall` | 按查询条件检索记忆。返回相关记忆 + 用户画像摘要。 |
| `context` | 在对话开始时把你完整的画像（偏好、近期活动）注入会话。Cursor 和 Claude Code 里输入 `/context` 即可。 |

### 工作机制

装好之后，Supermemory 在后台运行：

1. **正常和你的 AI 对话。** 聊聊偏好、提提项目、讨论一下问题。
2. **Supermemory 自动提取并存下关键信息。** 事实、偏好、项目上下文——杂音不留。
3. **下一次对话，AI 已经认识你了。** 它知道你在做什么、你喜欢怎么处理、你之前聊过什么。

记忆按 **project（容器标签）** 隔离，便于把工作和生活分开，也可以按客户、仓库或任何其它维度组织。

### 已支持的客户端

**Claude Desktop** · **Cursor** · **Windsurf** · **VS Code** · **Claude Code** · **OpenCode** · **OpenClaw** · **Hermes**

MCP 服务器开源——[查看源码](https://supermemory.ai/docs/supermemory-mcp/mcp)。

### 手动配置

把下面这段加到你的 MCP 客户端配置里：

```json
{
  "mcpServers": {
    "supermemory": {
      "url": "https://mcp.supermemory.ai/mcp"
    }
  }
}
```

如果想用 API key 代替 OAuth：

```json
{
  "mcpServers": {
    "supermemory": {
      "url": "https://mcp.supermemory.ai/mcp",
      "headers": {
        "Authorization": "Bearer sm_your_api_key_here"
      }
    }
  }
}
```

---

## 用 Supermemory API 构建

如果你在做 AI agent 或应用，Supermemory 用一套 API 给你完整的上下文栈——记忆、RAG、用户画像、连接器、文件处理，全包。

### 安装

```bash
npm install supermemory    # 或者：pip install supermemory
```

### 快速开始

```typescript
import Supermemory from "supermemory";

const client = new Supermemory();

// 存一段对话
await client.add({
  content: "User loves TypeScript and prefers functional patterns",
  containerTag: "user_123",
});

// 一次调用拿到用户画像 + 相关记忆
const { profile, searchResults } = await client.profile({
  containerTag: "user_123",
  q: "What programming style does the user prefer?",
});

// profile.static  → ["Loves TypeScript", "Prefers functional patterns"]
// profile.dynamic → ["Working on API integration"]
// searchResults   → 按相似度排序的相关记忆
```

```python
from supermemory import Supermemory

client = Supermemory()

client.add(
    content="User loves TypeScript and prefers functional patterns",
    container_tag="user_123"
)

result = client.profile(container_tag="user_123", q="programming style")

print(result.profile.static)   # 长期事实
print(result.profile.dynamic)  # 近期上下文
```

Supermemory 会自动抽取记忆、构建用户画像、返回相关上下文。不用搭 embedding 流水线，不用配向量库，不用操心切分。

### 框架集成

主流 AI 框架都有开箱即用的封装：

```typescript
// Vercel AI SDK
import { withSupermemory } from "@supermemory/tools/ai-sdk";
const model = withSupermemory(openai("gpt-4o"), { containerTag: "user_123", customId: "conv-1" });

// Mastra
import { withSupermemory } from "@supermemory/tools/mastra";
const agent = new Agent(withSupermemory(config, "user-123", { mode: "full" }));
```

**Vercel AI SDK** · **LangChain** · **LangGraph** · **OpenAI Agents SDK** · **Mastra** · **Agno** · **Claude Memory Tool** · **n8n**

### 检索模式

```typescript
// 混合检索（默认）——一次查询同时跑 RAG 和记忆
const results = await client.search({
  q: "how do I deploy?",
  containerTag: "user_123",
  searchMode: "hybrid",
});
// 返回部署文档（RAG）+ 该用户的部署偏好（记忆）

// 只查记忆
const results = await client.search({
  q: "user preferences",
  containerTag: "user_123",
  searchMode: "memories",
});
```

### 用户画像

传统记忆方案依赖检索——你得先知道要问什么。Supermemory 会自动为每个用户维护一份画像：

```typescript
const { profile } = await client.profile({ containerTag: "user_123" });

// profile.static  → ["Senior engineer at Acme", "Prefers dark mode", "Uses Vim"]
// profile.dynamic → ["Working on auth migration", "Debugging rate limits"]
```

一次调用，约 50ms。把它塞到 system prompt 里，你的 agent 立刻就知道自己在和谁聊。

### 连接器

把外部数据自动同步进知识库：

**Google Drive** · **Gmail** · **Notion** · **OneDrive** · **GitHub** · **网页爬取**

实时 webhook。文档自动处理、切分、入索引。

### API 一览

| 方法 | 作用 |
|---|---|
| `client.add()` | 存储内容——文本、对话、URL、HTML |
| `client.profile()` | 一次调用返回用户画像 + 可选检索 |
| `client.search()` | 跨记忆和文档的混合检索（`searchMode`） |
| `client.search.documents()` | 带元数据过滤的文档检索（旧版 v3 响应格式） |
| `client.documents.uploadFile()` | 上传 PDF、图片、视频、代码 |
| `client.documents.list()` | 列出和筛选文档 |
| `client.settings.update()` | 配置记忆抽取与切分策略 |

完整 API 文档 → [supermemory.ai/docs](https://supermemory.ai/docs)

---

## 基准测试

在各大 AI 记忆基准上，Supermemory 都处于业界顶尖水平：

| 基准 | 衡量内容 | 结果 |
|---|---|---|
| **[LongMemEval](https://github.com/xiaowu0162/LongMemEval)** | 跨会话的长期记忆能力，包含知识更新 | **81.6%——第 1** |
| **[LoCoMo](https://github.com/snap-research/locomo)** | 超长对话中的事实回忆（单跳、多跳、时序、对抗） | **第 1** |
| **[ConvoMem](https://github.com/Salesforce/ConvoMem)** | 个性化与偏好学习 | **第 1** |

我们还做了 **[MemoryBench](https://supermemory.ai/docs/memorybench/overview)**——一个开源框架，用于对记忆服务做标准化、可复现的基准评测。Supermemory、Mem0、Zep 等可以直接放在一起对比：

```bash
bun run src/index.ts run -p supermemory -b longmemeval -j gpt-4o -r my-run
```

### 给自己的记忆方案跑基准

我们提供了一个 Agent skill，方便公司把自己的上下文/记忆方案拿来和 supermemory 对比。

```
npx skills add supermemoryai/memorybench
```

跑完上面这条命令，再执行 `/benchmark-context`，Supermemory 会自动帮你跑完整个流程。

---

## 记忆是怎么跑起来的

```
你的应用 / AI 工具
        ↓
   Supermemory
        │
        ├── 记忆引擎     提取事实、跟踪更新、解决冲突、
        │                自动遗忘过期信息
        ├── 用户画像     基于引擎构建的静态事实 + 动态上下文，始终保持最新
        ├── 混合检索     一次查询同时跑 RAG 和记忆
        ├── 连接器       从 Google Drive、Gmail、Notion、GitHub 等实时同步
        └── 文件处理     PDF、图片、视频、代码 → 可检索的分块
```

**记忆不等于 RAG。** RAG 是检索文档片段——无状态，对所有人返回相同结果。记忆是**长期跟踪和提取关于用户的事实**。它知道「我刚搬到 SF」会覆盖「我住在 NYC」。Supermemory 默认把两者一起跑，所以每次查询都能同时拿到知识库检索结果和个性化上下文。更多细节见：https://supermemory.ai/docs/concepts/memory-vs-rag

**自动遗忘。** Supermemory 知道哪些记忆已经无关紧要。临时事实（「我明天有考试」）会在日期过后失效，冲突会自动消解，杂音不会沉淀成永久记忆。

---

## 链接

- 📖 [文档](https://supermemory.ai/docs)
- 🚀 [快速开始](https://supermemory.ai/docs/quickstart)
- 🧪 [MemoryBench](https://supermemory.ai/docs/memorybench/overview)
- 🔌 [集成](https://supermemory.ai/docs/integrations)
- 💬 [Discord](https://supermemory.link/discord)
- 𝕏 [Twitter](https://twitter.com/supermemory)

---

<p align="center">
  <strong>是时候给你的 AI 一份记忆了。</strong>
</p>
