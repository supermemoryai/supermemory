import { db } from "@/server/db";
import { and, eq, sql } from "drizzle-orm";
import { jobs } from "@repo/db/schema";
import { type NextRequest, NextResponse } from "next/server";
import { ensureAuth } from "../ensureAuth";

export const runtime = "edge";

export async function GET(req: NextRequest) {
	const session = await ensureAuth(req);

	if (!session) {
		return new Response("Unauthorized", { status: 401 });
	}

	// Calculate the timestamp for one hour ago
	const oneHourAgoTimestamp = Math.floor(Date.now() / 1000) - 3600;

	const jobCount = await db
		.select({ count: sql<number>`count(*)`.mapWith(Number) })
		.from(jobs)
		.where(
			and(
				eq(jobs.userId, session.user.id),
				eq(jobs.status, "Processing"),
				sql`${jobs.updatedAt} > ${oneHourAgoTimestamp}`,
			),
		);

	return NextResponse.json({
		pendingJobs: jobCount[0]?.count ?? 0,
	});
}
