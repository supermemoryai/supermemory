# Supermemory Use Cases & Examples

Concrete examples showing how to use Supermemory for common AI application patterns.

## Table of Contents

1. [Personalized Chatbot](#1-personalized-chatbot)
2. [Long-Term Task Assistant](#2-long-term-task-assistant)
3. [Document Knowledge Base](#3-document-knowledge-base)
4. [Customer Support AI](#4-customer-support-ai)
5. [Code Review Assistant](#5-code-review-assistant)
6. [Learning Companion](#6-learning-companion)
7. [Multi-Tenant SaaS Application](#7-multi-tenant-saas-application)
8. [Research Assistant](#8-research-assistant)

---

## 1. Personalized Chatbot

Build a chatbot that remembers user preferences and past conversations.

### Implementation (TypeScript + Vercel AI SDK)

```typescript
import { Supermemory } from 'supermemory';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

const memory = new Supermemory();

async function chat(userId: string, conversationId: string, message: string) {
  // 1. Retrieve user context
  const { profile } = await memory.profile(userId);

  // 2. Build system prompt with personalization
  const staticFacts = profile.static.map(m => `- ${m.memory}`).join('\n');
  const dynamicFacts = profile.dynamic.map(m => `- ${m.memory}`).join('\n');

  const systemPrompt = `
You are a helpful assistant with perfect memory.

User Profile:
${staticFacts}

Recent Context:
${dynamicFacts}

Use this context to provide personalized, contextually aware responses.
  `.trim();

  // 3. Generate response
  const { text } = await generateText({
    model: openai('gpt-4'),
    system: systemPrompt,
    prompt: message
  });

  // 4. Store the interaction; the same id keeps the conversation in one document
  await memory.add(userId, {
    content: `User: ${message}\nAssistant: ${text}`,
    id: conversationId,
    metadata: {
      timestamp: new Date().toISOString(),
      type: 'conversation'
    }
  });

  return text;
}

// Usage
const response = await chat('user_123', 'conv_1', 'What did I tell you about my preferences?');
console.log(response); // Uses stored context to answer accurately
```

### Python Version

```python
from supermemory import Supermemory
from openai import OpenAI
import datetime

memory = Supermemory()
openai_client = OpenAI()

def chat(user_id: str, message: str) -> str:
    # 1. Retrieve context
    profile = memory.profile(user_id).profile

    # 2. Build system prompt
    static_facts = "\n".join(f"- {m.memory}" for m in profile.static)
    dynamic_facts = "\n".join(f"- {m.memory}" for m in profile.dynamic)

    system_prompt = f"""
You are a helpful assistant with perfect memory.

User Profile:
{static_facts}

Recent Context:
{dynamic_facts}

Use this context to provide personalized responses.
    """.strip()

    # 3. Generate response
    response = openai_client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message}
        ]
    )
    text = response.choices[0].message.content

    # 4. Store interaction
    memory.add(
        user_id,
        content=f"User: {message}\nAssistant: {text}",
        metadata={
            "timestamp": datetime.datetime.now().isoformat(),
            "type": "conversation"
        }
    )

    return text
```

### Key Benefits
- Personalized responses based on user history
- Remembers preferences across sessions
- Reduces repetitive questions
- Builds trust through consistency

---

## 2. Long-Term Task Assistant

AI assistant that tracks ongoing projects and tasks over weeks/months.

### Implementation

```typescript
import { Supermemory } from 'supermemory';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

const memory = new Supermemory();

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
}

async function taskAssistant(userId: string, query: string) {
  // Get task-related context
  const { profile } = await memory.profile(`${userId}_tasks`);

  // Build context from profile
  const tasks = profile.dynamic.map(m => `- ${m.memory}`).join('\n');

  // Generate intelligent response
  const { text } = await generateText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    system: `
You are a task management assistant with perfect memory of the user's projects.

Active Tasks and Context:
${tasks}

Help the user track, prioritize, and complete their tasks.
    `,
    prompt: query
  });

  return text;
}

async function addTask(userId: string, task: Task) {
  await memory.add(`${userId}_tasks`, {
    content: `Task: ${task.title} (Status: ${task.status}, Priority: ${task.priority})`,
    id: task.id,
    metadata: {
      status: task.status,
      priority: task.priority,
      createdAt: new Date().toISOString()
    }
  });
}

async function updateTask(userId: string, taskId: string, status: Task['status']) {
  // Same id appends the update to the task's document (Supermemory will create relationship)
  await memory.add(`${userId}_tasks`, {
    content: `Task ${taskId} updated to status: ${status}`,
    id: taskId,
    metadata: {
      status,
      updatedAt: new Date().toISOString()
    }
  });
}

// Usage
await addTask('user_123', {
  id: 'task_1',
  title: 'Implement authentication',
  status: 'in_progress',
  priority: 'high'
});

await taskAssistant('user_123', 'What are my high priority tasks?');
// Returns: "You have 1 high priority task: Implement authentication (in progress)"

await updateTask('user_123', 'task_1', 'done');
await taskAssistant('user_123', 'What did I complete today?');
// Returns: "You completed 'Implement authentication' today!"
```

### Key Benefits
- Long-term project tracking
- Automatic task status history
- Intelligent prioritization suggestions
- Context-aware task recommendations

---

## 3. Document Knowledge Base

Semantic search across documentation, manuals, and knowledge articles.

### Implementation

```typescript
import { Supermemory } from 'supermemory';

const memory = new Supermemory();

// 1. Index documentation
async function indexDocumentation() {
  const docs = [
    { url: 'https://docs.example.com/getting-started', category: 'onboarding' },
    { url: 'https://docs.example.com/api-reference', category: 'api' },
    { url: 'https://docs.example.com/security', category: 'security' },
  ];

  for (const doc of docs) {
    await memory.add('documentation', {
      content: doc.url,
      metadata: {
        category: doc.category,
        type: 'documentation',
        indexed_at: new Date().toISOString()
      }
    });
  }
}

// 2. Search documentation
async function searchDocs(query: string, category?: string) {
  const { results } = await memory.search('documentation', {
    query,
    searchMode: 'hybrid',  // Use hybrid search for better RAG accuracy
    threshold: 0.3,
    limit: 10,
    filter: category
      ? { field: 'category', operator: 'eq', value: category }
      : undefined
  });

  return results.map(r => ({
    content: r.memory ?? r.chunk,
    metadata: r.metadata
  }));
}

// 3. Intelligent Q&A over documentation
async function askDocumentation(question: string) {
  const results = await searchDocs(question);

  const context = results
    .slice(0, 5) // Top 5 results
    .map(r => r.content)
    .join('\n\n---\n\n');

  const { text } = await generateText({
    model: openai('gpt-4'),
    system: `
You are a documentation assistant. Answer questions using ONLY the provided context.

Context:
${context}

If the answer isn't in the context, say so.
    `,
    prompt: question
  });

  return {
    answer: text,
    sources: results.slice(0, 5)
  };
}

// Usage
await indexDocumentation();

const result = await askDocumentation('How do I authenticate API requests?');
console.log(result.answer);
console.log('Sources:', result.sources);
```

### Key Benefits
- Semantic search (not keyword matching)
- Multi-document understanding
- Automatic source citation
- Scales to thousands of documents

---

## 4. Customer Support AI

AI agent that remembers customer history and provides personalized support.

### Implementation

```typescript
import { Supermemory } from 'supermemory';

const memory = new Supermemory();

interface Customer {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'pro' | 'enterprise';
}

interface Ticket {
  id: string;
  customerId: string;
  subject: string;
  description: string;
  status: 'open' | 'resolved';
}

// 1. Store customer profile
async function createCustomer(customer: Customer) {
  await memory.add(customer.id, {
    content: `Customer: ${customer.name} (${customer.email}), Plan: ${customer.plan}`,
    metadata: {
      type: 'profile',
      plan: customer.plan,
      email: customer.email
    }
  });
}

// 2. Log support ticket
async function createTicket(ticket: Ticket) {
  await memory.add(ticket.customerId, {
    content: `Ticket ${ticket.id}: ${ticket.subject}\n${ticket.description}`,
    id: ticket.id,
    metadata: {
      type: 'ticket',
      status: ticket.status,
      subject: ticket.subject,
      createdAt: new Date().toISOString()
    }
  });
}

// 3. Resolve ticket
async function resolveTicket(customerId: string, ticketId: string, resolution: string) {
  // Same id appends the resolution to the ticket's document
  await memory.add(customerId, {
    content: `Ticket ${ticketId} resolved: ${resolution}`,
    id: ticketId,
    metadata: {
      type: 'ticket',
      status: 'resolved',
      resolvedAt: new Date().toISOString()
    }
  });
}

// 4. Support agent assistant
async function supportAssistant(customerId: string, query: string) {
  const { profile } = await memory.profile(customerId);

  const staticInfo = profile.static.map(m => `- ${m.memory}`).join('\n');
  const recentTickets = profile.dynamic.map(m => `- ${m.memory}`).join('\n');

  const { text } = await generateText({
    model: openai('gpt-4'),
    system: `
You are a customer support AI with access to full customer history.

Customer Profile:
${staticInfo}

Previous Tickets and Interactions:
${recentTickets}

Provide helpful, personalized support based on this history.
    `,
    prompt: query
  });

  return text;
}

// Usage
await createCustomer({
  id: 'cust_123',
  name: 'Alice Johnson',
  email: 'alice@example.com',
  plan: 'pro'
});

await createTicket({
  id: 'ticket_001',
  customerId: 'cust_123',
  subject: 'Cannot export data',
  description: 'Getting error when trying to export CSV',
  status: 'open'
});

const suggestion = await supportAssistant(
  'cust_123',
  'Customer is asking about data export again'
);
// Returns: "This is a recurring issue for Alice. She's on the Pro plan and has
// previously had trouble with CSV exports (ticket #001). Let's check if she's
// using the latest version..."

await resolveTicket('cust_123', 'ticket_001', 'Updated to latest version, issue resolved');
```

### Key Benefits
- Complete customer interaction history
- Personalized support responses
- Pattern detection (recurring issues)
- Reduced resolution time

---

## 5. Code Review Assistant

AI that learns your codebase and provides contextual code reviews.

### Implementation

```typescript
import { Supermemory } from 'supermemory';
import * as fs from 'fs';
import * as path from 'path';

const memory = new Supermemory();

// 1. Index codebase
async function indexCodebase(projectId: string, directory: string) {
  const files = getAllFiles(directory, ['.ts', '.tsx', '.js', '.jsx']);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(directory, file);

    // Re-indexing a changed file: use documents.update() to replace its content
    await memory.add(`${projectId}_codebase`, {
      content: `File: ${relativePath}\n\n${content}`,
      id: relativePath.replace(/[^A-Za-z0-9_-]/g, '_'),
      metadata: {
        type: 'source_file',
        language: path.extname(file).slice(1),
        path: relativePath,
        lines: content.split('\n').length
      }
    });
  }
}

// 2. Index pull requests and reviews
async function indexPR(projectId: string, prNumber: number, diff: string, comments: string[]) {
  await memory.add(`${projectId}_reviews`, {
    content: `PR #${prNumber}\n\nDiff:\n${diff}\n\nComments:\n${comments.join('\n')}`,
    id: `pr_${prNumber}`,
    metadata: {
      type: 'pull_request',
      number: prNumber,
      createdAt: new Date().toISOString()
    }
  });
}

// 3. Review code with context
async function reviewCode(projectId: string, code: string, fileName: string) {
  // Search for similar code patterns
  const { results: similarCode } = await memory.search(`${projectId}_codebase`, {
    query: code,
    searchMode: 'chunks',
    threshold: 0.3,
    limit: 5
  });

  // Get past review comments
  const { results: pastReviews } = await memory.search(`${projectId}_reviews`, {
    query: `code review comments for ${fileName}`,
    threshold: 0.3,
    limit: 5
  });

  const { text } = await generateText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    system: `
You are a code review assistant familiar with this codebase.

Similar Code Patterns:
${similarCode.map(c => c.chunk).slice(0, 3).join('\n\n---\n\n')}

Past Review Patterns:
${pastReviews.map(p => p.memory ?? p.chunk).slice(0, 3).join('\n\n---\n\n')}

Provide a thoughtful code review, considering existing patterns and past feedback.
    `,
    prompt: `Review this code from ${fileName}:\n\n${code}`
  });

  return text;
}

function getAllFiles(dir: string, extensions: string[]): string[] {
  // Implementation omitted for brevity
  return [];
}

// Usage
await indexCodebase('project_abc', './src');
await indexPR('project_abc', 123, '...diff...', ['Great work!', 'Consider adding tests']);

const review = await reviewCode('project_abc', `
async function fetchUser(id: string) {
  const response = await fetch(\`/api/users/\${id}\`);
  return response.json();
}
`, 'api/users.ts');

console.log(review);
// Returns: "This code lacks error handling. Based on past reviews in this project,
// we typically wrap fetch calls in try/catch and validate responses. See similar
// pattern in api/products.ts for reference..."
```

### Key Benefits
- Consistent code review standards
- Learns from past feedback
- Detects anti-patterns
- Suggests improvements based on codebase

---

## 6. Learning Companion

AI tutor that adapts to student progress and learning style.

### Implementation

```typescript
import { Supermemory } from 'supermemory';

const memory = new Supermemory();

interface LearningSession {
  studentId: string;
  topic: string;
  content: string;
  understanding: 'low' | 'medium' | 'high';
  questions: string[];
}

async function recordLearningSession(session: LearningSession) {
  await memory.add(session.studentId, {
    content: `
Topic: ${session.topic}
Understanding: ${session.understanding}
Content covered: ${session.content}
Questions asked: ${session.questions.join(', ')}
    `,
    metadata: {
      type: 'learning_session',
      topic: session.topic,
      understanding: session.understanding,
      timestamp: new Date().toISOString()
    }
  });
}

async function adaptiveTutor(studentId: string, question: string) {
  const [{ profile }, { results: searchResults }] = await Promise.all([
    memory.profile(studentId),
    memory.search(studentId, { query: question, searchMode: 'chunks', threshold: 0.5 })
  ]);

  // Analyze learning patterns from metadata
  const weakTopics = searchResults
    .filter(r => r.metadata?.understanding === 'low')
    .map(r => r.metadata?.topic);

  const strongTopics = searchResults
    .filter(r => r.metadata?.understanding === 'high')
    .map(r => r.metadata?.topic);

  const staticInfo = profile.static.map(m => `- ${m.memory}`).join('\n');
  const recentLearning = profile.dynamic.slice(0, 5).map(m => m.memory).join('\n\n');

  const { text } = await generateText({
    model: openai('gpt-4'),
    system: `
You are an adaptive tutor who knows the student's learning history.

Student Profile:
${staticInfo}

Topics the student struggles with: ${weakTopics.join(', ') || 'None yet'}
Topics the student excels at: ${strongTopics.join(', ') || 'None yet'}

Recent Learning:
${recentLearning}

Adapt your teaching style and difficulty to match the student's level.
Use analogies to topics they understand well.
    `,
    prompt: question
  });

  return text;
}

// Usage
await recordLearningSession({
  studentId: 'student_456',
  topic: 'React Hooks',
  content: 'useState and useEffect basics',
  understanding: 'medium',
  questions: ['When should I use useEffect?', 'What is the dependency array?']
});

await recordLearningSession({
  studentId: 'student_456',
  topic: 'TypeScript',
  content: 'Type annotations and interfaces',
  understanding: 'high',
  questions: []
});

const explanation = await adaptiveTutor('student_456', 'Explain useMemo to me');
// Returns: "Since you understand TypeScript well, think of useMemo as adding
// type safety to your computed values - it 'memoizes' them. Like how TypeScript
// prevents you from accidentally changing a type, useMemo prevents unnecessary
// recalculations..."
```

### Key Benefits
- Personalized learning pace
- Adapts to learning style
- Identifies knowledge gaps
- Builds on existing strengths

---

## 7. Multi-Tenant SaaS Application

Isolate data per organization while enabling shared knowledge bases.

### Implementation

```typescript
import { Supermemory } from 'supermemory';

const memory = new Supermemory();

interface Organization {
  id: string;
  name: string;
}

interface User {
  id: string;
  orgId: string;
  name: string;
}

// Namespace strategy: one namespace per isolation boundary
function getNamespaces(orgId: string, userId: string) {
  return {
    org: `org_${orgId}`,
    user: `org_${orgId}_user_${userId}`,
    shared: `org_${orgId}_shared`
  };
}

// 1. Store organization-wide knowledge
async function addOrgKnowledge(orgId: string, content: string) {
  const namespaces = getNamespaces(orgId, '');

  await memory.add(namespaces.shared, {
    content,
    metadata: {
      type: 'org_knowledge',
      visibility: 'organization'
    }
  });
}

// 2. Store user-specific data
async function addUserData(orgId: string, userId: string, content: string) {
  const namespaces = getNamespaces(orgId, userId);

  await memory.add(namespaces.user, {
    content,
    metadata: {
      type: 'user_data',
      visibility: 'private'
    }
  });
}

// 3. Search with proper isolation
async function search(orgId: string, userId: string, query: string, includeShared: boolean = true) {
  const namespaces = getNamespaces(orgId, userId);

  const targets = includeShared
    ? [namespaces.user, namespaces.shared]  // User + org shared
    : [namespaces.user];                    // User only

  // One search per namespace, then merge
  const responses = await Promise.all(
    targets.map(namespace =>
      memory.search(namespace, { query, threshold: 0.3, limit: 10 })
    )
  );

  return responses.flatMap(r => r.results);
}

// Usage
const org1 = 'acme_corp';
const org2 = 'other_corp';
const user1 = 'alice';
const user2 = 'bob';

// Organization-wide knowledge (visible to all users in org)
await addOrgKnowledge(org1, 'Company policy: Remote work allowed');
await addOrgKnowledge(org2, 'Company policy: Office-only');

// User-specific data (visible only to that user)
await addUserData(org1, user1, 'Alice prefers dark mode');
await addUserData(org1, user2, 'Bob prefers light mode');

// Alice searches (sees org1 shared + her own data)
const aliceResults = await search(org1, user1, 'work policy');
// Returns: "Company policy: Remote work allowed" ✅
// Does NOT return: Bob's preferences ✅
// Does NOT return: org2 data ✅

// Bob searches (sees org1 shared + his own data)
const bobResults = await search(org1, user2, 'preferences');
// Returns: "Bob prefers light mode" ✅
// Does NOT return: Alice's preferences ✅
```

### Key Benefits
- Perfect data isolation per tenant
- Shared knowledge bases
- Flexible visibility controls
- Scales to thousands of organizations

---

## 8. Research Assistant

Manage research papers, notes, and insights with automatic relationship discovery.

### Implementation

```typescript
import { Supermemory } from 'supermemory';

const memory = new Supermemory();

interface Paper {
  title: string;
  authors: string[];
  abstract: string;
  url: string;
  year: number;
}

async function addPaper(userId: string, paper: Paper) {
  await memory.add(`${userId}_research`, {
    content: `
Title: ${paper.title}
Authors: ${paper.authors.join(', ')}
Year: ${paper.year}
Abstract: ${paper.abstract}
URL: ${paper.url}
    `,
    id: paper.url.replace(/[^A-Za-z0-9_-]/g, '_'),
    metadata: {
      type: 'paper',
      year: paper.year,
      authors: paper.authors,
      title: paper.title
    }
  });
}

async function addResearchNote(userId: string, note: string, relatedPapers: string[]) {
  await memory.add(`${userId}_research`, {
    content: note,
    metadata: {
      type: 'note',
      relatedPapers,
      createdAt: new Date().toISOString()
    }
  });
}

async function findRelatedResearch(userId: string, topic: string) {
  const { results } = await memory.search(`${userId}_research`, {
    query: topic,
    searchMode: 'chunks',
    threshold: 0.3,
    limit: 20
  });

  // Group by type
  const papers = results.filter(r => r.metadata?.type === 'paper');
  const notes = results.filter(r => r.metadata?.type === 'note');

  return { papers, notes };
}

async function synthesizeInsights(userId: string, research_question: string) {
  const related = await findRelatedResearch(userId, research_question);

  const context = [
    '=== Related Papers ===',
    ...related.papers.map(p => p.chunk),
    '\n=== Your Notes ===',
    ...related.notes.map(n => n.chunk)
  ].join('\n\n');

  const { text } = await generateText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    system: `
You are a research assistant helping synthesize insights from papers and notes.

Relevant Research:
${context}

Provide a synthesis that connects ideas across papers and notes.
    `,
    prompt: research_question
  });

  return text;
}

// Usage
await addPaper('researcher_123', {
  title: 'Attention Is All You Need',
  authors: ['Vaswani et al.'],
  year: 2017,
  abstract: 'We propose a new simple network architecture, the Transformer...',
  url: 'https://arxiv.org/abs/1706.03762'
});

await addPaper('researcher_123', {
  title: 'BERT: Pre-training of Deep Bidirectional Transformers',
  authors: ['Devlin et al.'],
  year: 2018,
  abstract: 'We introduce a new language representation model called BERT...',
  url: 'https://arxiv.org/abs/1810.04805'
});

await addResearchNote(
  'researcher_123',
  'BERT builds on the Transformer architecture introduced in "Attention Is All You Need"',
  ['https://arxiv.org/abs/1706.03762', 'https://arxiv.org/abs/1810.04805']
);

const synthesis = await synthesizeInsights(
  'researcher_123',
  'How did transformers evolve from 2017 to 2018?'
);
// Returns: "The Transformer architecture (Vaswani et al., 2017) introduced
// self-attention mechanisms. BERT (Devlin et al., 2018) extended this by
// adding bidirectional pre-training, as noted in your research notes..."
```

### Key Benefits
- Automatic relationship discovery between papers
- Connect notes to relevant research
- Synthesize insights across sources
- Never lose track of references

---

## Common Patterns Across Use Cases

### Pattern 1: Context Retrieval Before Generation

```typescript
// Always retrieve context first
const { profile } = await memory.profile(userId);

// Then use in generation
const staticFacts = profile.static.map(m => m.memory).join('\n');
const dynamicFacts = profile.dynamic.map(m => m.memory).join('\n');

const llmResponse = await generateText({
  system: `User Profile:\n${staticFacts}\n\nRecent Context:\n${dynamicFacts}`,
  prompt: userMessage
});
```

### Pattern 2: Store After Interaction

```typescript
// Always store the result
await memory.add(userId, {
  content: `Input: ${input}\nOutput: ${output}`,
  metadata: { timestamp: new Date().toISOString() }
});
```

### Pattern 3: Rich Metadata for Filtering

```typescript
await memory.add(userId, {
  content: data,
  metadata: {
    type: 'conversation',
    category: 'support',
    priority: 'high',
    tags: ['billing', 'urgent'],
    timestamp: new Date().toISOString()
  }
});

// Later filter by metadata
const { results } = await memory.search('user_123', {
  query: 'billing issues',
  filter: {
    operator: 'and',
    operands: [
      { field: 'priority', operator: 'eq', value: 'high' },
      { field: 'type', operator: 'eq', value: 'conversation' }
    ]
  }
});
```

### Pattern 4: Hierarchical Namespaces

```typescript
// Organization → Team → User hierarchy; each level is its own namespace
const namespaces = {
  org: `org_${orgId}`,
  team: `org_${orgId}_team_${teamId}`,
  user: `org_${orgId}_team_${teamId}_user_${userId}`
};

// Search at appropriate level
const orgWide = await memory.search(namespaces.org, {
  query: 'company policies',
  limit: 10
});

const teamSpecific = await memory.search(namespaces.team, {
  query: 'team resources',
  limit: 10
});
```

## Next Steps

Ready to build your own use case? Start with the [Quickstart Guide](quickstart.md) or explore the [SDK Documentation](sdk-guide.md).

For questions or custom use cases, visit [console.supermemory.ai](https://console.supermemory.ai).
