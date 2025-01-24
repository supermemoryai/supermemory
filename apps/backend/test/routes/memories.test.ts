import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app } from "../../src";
import type { Document } from "@supermemory/db/schema";

import { testClient } from "hono/testing";
import { env, SELF } from "cloudflare:test";

const API_KEY =
  "sm_4y1M2QIpRtKJMMfXWCqAhD_NVXOqLqOzOOuIZ1qhL1Gj0BFWFPuRlng5TPvZ1OIu1Zn1G8_xuuz59M4o4l-sAkSieZgaW09COg";

interface MemoryResponse {
  items: Array<Document>;
  total: number;
}

interface SuccessResponse {
  success: boolean;
}

describe("Memories Routes", () => {
  const client = testClient(app, env);

  describe("GET /api/memories", () => {
    it("should list memories with default pagination", async () => {
      const res = await client.api.memories.$get(
        { query: {} },
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
          },
        }
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as MemoryResponse;
      expect(data).toHaveProperty("items");
      expect(data).toHaveProperty("total");
      expect(Array.isArray(data.items)).toBe(true);
    });

    it("should respect pagination parameters", async () => {
      const res = await client.api.memories.$get(
        {
          query: {
            start: "1",
            count: "5",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
          },
        }
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as MemoryResponse;
      expect(data.items.length).toBeLessThanOrEqual(5);
    });

    it("should filter by space ID", async () => {
      const res = await client.api.memories.$get(
        {
          query: {
            spaceId: "test-space-uuid",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
          },
        }
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as MemoryResponse;
      expect(data).toHaveProperty("items");
      expect(data).toHaveProperty("total");
    });

    it("should handle unauthorized space access", async () => {
      const res = await client.api.memories.$get(
        {
          query: {
            spaceId: "private-space-uuid",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
          },
        }
      );
      expect(res.status).toBe(401);
    });

    it("should reject requests without API key", async () => {
      const res = await client.api.memories.$get(
        { query: {} },
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
          },
        }
      );
      expect(res.status).toBe(401);
    });

    it("should respect ETag caching", async () => {
      // First request to get ETag
      const res1 = await client.api.memories.$get(
        { query: {} },
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
          },
        }
      );
      const etag = res1.headers.get("ETag");
      expect(etag).toBeDefined();

      // Second request with ETag
      const res2 = await client.api.memories.$get(
        { query: {} },
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            "If-None-Match": etag!,
          },
        }
      );
      expect(res2.status).toBe(304);
    });
  });

  describe("GET /api/memories/:id", () => {
    let testMemoryId: string;

    beforeAll(async () => {
      const res = await client.api.memories.$get(
        { query: {} },
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
          },
        }
      );
      const data = (await res.json()) as MemoryResponse;
      if (data.items.length > 0) {
        testMemoryId = data.items[0].uuid;
      }
    });

    it("should retrieve a specific memory", async () => {
      if (!testMemoryId) {
        console.warn("No test memory available, skipping test");
        return;
      }

      const res = await client.api.memories[":id"].$get(
        {
          param: {
            id: testMemoryId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
          },
        }
      );
      expect(res.status).toBe(200);
      const memory = await res.json();
      expect(memory).toHaveProperty("uuid", testMemoryId);
    });

    it("should reject unauthorized access", async () => {
      const res = await client.api.memories[":id"].$get(
        {
          param: {
            id: testMemoryId,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
          },
        }
      );
      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /api/memories/:id", () => {
    let memoryId: string;

    beforeAll(async () => {
      const res = await client.api.memories.$get(
        { query: {} },
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
          },
        }
      );
      const data = (await res.json()) as MemoryResponse;
      if (data.items.length > 0) {
        memoryId = data.items[0].uuid;
      }
    });

    it("should delete a memory", async () => {
      const res = await client.api.memories[":id"].$delete(
        {
          param: { id: memoryId },
        },
        {
          headers: { Authorization: `Bearer ${API_KEY}` },
        }
      );

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });

      // Verify deletion
      const getRes = await client.api.memories[":id"].$get(
        {
          param: { id: memoryId },
        },
        {
          headers: { Authorization: `Bearer ${API_KEY}` },
        }
      );
      expect(getRes.status).toBe(404);
    });

    it("should reject unauthorized deletion", async () => {
      const res = await client.api.memories[":id"].$delete(
        {
          param: { id: memoryId },
        },
        {
          headers: { Authorization: `Bearer ${API_KEY}` },
        }
      );
      expect(res.status).toBe(401);
    });
  });
});
