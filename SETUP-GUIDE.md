# Self Hosting Guide

This guide will help you set up your own instance of Supermemory. This is neccessary if you want to contribute to the project or if you want to self host the project. You can read more about the stack [here](https://github.com/supermemoryai/supermemory/?tab=readme-ov-file#-the-stack).

## Prerequisites

- [pnpm](https://pnpm.io/installation): pnpm is used as a package manager. You can enable pnpm by running `corepack enable pnpm` in your terminal.
- [turbo](https://turbo.build/repo/docs/installing)
- [wrangler](https://developers.cloudflare.com/workers/cli-wrangler/install-update)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/platform/pricing/): You also need to have a paid Workers plan to use the vectorize feature which is needed run the AI backend. It is currently $5/mo + usage costs.
- [Cloudflare R2](https://developers.cloudflare.com/r2/): You need to enable R2 in the Cloudflare Dashboard for use in the web app.

## Steps

1. Clone the repo
2. Run `pnpm install` in the root directory

### web

1. You need to create OAuth credentials for Google which is need for auth.js (nextauth). Visit https://developers.google.com/identity/protocols/oauth2 to learn more and https://console.cloud.google.com/apis/dashboard to create a new project and OAuth credentials. You need to set the redirect URL to `http://localhost:3000/api/auth/callback/google` for development. You can also set the redirect URL to your own domain if you are deploying the app.
2. Create a `.dev.vars` file in `apps/web` with the following content:

```bash
GOOGLE_CLIENT_ID="" // required
GOOGLE_CLIENT_SECRET="" // required
NEXTAUTH_SECRET="" // generate by running `openssl rand -base64 32`
DATABASE_URL='database.sqlite'
NEXTAUTH_URL='http://localhost:3000'
BACKEND_SECURITY_KEY="" // used to authenticate with the backend. generate a random string using `openssl rand -base64 32`
BACKEND_BASE_URL="http://localhost:8686"
```

> [!NOTE]
> The `BACKEND_SECURITY_KEY` should be the same as the `SECURITY_KEY` in the `.dev.vars` file in `apps/cf-ai-backend`.

3. KV Namespaces

```bash
pnpx wrangler kv namespace create canvas-snaps
```

```bash
pnpx wrangler kv namespace create recommendations
```

Do not change the binding value in the `wrangler.toml` but update the id for the namespaces with the values you get from the above commands.

4. R2 Storage

```bash
pnpx wrangler r2 bucket create supermemory-r2
```

Update bucket_name in the `wrangler.toml` file in `apps/web` to `supermemory-r2`

5. D1 Database

```bash
pnpx wrangler d1 create supermemory-db-prod
```

Update the database_name and database_id in `[[env.production.d1_databases]]` with the values you get from the above command.

```bash
pnpx wrangler d1 create supermemory-db-preview
```

Update the database_name and database_id in `[[d1_databases]]` and `[[env.preview.d1_databases]]` with the values you get from the above command.

> [!NOTE]
> please don't change the binding value even if wrangler cli suggests you to do so.

```bash
[[d1_databases]]
binding = "DATABASE"
database_name = "supermemory-db-preview"
database_id = "YOUR_DB_ID"
```

Simply run this command in `apps/web`

```bash
pnpx wrangler d1 migrations apply supermemory-db-preview
```

If it runs, you can set up the cloud database as well by add the `--remote` flag,

if you just want to contribute to frontend then just run `pnpm run dev` in the root of the project and done! (you won't be able to try ai stuff), otherwise continue...

### cf-ai-backend

1. You need to host your own worker for the `apps/cf-ai-backend` module.

To do this, first edit the `.dev.vars` file in `apps/cf-ai-backend` with the following content:

```bash
SECURITY_KEY="veryrandomsecuritykey" // same as BACKEND_SECURITY_KEY in web
// Why? to generate embeddings with 4000+ tokens
OPENAI_API_KEY="sk-"
```

2. Run this command to initialise vector database
   > Note: You need to use the workers paid plan to use vectorize for now.

```bash
pnpx wrangler vectorize create --dimensions=1536 supermemory --metric=cosine
```

Update the index_name for `[[vectorize]]` in `wrangler.toml` file in `apps/cf-ai-backend` with the `supermemory` or the name you used in the above command.

3. Create KV namespaces for the `cf-ai-backend` module

```bash
pnpx wrangler kv namespace create prod
```

Update the id in `[[kv_namespaces]]` in the `wrangler.toml` file in `apps/cf-ai-backend` with the value you get from the above command.

```bash
pnpx wrangler kv namespace create preview
```

Update the preview_id in `[[kv_namespaces]]` in the `wrangler.toml` file in `apps/cf-ai-backend` with the value you get from the above command.

## Local Development

- Run `pnpm dev` in the root directory and Voila! You have your own supermemory instance running!

> [!NOTE]
> It sometimes takes multiple tries to successfully run the `pnpm dev` command. If you encounter any issues, try running the command again.

## Deploying

To deploy the web app, run `pnpm run deploy` in the `apps/web` directory.
To deploy the cf-ai-backend module, run `wrangler publish` in the `apps/cf-ai-backend` directory.

To get the extension running, you need to build it first. Run `pnpm build` in the `apps/extension` directory and then load the extension in chrome.
