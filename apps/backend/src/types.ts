import { DurableObjectRateLimiter } from "@hono-rate-limiter/cloudflare";
import { Session } from "@supermemory/authkit-remix-cloudflare/src/interfaces";
import { User } from "@supermemory/db/schema";
import { z } from "zod";

export type Variables = {
  user: User | null;
  session: Session | null;
};

export type WorkflowParams = {
  userId: number;
  content: string;
  spaces?: string[];
  type: string;
  uuid: string;
  url?: string;
  prefetched?: {
    contentToVectorize: string;
    contentToSave: string;
    title: string;
    type: string;
    description: string;
    ogImage: string;
  };
  createdAt: string;
};

export type Env = {
  WORKOS_API_KEY: string;
  WORKOS_CLIENT_ID: string;
  WORKOS_COOKIE_PASSWORD: string;
  DATABASE_URL: string;
  CONTENT_WORKFLOW: Workflow;
  GEMINI_API_KEY: string;
  NODE_ENV: string;
  OPEN_AI_API_KEY: string;
  BRAINTRUST_API_KEY: string;
  RESEND_API_KEY: string;
  TURNSTILE_SECRET_KEY: string;

  MD_CACHE: KVNamespace;
  HYPERDRIVE: Hyperdrive;
  EMAIL_LIMITER: {
    limit: (params: { key: string }) => Promise<{ success: boolean }>;
  };
  ENCRYPTED_TOKENS: KVNamespace;
  RATE_LIMITER: DurableObjectNamespace<DurableObjectRateLimiter>;
  AI: Ai
};

export type JobData = {
  content: string;
  spaces?: Array<string>;
  user: number;
  type: string;
};

type BaseChunks = {
  type: "tweet" | "page" | "note" | "image";
};

export type PageOrNoteChunks = BaseChunks & {
  type: "page" | "note";
  chunks: string[];
};

export type Metadata = {
  media?: Array<string>;
  links?: Array<string>; // idk how ideal this is will figure out after plate js thing
};

export type SpaceStatus = {
  type: "inviting" | "invited" | "pending" | "accepted";
};

export const recommendedQuestionsSchema = z
  .array(z.string().max(200))
  .length(10);
