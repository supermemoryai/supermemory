"use client"

import { useState, useEffect, useCallback } from "react"
import { $fetch } from "@lib/api"
import { useAuth } from "@lib/auth-context"
import type { SearchResult } from "@repo/validation/api"

const CACHE_KEY_PREFIX = "sm_profession_v2"
const LEGACY_CACHE_KEY = "sm_profession_v1"
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export type Profession =
	| "developer"
	| "finance"
	| "research"
	| "design"
	| "legal"
	| "marketing"
	| "medical"
	| "default"

export interface PersonalizedCopy {
	saveLink: string
	writeNote: string
	chatPlaceholder: string
}

type CopyPool = Record<keyof PersonalizedCopy, string[]>

const COPY_POOLS: Record<Profession, CopyPool> = {
	developer: {
		saveLink: [
			"Save a repo",
			"Clip a Stack Overflow answer",
			"Save an issue thread",
			"Save a docs page",
			"Clip an RFC",
			"Save a blog post",
			"Save a gist",
			"Save an API reference",
			"Clip a changelog",
		],
		writeNote: [
			"Write dev notes",
			"Log a debug session",
			"Draft an RFC",
			"Write a postmortem",
			"Note an architecture idea",
			"Capture a code review thought",
			"Log a learning",
			"Write a TIL",
		],
		chatPlaceholder: [
			"Ask about your code, docs, or notes…",
			"What do you remember about that bug?",
			"Search across your saved repos…",
			"What did we ship last sprint?",
			"Pull up that auth design we discussed…",
		],
	},
	finance: {
		saveLink: [
			"Save an article",
			"Clip an earnings transcript",
			"Save a research note",
			"Save a market report",
			"Clip an analyst piece",
			"Save a chart",
			"Save a thesis",
		],
		writeNote: [
			"Log a thesis",
			"Write trade notes",
			"Draft an investment memo",
			"Capture a market take",
			"Log a position rationale",
			"Note a portfolio change",
		],
		chatPlaceholder: [
			"Ask about your research or portfolio…",
			"What was my thesis on that name?",
			"Pull up earnings notes for last quarter…",
			"Search across your saved research…",
		],
	},
	research: {
		saveLink: [
			"Save a paper",
			"Clip a preprint",
			"Save a citation",
			"Save a dataset",
			"Save a journal article",
			"Clip a quote",
			"Save a methodology",
		],
		writeNote: [
			"Write notes",
			"Log a literature note",
			"Draft a hypothesis",
			"Capture a finding",
			"Write a methods note",
			"Note a counterargument",
		],
		chatPlaceholder: [
			"Ask about your reading or research…",
			"What did that paper say about…",
			"Pull up sources on this topic…",
			"Search across your reading list…",
		],
	},
	design: {
		saveLink: [
			"Save inspiration",
			"Clip a reference",
			"Save a design system page",
			"Save a moodboard",
			"Save a portfolio piece",
			"Clip a screenshot",
			"Save a pattern",
		],
		writeNote: [
			"Write a brief",
			"Capture a design crit",
			"Note a pattern idea",
			"Draft critique notes",
			"Log a feedback round",
			"Write a spec",
		],
		chatPlaceholder: [
			"What are you working on today?",
			"Pull up references for…",
			"Find me that pattern from…",
			"Search across your inspiration…",
		],
	},
	legal: {
		saveLink: [
			"Save a document",
			"Clip a case",
			"Save a statute",
			"Save a contract clause",
			"Save a memo",
			"Clip a regulator update",
		],
		writeNote: [
			"Write a memo",
			"Log a case note",
			"Draft a deposition note",
			"Capture a precedent",
			"Note a clause issue",
		],
		chatPlaceholder: [
			"Ask about your cases or contracts…",
			"Pull up that clause we drafted…",
			"Find precedents on…",
			"Search across your matter notes…",
		],
	},
	marketing: {
		saveLink: [
			"Save a resource",
			"Clip a competitor page",
			"Save a campaign",
			"Save an ad reference",
			"Save a content piece",
			"Clip a landing page",
		],
		writeNote: [
			"Write campaign notes",
			"Log a launch retro",
			"Draft a creative brief",
			"Note a positioning idea",
			"Capture a learning",
		],
		chatPlaceholder: [
			"Ask about your campaigns or research…",
			"What worked in last quarter's launch?",
			"Pull up positioning notes…",
			"Search across your campaigns…",
		],
	},
	medical: {
		saveLink: [
			"Save a study",
			"Clip a guideline",
			"Save a journal article",
			"Save a case report",
			"Clip a treatment protocol",
		],
		writeNote: [
			"Write clinical notes",
			"Log a case discussion",
			"Draft a treatment note",
			"Capture a teaching point",
			"Note a differential",
		],
		chatPlaceholder: [
			"Ask about your research or cases…",
			"Pull up the guideline on…",
			"Find studies on…",
			"Search across your literature…",
		],
	},
	default: {
		saveLink: [
			"Save link",
			"Clip a page",
			"Save an article",
			"Save a video",
			"Save a thread",
		],
		writeNote: [
			"Write note",
			"Capture a thought",
			"Log an idea",
			"Draft a list",
		],
		chatPlaceholder: [
			"Ask your supermemory…",
			"What was that thing about…",
			"Pull up notes on…",
			"Search across your memory…",
		],
	},
}

