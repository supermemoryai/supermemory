import { z } from "zod";
import { type Context, Hono } from "hono";
import { auth } from "./auth";
import { logger } from "hono/logger";
import { timing } from "hono/timing";
import type { Env, Variables } from "./types";
import { zValidator } from "@hono/zod-validator";
import { database } from "@supermemory/db";
import { waitlist } from "@supermemory/db/schema";
import { cors } from "hono/cors";
import { ContentWorkflow } from "./workflow";
import { Resend } from "resend";
import { LandingPage } from "./components/landing";
import user from "./routes/user";
import spacesRoute from "./routes/spaces";
import actions from "./routes/actions";
import memories from "./routes/memories";
import integrations from "./routes/integrations";
import { fromHono } from "chanfana";
import {
  DurableObjectRateLimiter,
  DurableObjectStore,
} from "@hono-rate-limiter/cloudflare";
import type { ConfigType, GeneralConfigType, rateLimiter } from "hono-rate-limiter";

// Create base Hono app first
const honoApp = new Hono<{ Variables: Variables; Bindings: Env }>();

const app = fromHono(honoApp);

// Add all middleware and routes
app.use("*", timing());
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: [
      "http://localhost:3000",
      "https://supermemory.ai",
      "https://*.supermemory.ai",
      "https://*.supermemory.com",
      "https://supermemory.com",
      "chrome-extension://*",
    ],
    allowHeaders: ["*"],
    allowMethods: ["*"],
    credentials: true,
    exposeHeaders: ["*"],
  })
);

app.use("/v1/*", auth);
app.use("/v1/*", (c, next) => {
  const user = c.get("user");

  if (c.env.NODE_ENV === "development") {
    return next();
  }

  // RATELIMITS
  const rateLimitConfig = {
    // Endpoints that bypass rate limiting
    excludedPaths: [
      "/v1/add",
      "/v1/chat",
      "/v1/suggested-learnings",
      "/v1/recommended-questions",
    ] as (string | RegExp)[],

    // Custom rate limits for specific endpoints
    customLimits: {
      notionImport: {
        paths: ["/v1/integrations/notion/import", "/v1/integrations/notion"],
        windowMs: 10 * 60 * 1000, // 10 minutes
        limit: 5, // 5 requests per 10 minutes
      },
      inviteSpace: {
        paths: [/^\v1\/spaces\/[^/]+\/invite$/],
        windowMs: 60 * 1000, // 1 minute
        limit: 5, // 5 requests per minute
      },
    } as Record<
      string,
      { paths: (string | RegExp)[]; windowMs: number; limit: number }
    >,

    default: {
      windowMs: 60 * 1000, // 1 minute
      limit: 100, // 100 requests per minute
    },

    common: {
      standardHeaders: "draft-6",
      keyGenerator: (c: Context) =>
        `${user?.uuid ?? c.req.header("cf-connecting-ip")}-${new Date().getDate()}`, // day so that limit gets reset every day
      store: new DurableObjectStore({ namespace: c.env.RATE_LIMITER }),
    } as GeneralConfigType<ConfigType>,
  };

  if (
    c.req.path &&
    rateLimitConfig.excludedPaths.some((path) =>
      typeof path === "string" ? c.req.path === path : path.test(c.req.path)
    )
  ) {
    return next();
  }

  // Check for custom rate limits
  for (const [_, config] of Object.entries(rateLimitConfig.customLimits)) {
    if (
      config.paths.some((path) =>
        typeof path === "string" ? c.req.path === path : path.test(c.req.path)
      )
    ) {
      return rateLimiter({
        windowMs: config.windowMs,
        limit: config.limit,
        ...rateLimitConfig.common,
      })(c as any, next);
    }
  }

  // Apply default rate limit
  return rateLimiter({
    windowMs: rateLimitConfig.default.windowMs,
    limit: rateLimitConfig.default.limit,
    ...rateLimitConfig.common,
  })(c as any, next);
});

app.get("/", (c) => {
  return c.html(<LandingPage />);
});

// TEMPORARY REDIRECT
app.all("/api/*", async (c) => {
  // Get the full URL and path
  const url = new URL(c.req.url);
  const path = url.pathname;
  const newPath = path.replace("/api", "/v1");

  // Preserve query parameters and build target URL
  const redirectUrl = `https://api.supermemory.ai${newPath}${url.search}`;

  // Use c.redirect() for a proper redirect
  return c.redirect(redirectUrl);
});

app.route("/v1/user", user);
app.route("/v1/spaces", spacesRoute);
app.route("/v1", actions);
app.route("/v1/integrations", integrations);
app.route("/v1/memories", memories);

app.get("/v1/session", (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return c.json({
    user,
  });
});

app.post(
  "/waitlist",
  zValidator(
    "json",
    z.object({ email: z.string().email(), token: z.string() })
  ),
  async (c) => {
    const { email, token } = c.req.valid("json");

    const address = c.req.raw.headers.get("CF-Connecting-IP");

    const idempotencyKey = crypto.randomUUID();
    const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
    const firstResult = await fetch(url, {
      body: JSON.stringify({
        secret: c.env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: address,
        idempotency_key: idempotencyKey,
      }),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const firstOutcome = (await firstResult.json()) as { success: boolean };

    if (!firstOutcome.success) {
      console.info("Turnstile verification failed", firstOutcome);
      return c.json(
        { error: "Turnstile verification failed" },
        439 as StatusCode
      );
    }

    const resend = new Resend(c.env.RESEND_API_KEY);

    const db = database(c.env.HYPERDRIVE.connectionString);

    const ip =
      c.req.header("cf-connecting-ip") ||
      `${c.req.raw.cf?.asn}-${c.req.raw.cf?.country}-${c.req.raw.cf?.city}-${c.req.raw.cf?.region}-${c.req.raw.cf?.postalCode}`;

    const { success } = await c.env.EMAIL_LIMITER.limit({ key: ip });

    if (!success) {
      return c.json({ error: "Rate limit exceeded" }, 429);
    }

    const message = `Supermemory started as a side project a few months ago when I built it as a hackathon project.
    <br></br>
    you guys loved it too much. like wayy too much. it was embarrassing, because this was not it - it was nothing but a hackathon project.
    <br></br>
    I launched on github too. <a href="https://git.new/memory">https://github.com/supermemoryai/supermemory</a>, and we were somehow one of the fastest growing open source repositories in Q3 2024.
   <br></br><br></br>
    So, it's time to make this good. My vision is to make supermemory the best memory tool on the internet.
    `;

    try {
      await db.insert(waitlist).values({ email });
      await resend.emails.send({
        from: "Dhravya From Supermemory <waitlist@m.supermemory.com>",
        to: email,
        subject: "You're in the waitlist - A personal note from Dhravya",
        html: `<p>Hi. I'm Dhravya. I'm building Supermemory to help people remember everything.<br></br> ${message} <br></br><br></br>I'll be in touch when we launch! Till then, just reply to this email if you wanna talk :)<br></br>If you want to follow me on X, here's my handle: <a href='https://x.com/dhravyashah'>@dhravyashah</a><br></br><br></br>- Dhravya</p>`,
      });
    } catch (e) {
      console.error(e);
      return c.json({ error: "Failed to add to waitlist" }, 400);
    }

    return c.json({ success: true });
  }
);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Internal server error" }, 500);
});

export default {
  fetch: app.fetch,
};

export { ContentWorkflow, DurableObjectRateLimiter };

export type AppType = typeof app;
