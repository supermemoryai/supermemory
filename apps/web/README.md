# @repo/web

Serves `app.supermemory.ai`. Every request is forwarded to the console: plugin and OAuth paths get an immediate redirect with the query string intact, and everything else shows a short notice before moving on.

Set `NEXT_PUBLIC_CONSOLE_URL` to point at a different console origin during local development.