function pickFrom<T>(arr: readonly T[]): T {
	return arr[Math.floor(Math.random() * arr.length)] as T
}

function pickCopy(p: Profession): PersonalizedCopy {
	const pool = COPY_POOLS[p]
	return {
		saveLink: pickFrom(pool.saveLink),
		writeNote: pickFrom(pool.writeNote),
		chatPlaceholder: pickFrom(pool.chatPlaceholder),
	}
}

function defaultCopy(p: Profession): PersonalizedCopy {
	const pool = COPY_POOLS[p]
	return {
		saveLink: pool.saveLink[0] ?? "",
		writeNote: pool.writeNote[0] ?? "",
		chatPlaceholder: pool.chatPlaceholder[0] ?? "",
	}
}

const DEFAULT_COPY = defaultCopy("default")

type PersonalizationState = {
	scopeKey: string | null
	copy: PersonalizedCopy
	profession: Profession
}

function defaultState(scopeKey: string | null): PersonalizationState {
	return { scopeKey, copy: DEFAULT_COPY, profession: "default" }
}

function getScopeKey(userId: string, orgId: string): string {
	return `u:${encodeURIComponent(userId)}:o:${encodeURIComponent(orgId)}`
}

function getCacheKey(scopeKey: string): string {
	return `${CACHE_KEY_PREFIX}:${scopeKey}`
}

function readCachedProfession(scopeKey: string): Profession | null {
	try {
		const raw = localStorage.getItem(getCacheKey(scopeKey))
		if (!raw) return null
		const cached = JSON.parse(raw) as {
			profession?: unknown
			ts?: unknown
		}
		const age = Date.now() - Number(cached.ts)
		if (
			typeof cached.profession !== "string" ||
			!Object.hasOwn(COPY_POOLS, cached.profession) ||
			typeof cached.ts !== "number" ||
			!Number.isFinite(cached.ts) ||
			age < 0 ||
			age >= CACHE_TTL_MS
		) {
			return null
		}
		return cached.profession as Profession
	} catch {
		return null
	}
}

function writeCachedProfession(scopeKey: string, profession: Profession) {
	try {
		localStorage.setItem(
			getCacheKey(scopeKey),
			JSON.stringify({ profession, ts: Date.now() }),
		)
	} catch {}
}

const sessionCopyCache: Partial<Record<Profession, PersonalizedCopy>> = {}

function getSessionCopy(p: Profession): PersonalizedCopy {
	const cached = sessionCopyCache[p]
	if (cached) return cached
	const fresh = pickCopy(p)
	sessionCopyCache[p] = fresh
	return fresh
}

const KEYWORDS: Record<Exclude<Profession, "default">, string[]> = {
	developer: [
		"software",
		"engineer",
		"developer",
		"programming",
		"code",
		"github",
		"typescript",
		"javascript",
		"python",
		"backend",
		"frontend",
		"api",
		"repository",
		"startup",
		"swe",
		"tech",
		"devops",
		"cloud",
	],
	finance: [
		"finance",
		"investment",
		"portfolio",
		"trading",
		"stock",
		"fund",
		"equity",
		"crypto",
		"banking",
		"analyst",
		"fintech",
		"hedge",
		"venture",
		"capital",
		"asset",
		"valuation",
		"economics",
	],
	research: [
		"research",
		"academia",
		"phd",
		"paper",
		"journal",
		"study",
		"scholar",
		"university",
		"professor",
		"scientist",
		"thesis",
		"experiment",
		"hypothesis",
		"data analysis",
		"publication",
	],
	design: [
		"design",
		"ux",
		"ui",
		"figma",
		"creative",
		"visual",
		"brand",
		"illustrator",
		"adobe",
		"typography",
		"wireframe",
		"prototype",
		"product design",
		"graphic",
		"art director",
	],
	legal: [
		"lawyer",
		"attorney",
		"legal",
		"law",
		"contract",
		"compliance",
		"litigation",
		"counsel",
		"paralegal",
		"court",
		"regulatory",
		"intellectual property",
		"patent",
		"trademark",
	],
	marketing: [
		"marketing",
		"growth",
		"seo",
		"content",
		"campaign",
		"brand",
		"advertising",
		"social media",
		"pr",
		"communications",
		"copywriting",
		"conversion",
		"analytics",
		"inbound",
	],
	medical: [
		"doctor",
		"physician",
		"medical",
		"healthcare",
		"clinical",
		"hospital",
		"nursing",
		"surgery",
		"patient",
		"medicine",
		"diagnosis",
		"treatment",
		"pharmacology",
		"dentist",
	],
}

