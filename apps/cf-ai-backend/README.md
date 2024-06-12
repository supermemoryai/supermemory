baseURL: https://new-cf-ai-backend.dhravya.workers.dev

Authentication:
You must authenticate with a header and `Authorization: bearer token` for each request in `/api/*` routes.

### Add content:

POST `/api/add` with

```
body {
  pageContent: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  space: z.string().optional(),
  url: z.string(),
  user: z.string(),
}
```

### Query without user data

GET `/api/ask` with
query `?query=testing`

(this is temp but works perfectly, will change soon for chat use cases specifically)

### Query vectorize and get results in natural language

POST `/api/chat` with

```
query paramters (?query=...&" {
      query: z.string(),
      topK: z.number().optional().default(10),
      user: z.string(),
      spaces: z.string().optional(),
      sourcesOnly: z.string().optional().default("false"),
      model: z.string().optional().default("gpt-4o"),
    }

body z.object({
  chatHistory: z.array(contentObj).optional(),
});
```

### Delete vectors

DELETE `/api/delete` with
query param websiteUrl, user
