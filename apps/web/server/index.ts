import type { AppLoadContext } from "@remix-run/cloudflare"

import { createOpenAI } from "@ai-sdk/openai"
import { zValidator } from "@hono/zod-validator"
import { getSessionFromRequest } from "@supermemory/authkit-remix-cloudflare/src/session"
import {
    convertToCoreMessages,
    generateObject,
    generateText,
    streamText,
} from "ai"
import * as cheerio from "cheerio"
import { putEncryptedKV } from "encrypt-workers-kv"
import { Hono } from "hono"
import { z } from "zod"

const app = new Hono<{ Bindings: Env }>()

app.onError(async (err, c) => {
    return c.text(err.message, { status: 500 })
})

app.get("/api/metadata", async (c) => {
    const url = c.req.query("url")
    if (!url) {
        return c.text("URL is required", { status: 400 })
    }

    const cacheKey = `metadata:${url}`

    // Try to get cached metadata
    const cachedMetadata = await c.env.METADATA_KV.get(cacheKey, "json")
    if (cachedMetadata) {
        return c.json(cachedMetadata)
    }

    // If not cached, fetch and parse metadata
    try {
        const response = await fetch(url)
        const html = await response.text()
        const $ = cheerio.load(html)

        // Try multiple image selectors in order of preference
        const image =
            $('meta[property="og:image"]').attr("content") ||
            $('meta[property="twitter:image"]').attr("content") ||
            $('meta[name="thumbnail"]').attr("content") ||
            $('link[rel="image_src"]').attr("href") ||
            $('img[itemprop="image"]').attr("src") ||
            $("img").first().attr("src") ||
            ""

        // Convert relative image URLs to absolute
        const absoluteImage = image ? new URL(image, url).toString() : ""

        const metadata = {
            title:
                $("title").text() ||
                $('meta[property="og:title"]').attr("content") ||
                "",
            description:
                $('meta[name="description"]').attr("content") ||
                $('meta[property="og:description"]').attr("content") ||
                "",
            image: absoluteImage,
        }

        // Cache the metadata
        await c.env.METADATA_KV.put(cacheKey, JSON.stringify(metadata), {
            expirationTtl: 7 * 24 * 60 * 60,
        }) // 7 days TTL

        return c.json(metadata)
    } catch (error) {
        console.error("Error fetching metadata:", error)
        return c.json({ error: "Failed to fetch metadata" }, 500)
    }
})

app.get("/api/session", async (c) => {
    const fakeContext = {
        cloudflare: {
            env: c.env,
        },
    }
    const session = await getSessionFromRequest(
        c.req.raw,
        fakeContext as AppLoadContext,
    )
    if (!session) {
        return c.json({ error: "No session found" }, 401)
    }
    return c.json(session)
})