function classifyProfession(results: SearchResult[]): Profession {
	const text = results
		.flatMap((r) => [
			r.title ?? "",
			r.summary ?? "",
			...(r.chunks?.slice(0, 2).map((c) => c.content) ?? []),
		])
		.join(" ")
		.toLowerCase()

	const scores: Partial<Record<Profession, number>> = {}
	for (const [prof, words] of Object.entries(KEYWORDS)) {
		scores[prof as Profession] = words.filter((w) => text.includes(w)).length
	}

	const best = (Object.entries(scores) as [Profession, number][]).sort(
		(a, b) => b[1] - a[1],
	)[0]
	return best && best[1] > 0 ? best[0] : "default"
}

const inflightPromises = new Map<string, Promise<Profession | null>>()
const manualSelectionVersions = new Map<string, number>()

function detectProfession(scopeKey: string): Promise<Profession | null> {
	const inflight = inflightPromises.get(scopeKey)
	if (inflight) return inflight

	const request = $fetch("@post/search", {
		body: {
			q: "career profession field industry background work role",
			limit: 8,
		},
	})
		.then((res) => {
			const results = res.data?.results
			if (!results?.length) return null
			return classifyProfession(results)
		})
		.catch(() => null)

	inflightPromises.set(scopeKey, request)
	void request.finally(() => {
		if (inflightPromises.get(scopeKey) === request) {
			inflightPromises.delete(scopeKey)
		}
	})
	return request
}

export function usePersonalization(): {
	copy: PersonalizedCopy
	profession: Profession
	setProfession: (p: Profession) => void
} {
	const { isSessionPending, isRestoring, session, user, org } = useAuth()
	const scopeKey =
		!isSessionPending &&
		!isRestoring &&
		session &&
		user &&
		org &&
		session.userId === user.id &&
		session.activeOrganizationId === org.id
			? getScopeKey(user.id, org.id)
			: null
	const [state, setState] = useState<PersonalizationState>(() =>
		defaultState(null),
	)
	const visibleState =
		state.scopeKey === scopeKey ? state : defaultState(scopeKey)

	const setProfession = useCallback(
		(p: Profession) => {
			if (!scopeKey) return
			manualSelectionVersions.set(
				scopeKey,
				(manualSelectionVersions.get(scopeKey) ?? 0) + 1,
			)
			writeCachedProfession(scopeKey, p)
			// Re-pick on explicit change so the user sees fresh copy for the new identity
			const freshCopy = pickCopy(p)
			sessionCopyCache[p] = freshCopy
			setState({ scopeKey, copy: freshCopy, profession: p })
		},
		[scopeKey],
	)

	useEffect(() => {
		try {
			localStorage.removeItem(LEGACY_CACHE_KEY)
		} catch {}
		setState(defaultState(scopeKey))
		if (!scopeKey) return

		const cached = readCachedProfession(scopeKey)
		if (cached) {
			setState({
				scopeKey,
				copy: getSessionCopy(cached),
				profession: cached,
			})
			return
		}

		let cancelled = false
		const manualSelectionVersion = manualSelectionVersions.get(scopeKey) ?? 0
		void detectProfession(scopeKey).then((detected) => {
			if (
				cancelled ||
				!detected ||
				(manualSelectionVersions.get(scopeKey) ?? 0) !== manualSelectionVersion
			) {
				return
			}
			const cachedAfterRequest = readCachedProfession(scopeKey)
			const resolvedProfession = cachedAfterRequest ?? detected
			if (!cachedAfterRequest) {
				writeCachedProfession(scopeKey, detected)
			}
			setState({
				scopeKey,
				copy: getSessionCopy(resolvedProfession),
				profession: resolvedProfession,
			})
		})
		return () => {
			cancelled = true
		}
	}, [scopeKey])

	return {
		copy: visibleState.copy,
		profession: visibleState.profession,
		setProfession,
	}
}

export function clearPersonalizationCache() {
	try {
		manualSelectionVersions.clear()
		localStorage.removeItem(LEGACY_CACHE_KEY)
		for (let index = localStorage.length - 1; index >= 0; index--) {
			const key = localStorage.key(index)
			if (key?.startsWith(`${CACHE_KEY_PREFIX}:`)) {
				localStorage.removeItem(key)
			}
		}
	} catch {}
}
