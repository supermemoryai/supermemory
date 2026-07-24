import { getBackendUrl } from "@/lib/url-helpers"

export type SlackWorkspaceOverrideRequest = {
	requestId: string
	teamName: string
	targetOrgName: string
	expiresAt: string
}

export type SlackWorkspaceOverrideErrorCode =
	| "invalid_confirmation"
	| "cancelled"
	| "expired"
	| "workspace_changed"
	| "unauthorized"
	| "forbidden"
	| "not_found"
	| "invalid_request"
	| "network_error"
	| "unknown"

export type SlackWorkspaceOverrideError = {
	code: SlackWorkspaceOverrideErrorCode
	status: number | null
}

export type SlackWorkspaceOverrideInspection =
	| { kind: "pending"; request: SlackWorkspaceOverrideRequest }
	| { kind: "connected"; teamName: string | null; destination: string }
	| { kind: "cancelled" }
	| { kind: "error"; error: SlackWorkspaceOverrideError }

export type SlackWorkspaceOverrideResolution =
	| { kind: "connected"; teamName: string | null; destination: string }
	| { kind: "cancelled"; destination: string }
	| { kind: "error"; error: SlackWorkspaceOverrideError }

type ApiErrorBody = { code?: string; error?: string }

type InspectBody =
	| {
			outcome: "pending"
			teamName: string
			targetOrgName: string
			expiresAt: string
	  }
	| { outcome: "connected"; teamName: string | null; destination: string }
	| { outcome: "cancelled" }

type ResolutionBody =
	| {
			outcome: "confirmed" | "connected"
			teamName: string | null
			destination: string
	  }
	| { outcome: "cancelled"; destination: string }

function normalizeConfirmation(value: string): string {
	return value.trim().normalize("NFKC").toLowerCase()
}

export function isSlackOverrideConfirmationValid(
	value: string,
	workspaceName: string,
): boolean {
	return (
		value.trim().normalize("NFKC") === "OVERRIDE" ||
		normalizeConfirmation(value) === normalizeConfirmation(workspaceName)
	)
}

export function getSlackOverrideError(
	status: number,
	body?: ApiErrorBody,
): SlackWorkspaceOverrideError {
	const serverCode = body?.code ?? body?.error
	if (serverCode === "invalid_confirmation") {
		return { code: "invalid_confirmation", status }
	}
	if (serverCode === "expired") return { code: "expired", status }
	if (serverCode === "workspace_changed" || serverCode === "superseded") {
		return { code: "workspace_changed", status }
	}

	switch (status) {
		case 400:
			return { code: "invalid_request", status }
		case 401:
			return { code: "unauthorized", status }
		case 403:
			return { code: "forbidden", status }
		case 404:
			return { code: "not_found", status }
		case 409:
			return { code: "workspace_changed", status }
		case 410:
			return { code: "expired", status }
		default:
			return { code: "unknown", status }
	}
}

export function buildSlackConnectedDestination(
	teamName: string | null,
): string {
	const params = new URLSearchParams({ slack: "connected" })
	if (teamName) params.set("team", teamName)
	return `/?${params.toString()}`
}

export function getSafeSlackOverrideDestination(
	destination: string | undefined,
	teamName: string | null,
	appOrigin: string,
): string {
	return getSafeAppDestination(
		destination,
		buildSlackConnectedDestination(teamName),
		appOrigin,
	)
}

export function getSafeAppDestination(
	destination: string | undefined,
	fallback: string,
	appOrigin: string,
): string {
	if (!destination) return fallback
	try {
		const url = new URL(destination, appOrigin)
		if (url.origin !== appOrigin || url.username || url.password)
			return fallback
		return `${url.pathname}${url.search}${url.hash}`
	} catch {
		return fallback
	}
}

function getOverrideUrl(requestId: string, action?: "confirm" | "cancel") {
	const base = `${getBackendUrl()}/brain/slack/oauth/override/${encodeURIComponent(requestId)}`
	return action ? `${base}/${action}` : base
}

async function requestJson<T>(
	url: string,
	init?: RequestInit,
): Promise<{ body?: T; error?: SlackWorkspaceOverrideError }> {
	try {
		const response = await fetch(url, {
			credentials: "include",
			...init,
			headers: { Accept: "application/json", ...init?.headers },
		})
		const body = (await response.json().catch(() => undefined)) as
			| T
			| ApiErrorBody
			| undefined
		if (!response.ok) {
			return {
				error: getSlackOverrideError(response.status, body as ApiErrorBody),
			}
		}
		return { body: body as T }
	} catch {
		return { error: { code: "network_error", status: null } }
	}
}

export async function inspectSlackWorkspaceOverride(
	requestId: string,
): Promise<SlackWorkspaceOverrideInspection> {
	const result = await requestJson<InspectBody>(getOverrideUrl(requestId), {
		cache: "no-store",
	})
	if (result.error) return { kind: "error", error: result.error }
	const body = result.body
	if (body?.outcome === "pending") {
		return {
			kind: "pending",
			request: {
				requestId,
				teamName: body.teamName,
				targetOrgName: body.targetOrgName,
				expiresAt: body.expiresAt,
			},
		}
	}
	if (body?.outcome === "connected") {
		return {
			kind: "connected",
			teamName: body.teamName,
			destination: body.destination,
		}
	}
	if (body?.outcome === "cancelled") return { kind: "cancelled" }
	return { kind: "error", error: { code: "unknown", status: 200 } }
}

export async function resolveSlackWorkspaceOverride(
	requestId: string,
	action: "confirm" | "cancel",
	confirmation?: string,
): Promise<SlackWorkspaceOverrideResolution> {
	const result = await requestJson<ResolutionBody>(
		getOverrideUrl(requestId, action),
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(
				action === "confirm" ? { confirmation: confirmation ?? "" } : {},
			),
		},
	)
	if (result.error) return { kind: "error", error: result.error }
	if (
		result.body?.outcome === "confirmed" ||
		result.body?.outcome === "connected"
	) {
		return {
			kind: "connected",
			teamName: result.body.teamName,
			destination: result.body.destination,
		}
	}
	if (result.body?.outcome === "cancelled") {
		return { kind: "cancelled", destination: result.body.destination }
	}
	return { kind: "error", error: { code: "unknown", status: 200 } }
}
