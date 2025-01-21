# Supermemory self-hosting guide

## Local Setup

### 1. Database Setup

To spin up the database locally, use Docker Compose:

```bash
docker-compose up -d
```

This will start a PostgreSQL database with pgvector extension at `localhost:5432`.

### 2. Database Migrations

To generate a migration:

```bash
bun run generate-migration
```

To apply migrations:

```bash
bun run migrate:local
```

> Note: You MUST use the drizzle-orm functions exported from `packages/db` for interacting with the database. Not using them will cause type errors that are hard to debug.

### 3. Environment Variables

#### Backend (`apps/backend/.env` and `apps/backend/.dev.vars`):

```env
WORKOS_API_KEY=your_workos_api_key
WORKOS_CLIENT_ID=your_workos_client_id 
WORKOS_COOKIE_PASSWORD=your_cookie_password
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/supermemory"
CONTENT_WORKFLOW=your_content_workflow
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=development
OPEN_AI_API_KEY=your_openai_api_key
BRAINTRUST_API_KEY=your_braintrust_api_key
RESEND_API_KEY=your_resend_api_key
TURNSTILE_SECRET_KEY=your_turnstile_secret_key
```

#### Web (`apps/web/.env` and `apps/web/.dev.vars`):

```env
WORKOS_CLIENT_ID=your_workos_client_id
WORKOS_API_KEY=your_workos_api_key
WORKOS_REDIRECT_URI="http://localhost:3000/callback"
WORKOS_COOKIE_PASSWORD=your_cookie_password
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/supermemorydhravya"

CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key

BACKEND_URL=http://localhost:8787
OPENAI_API_KEY=your_openai_api_key
NOTION_CLIENT_ID=your_notion_client_id
NOTION_CLIENT_SECRET=your_notion_client_secret

NODE_ENV=development
STRIPE_CHECKOUT_KEY=your_stripe_checkout_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

You also need to update the Wrangler config for the web app and backend to your own account's resources on Cloudflare.

### 4. Schema Changes

To edit the database schema, modify the files in `packages/db/schema.ts`, and then repeat the steps in the [Database Migrations](#2-database-migrations) section.

### 5. Running the Application

1. Install dependencies:

```bash
bun install
```

2. Start the development servers:

```bash
bun run dev
```
