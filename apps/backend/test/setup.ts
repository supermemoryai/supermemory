import { Hono } from "hono";
import type { Env } from "../src/types";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

// Helper to generate random test content
export function generateTestContent(length: number = 1000): string {
  return Array(length)
    .fill(0)
    .map(() => Math.random().toString(36).charAt(2))
    .join("");
}

// Helper to measure response time
export async function measureResponseTime(
  fn: () => Promise<Response>
): Promise<number> {
  const start = performance.now();
  await fn();
  return performance.now() - start;
}

// Common test expectations
export const expect200 = (response: Response) =>
  expect(response.status).toBe(200);
export const expect401 = (response: Response) =>
  expect(response.status).toBe(401);
export const expect403 = (response: Response) =>
  expect(response.status).toBe(403);
export const expect404 = (response: Response) =>
  expect(response.status).toBe(404);
export const expect429 = (response: Response) =>
  expect(response.status).toBe(429);
