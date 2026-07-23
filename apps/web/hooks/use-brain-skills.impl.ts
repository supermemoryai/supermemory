"use client"

import { useAuth } from "@lib/auth-context"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type {
	NewSkillOrigin,
	SkillDraft,
	SkillScope,
} from "@/components/settings/company-brain-skills/domain"
import { skillSaveRequestBody } from "@/components/settings/company-brain-skills/domain"

const BACKEND =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"
const BASE = `${BACKEND}/brain/skills`

export type BrainSkillStatus = "active" | "disabled"

export type BrainSkill = {
	id: string
	name: string
	description: string
	body: string
	scope: SkillScope
	status: BrainSkillStatus
	creatorUserId: string
	canEdit: boolean
	canDelete: boolean
	version: number
	createdAt: number
	updatedAt: number
	rejectionReason: string | null
}

export type BrainSkillsResponse = {
	skills: BrainSkill[]
	isAdmin: boolean
	viewerId: string
}

export const brainSkillKeys = {
	all: (orgId: string | undefined, userId: string | undefined) =>
		["brain", "skills", orgId, userId] as const,
	list: (orgId: string | undefined, userId: string | undefined) =>
		[...brainSkillKeys.all(orgId, userId), "list"] as const,
}

class BrainSkillRequestError extends Error {
	readonly status: number

	constructor(message: string, status: number) {
		super(message)
		this.name = "BrainSkillRequestError"
		this.status = status
	}
}

async function responseError(response: Response, fallback: string) {
	const body = (await response.json().catch(() => null)) as {
		error?: string | { message?: string }
		message?: string
	} | null
	const nested =
		typeof body?.error === "object" ? body.error.message : undefined
	const message =
		body?.message ??
		(typeof body?.error === "string" ? body.error : undefined) ??
		nested ??
		fallback
	return new BrainSkillRequestError(message, response.status)
}

async function jsonRequest<T>(
	url: string,
	init: RequestInit,
	fallback: string,
) {
	const response = await fetch(url, { credentials: "include", ...init })
	if (!response.ok) throw await responseError(response, fallback)
	return (await response.json()) as T
}

export function useBrainSkills() {
	const { org, user } = useAuth()
	return useQuery({
		queryKey: brainSkillKeys.list(org?.id, user?.id),
		queryFn: () =>
			jsonRequest<BrainSkillsResponse>(`${BASE}/`, {}, "Couldn't load skills."),
		enabled: !!org?.id && !!user?.id,
	})
}

function useInvalidateBrainSkills() {
	const { org, user } = useAuth()
	const queryClient = useQueryClient()
	return () =>
		queryClient.invalidateQueries({
			queryKey: brainSkillKeys.all(org?.id, user?.id),
		})
}

export function useSaveBrainSkill() {
	const invalidate = useInvalidateBrainSkills()
	return useMutation({
		mutationFn: ({
			id,
			draft,
			createOrigin,
			expectedVersion,
		}: {
			id: string | null
			draft: SkillDraft
			createOrigin?: NewSkillOrigin
			expectedVersion?: number
		}) =>
			jsonRequest<{ skill: BrainSkill }>(
				id ? `${BASE}/${id}` : `${BASE}/`,
				{
					method: id ? "PUT" : "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(
						skillSaveRequestBody(draft, id, createOrigin, expectedVersion),
					),
				},
				"Couldn't save this skill.",
			),
		onSuccess: () => {
			void invalidate()
		},
		onError: (error) => {
			if (error instanceof BrainSkillRequestError && error.status === 409) {
				void invalidate()
			}
		},
	})
}

export function useDeleteBrainSkill() {
	const invalidate = useInvalidateBrainSkills()
	return useMutation({
		mutationFn: ({
			id,
			expectedVersion,
		}: {
			id: string
			expectedVersion: number
		}) =>
			jsonRequest<{ ok?: boolean }>(
				`${BASE}/${id}`,
				{
					method: "DELETE",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ expectedVersion }),
				},
				"Couldn't delete this skill.",
			),
		onSuccess: () => {
			void invalidate()
		},
		onError: (error) => {
			if (error instanceof BrainSkillRequestError && error.status === 409) {
				void invalidate()
			}
		},
	})
}

export function useUploadBrainSkill() {
	return useMutation({
		mutationFn: (content: string) =>
			jsonRequest<{
				draft: Partial<SkillDraft> & { origin?: "upload" }
			}>(
				`${BASE}/upload`,
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ content }),
				},
				"Couldn't read this skill file.",
			),
	})
}