app.all("/backend/*", async (c) => {
    const backendUrl =
        c.env.BACKEND_URL ?? "https://supermemory-backend.dhravya.workers.dev"
    const path = c.req.path.replace("/backend", "")
    const searchParams = new URL(c.req.url).searchParams.toString()
    const queryString = searchParams ? `?${searchParams}` : ""
    const url = `${backendUrl}${path}${queryString}`

    const headers = new Headers(c.req.raw.headers)
    headers.delete("host")

    let body
    if (c.req.raw.body) {
        try {
            // Use tee() to create a copy of the body stream
            const [stream1, stream2] = c.req.raw.body.tee()

            const reader = stream2.getReader()
            const chunks = []
            let done = false

            while (!done) {
                const { value, done: isDone } = await reader.read()
                if (value) {
                    chunks.push(value)
                }
                done = isDone
            }

            const bodyText = new TextDecoder().decode(
                chunks.reduce((acc, chunk) => {
                    const tmp = new Uint8Array(acc.length + chunk.length)
                    tmp.set(acc)
                    tmp.set(chunk, acc.length)
                    return tmp
                }, new Uint8Array(0)),
            )

            if (c.req.method === "POST") {
                try {
                    const parsedBody = JSON.parse(bodyText)
                    body = JSON.stringify(parsedBody)
                } catch (e) {
                    console.error("Invalid JSON in request body:", bodyText)
                    return c.json(
                        {
                            error: "Invalid JSON in request body",
                            details: bodyText.substring(0, 100) + "...", // Show partial body for debugging
                        },
                        400,
                    )
                }
            } else {
                body = bodyText
            }
        } catch (error) {
            console.error("Error reading request body:", error)
            return c.json(
                {
                    error: "Failed to process request body",
                    details:
                        error instanceof Error
                            ? error.message
                            : "Unknown error",
                    path: path,
                },
                400,
            )
        }
    }

    const fetchOptions: RequestInit = {
        method: c.req.method,
        headers: headers,
        ...(body && { body }),
    }

    if (c.req.method !== "GET" && c.req.method !== "HEAD") {
        ;(fetchOptions as any).duplex = "half"
    }

    try {
        const response = await fetch(url, fetchOptions)

        const newHeaders = new Headers(response.headers)
        newHeaders.delete("set-cookie")

        const setCookieHeaders = response.headers.get("set-cookie")
        if (setCookieHeaders) {
            setCookieHeaders.split(", ").forEach((cookie: string) => {
                c.header("set-cookie", cookie)
            })
        }

        if (
            response.headers.get("content-type")?.includes("text/event-stream")
        ) {
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: {
                    ...newHeaders,
                    "content-type": "text/event-stream",
                    "cache-control": "no-cache",
                    connection: "keep-alive",
                },
            })
        }

        if (
            response.body &&
            response.headers.get("content-type")?.includes("text/x-unknown")
        ) {
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders,
            })
        }

        let responseBody
        try {
            const responseText = await response.text()
            try {
                responseBody = JSON.parse(responseText)
            } catch {
                responseBody = responseText
            }
        } catch (error) {
            console.error("Error reading response:", error)
            return c.json(
                {
                    error: "Failed to read backend response",
                    details:
                        error instanceof Error
                            ? error.message
                            : "Unknown error",
                    path: path,
                },
                502,
            )
        }

        return new Response(JSON.stringify(responseBody), {
            status: response.status,
            statusText: response.statusText,
            headers: {
                ...newHeaders,
                "content-type": "application/json",
            },
        })
    } catch (error) {
        console.error("Error proxying request:", error)
        return c.json(
            {
                error: "Failed to proxy request to backend",
                details:
                    error instanceof Error ? error.message : "Unknown error",
                path: path,
                url: url,
            },
            502,
        )
    }
})

app.post("/api/ai/command", async (c) => {
    const { messages, model = "gpt-4o-mini", system } = await c.req.json()

    const apiKey = c.env.OPENAI_API_KEY

    if (!apiKey) {
        return c.json({ error: "Missing OpenAI API key." }, 401)
    }

    const openai = createOpenAI({ apiKey })

    try {
        const result = await streamText({
            maxTokens: 2048,
            messages: convertToCoreMessages(messages),
            model: openai(model),
            system: system,
        })

        return result.toDataStreamResponse()
    } catch (error) {
        console.error("Failed to process AI request:", error)
        return c.json({ error: "Failed to process AI request" }, 500)
    }
})

app.post("/api/ai/copilot", async (c) => {
    const {
        apiKey: key,
        model = "gpt-4o-mini",
        prompt,
        system,
    } = await c.req.json()

    const apiKey = key || c.env.OPENAI_API_KEY

    if (!apiKey) {
        return c.json({ error: "Missing OpenAI API key." }, 401)
    }

    const openai = createOpenAI({ apiKey })

    try {
        const result = await generateText({
            maxTokens: 50,
            model: openai(model),
            prompt: prompt,
            system,
            temperature: 0.7,
        })

        return c.json(result)
    } catch (error: any) {
        if (error.name === "AbortError") {
            return c.json(null, { status: 408 })
        }

        console.error("Failed to process AI request:", error)
        return c.json({ error: "Failed to process AI request" }, 500)
    }
})

