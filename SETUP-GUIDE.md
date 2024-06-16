# Setup guide

## Prerequisites

- [bun](https://bun.sh/)
- [turbo](https://turbo.build/repo/docs/installing)
- [wrangler](https://developers.cloudflare.com/workers/cli-wrangler/install-update)

## Steps

1. Clone the repo
2. Run `bun install` in the root directory
3. Create a `.dev.vars` file in `apps/web` with the following content:

```bash
GOOGLE_CLIENT_ID="-" // required, visit https://developers.google.com/identity/protocols/oauth2
GOOGLE_CLIENT_SECRET="-" // required
NEXTAUTH_SECRET='nextauthsecret'
DATABASE_URL='database.sqlite'
NEXTAUTH_URL='http://localhost:3000'
BACKEND_SECURITY_KEY='veryrandomsecuritykey'
BACKEND_BASE_URL="where your backend is hosted"
```

4. Setup the database:

First, edit the `wrangler.toml` file in `apps/web` to point the d1 database to your account.

You can create a d1 database by running this command

```
bunx wrangler d1 create <YOUR_DATABASE_NAME>
```

And then replace database_name and database_id with the values

```
[[d1_databases]]
binding = "DATABASE"
database_name = "YOUR_DATABASE_NAME"
database_id = "YOUR_DB_ID"
```

Simply run this command in `apps/web`

```
bunx wrangler d1 migrations apply <YOUR_DATABASE_NAME>
```

If it runs, you can set up the cloud database as well by removing the `--local` flag,

if you just want to contribute to frontend then just run `bun run dev` in the root of the project and done! (you won't be able to try ai stuff), otherwise continue...

5. You need to host your own worker for the `apps/cf-ai-backend` module.

To do this, first edit the `.dev.vars` file in `apps/cf-ai-backend` with the following content:

```bash
SECURITY_KEY="veryrandomsecuritykey"
// Why? to generate embeddings with 4000+ tokens
OPENAI_API_KEY="sk-"
```

6. Run this command to initialise vector database
   > Note: You need to use the workers paid plan to use vectorize for now.

```
wrangler vectorize create --dimensions=1536 supermem-vector-1 --metric=cosine
```

7. Change the `wrangler.toml` file in `apps/cf-ai-backend` to point to your KV namespace

8. Run `bun dev` in the root directory and Voila! You have your own supermemory instance running!

> Note: You need to replace the url `https://cf-ai-backend.dhr.wtf` everywhere with your own url for the cf-ai-backend module.

## Deploying

To deploy the web app, run `bun deploy` in the `apps/web` directory.
To deploy the cf-ai-backend module, run `wrangler publish` in the `apps/cf-ai-backend` directory.

To get the extension running, you need to build it first. Run `bun build` in the `apps/extension` directory and then load the extension in chrome.