app.post("/api/ai/update", async (c) => {
    const { caption, document } = await c.req.json()

    const apiKey = c.env.OPENAI_API_KEY

    if (!apiKey) {
        return c.json({ error: "Missing OpenAI API key." }, 401)
    }

    const openai = createOpenAI({ apiKey })

    const result = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: z.object({
            action: z.enum(["edit", "delete", "append", "ignore"]),
            blockId: z.string().optional(),
            content: z.string().optional(),
        }),
        prompt: `You are a professional technical document editor.

You are given a document and a new caption that was transcribed from a recording.

Your job is to analyze how to update the document to reflect the new caption.

Given this document structure:
${JSON.stringify(document)}

And this new caption that was transcribed:
${caption}

Analyze how to update the document. Choose one:
1. Edit an existing block (provide blockId and new content)
2. Delete a block (provide blockId)
3. Append new content (provide content)
4. Ignore the new content if it doesn't meaningfully improve the document

You can be strict in ignoring. if the transcript is not related to the content of the document, you should ignore it.

Sometimes you may need to edit things below the headers, or move things around. Do what you think is best. That's all right.

For eg, if I am talking about the features, add it to the block ID BELOW the features header. Don't change the heading blogs

I will first talk about "what supermemory is", you need to add it to the block id that is right below the heading "what is supermemory?".
Then, I will talk about our charter. I will say somethuing like "we want to help companies write and read better documentation". now, you need to add it to the block id that is right below the heading "our charter".
I will talk about features like "you can actually edit the docs along with AI, seamlessly integrate it into your workflow". now, you need to add it to the block id that is right below the heading "features".
I will also talk about connections with existing documentation platforms. now, you need to add it to the block id that is right below the heading "how we will do it".

there should not be any repetitive stuff. it should be professional.
Make sure that the document you write is a good, accurate, and up-to-date document.`,
    })

    return c.json(result.object)
})

app.all(
    "/auth/notion/callback",
    zValidator("query", z.object({ code: z.string() })),
    async (c) => {
        const { code } = c.req.valid("query")

        const notionCredentials = btoa(
            `${c.env.NOTION_CLIENT_ID}:${c.env.NOTION_CLIENT_SECRET}`,
        )

        const response = await fetch("https://api.notion.com/v1/oauth/token", {
            method: "POST",
            headers: {
                Authorization: `Basic ${notionCredentials}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                grant_type: "authorization_code",
                code: code,
                redirect_uri:
                    c.env.NODE_ENV === "production"
                        ? "https://supermemory.ai/auth/notion/callback"
                        : "http://localhost:3000/auth/notion/callback",
            }),
        })

        const data = await response.json()

        const fakeContext = {
            cloudflare: {
                env: c.env,
            },
        }

        const currentUser = await getSessionFromRequest(
            c.req.raw,
            fakeContext as AppLoadContext,
        )

        console.log(currentUser?.user.id)
        const success = !(data as any).error

        if (!success) {
            return c.redirect(`/?error=${(data as any).error}`)
        }

        const accessToken = (data as any).access_token

        // const key = await crypto.subtle.importKey(
        // 	"raw",
        // 	new TextEncoder().encode(c.env.WORKOS_COOKIE_PASSWORD),
        // 	{ name: "AES-GCM" },
        // 	false,
        // 	["encrypt", "decrypt"],
        // );

        // const encrypted = await crypto.subtle.encrypt(
        // 	{ name: "AES-GCM", iv: new Uint8Array(20) },
        // 	key,
        // 	new TextEncoder().encode(accessToken),
        // );

        // const encryptedString = btoa(String(encrypted));

        // await c.env.ENCRYPTED_TOKENS.put(`${currentUser?.user.id}-notion`, encryptedString);

        await putEncryptedKV(
            c.env.ENCRYPTED_TOKENS,
            `${currentUser?.user.id}-notion`,
            accessToken,
            `${c.env.WORKOS_COOKIE_PASSWORD}-${currentUser?.user.id}`,
        )

        return c.redirect(`/?success=${success}&integration=notion`)
    },
)

export default app
