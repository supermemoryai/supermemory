export type Stat = {
	label: string
	value: string
	delta?: string
	deltaTint?: "up" | "down" | "neutral"
}

export const STATS: Stat[] = [
	{
		label: "Items ingested",
		value: "2,272",
		delta: "+148 this week",
		deltaTint: "up",
	},
	{
		label: "Agent sessions",
		value: "184",
		delta: "+42 vs last wk",
		deltaTint: "up",
	},
	{
		label: "Active contributors",
		value: "4",
		delta: "of 6 invited",
		deltaTint: "neutral",
	},
	{
		label: "Top space",
		value: "Gmail",
		delta: "1,843 items",
		deltaTint: "neutral",
	},
]

export type AgentSeries = { key: string; label: string; color: string }

export const AGENT_SERIES: AgentSeries[] = [
	{ key: "cursor", label: "Cursor", color: "#4BA0FA" },
	{ key: "claudeCode", label: "Claude Code", color: "#FF8A47" },
	{ key: "claudeDesktop", label: "Claude Desktop", color: "#B19CFF" },
	{ key: "chatgpt", label: "ChatGPT", color: "#10A37F" },
	{ key: "other", label: "Other", color: "#525D6E" },
]

export const SESSIONS_BY_DAY: {
	label: string
	values: Record<string, number>
}[] = [
	{
		label: "Mon",
		values: {
			cursor: 8,
			claudeCode: 4,
			claudeDesktop: 3,
			chatgpt: 2,
			other: 1,
		},
	},
	{
		label: "Tue",
		values: {
			cursor: 10,
			claudeCode: 6,
			claudeDesktop: 4,
			chatgpt: 3,
			other: 1,
		},
	},
	{
		label: "Wed",
		values: {
			cursor: 12,
			claudeCode: 9,
			claudeDesktop: 5,
			chatgpt: 4,
			other: 1,
		},
	},
	{
		label: "Thu",
		values: {
			cursor: 9,
			claudeCode: 5,
			claudeDesktop: 4,
			chatgpt: 3,
			other: 1,
		},
	},
	{
		label: "Fri",
		values: {
			cursor: 14,
			claudeCode: 10,
			claudeDesktop: 6,
			chatgpt: 4,
			other: 2,
		},
	},
	{
		label: "Sat",
		values: {
			cursor: 5,
			claudeCode: 3,
			claudeDesktop: 2,
			chatgpt: 1,
			other: 1,
		},
	},
	{
		label: "Sun",
		values: {
			cursor: 17,
			claudeCode: 12,
			claudeDesktop: 7,
			chatgpt: 4,
			other: 1,
		},
	},
]

export const RECENT_ANSWERS = [
	{
		question: "What did we decide about pricing?",
		answer: "Pro stays at $20/mo. No overages, top-up only.",
		who: "You",
		when: "2h ago",
	},
	{
		question: "What's blocking the Acme deal?",
		answer: "MSA review — Jane drafting a net-30 counter.",
		who: "You",
		when: "4h ago",
	},
	{
		question: "Who owns the onboarding rewrite?",
		answer: "Design team. Ship target Friday.",
		who: "Sarah Kim",
		when: "Yesterday",
	},
]

export const WEEKLY_DIGEST = {
	range: "Mon – Fri",
	headline:
		"Your brain captured 642 items, surfaced 12 decisions, and answered 184 questions across the team.",
	bullets: [
		{ label: "5 deadlines coming up next week", tint: "text-[#4BA0FA]" },
		{
			label: "2 conflicts surfaced between Notion and Slack",
			tint: "text-[#FF8A47]",
		},
		{
			label: "Sarah Kim led contributions with 14 docs",
			tint: "text-[#A1A1AA]",
		},
	],
}

export const TEAM_THIS_WEEK = [
	{
		name: "Sarah Kim",
		email: "sarah@acme.com",
		contributions: 14,
		summary: "14 docs · 3 spaces",
		color: "#FF8A47",
	},
	{
		name: "Jane Doe",
		email: "jane@acme.com",
		contributions: 11,
		summary: "11 docs · 2 spaces",
		color: "#4BA0FA",
	},
	{
		name: "Mahesh S.",
		email: "mahesh@acme.com",
		contributions: 9,
		summary: "9 docs · 1 space",
		color: "#A1A1AA",
	},
	{
		name: "Alex Chen",
		email: "alex@acme.com",
		contributions: 7,
		summary: "7 docs · 2 spaces",
		color: "#10A37F",
	},
]

export const TEAM_RECENT = [
	{ who: "Sarah Kim", what: "added a memo to acme-deal-q2", when: "14m" },
	{ who: "Jane Doe", what: "updated the Acme MSA draft", when: "1h" },
	{ who: "You", what: 'asked "What did we decide about pricing?"', when: "2h" },
	{
		who: "Sarah Kim",
		what: "connected Notion to Sales space",
		when: "Yesterday",
	},
]

export type ActivityEvent = {
	when: string
	text: string
	source: "drive" | "notion" | "slack" | "system" | "answer" | "decision"
}

export const ACTIVITY: ActivityEvent[] = [
	{ when: "2m", text: "23 new docs ingested from Drive", source: "drive" },
	{ when: "14m", text: "Jane added a memo to acme-deal-q2", source: "notion" },
	{
		when: "1h",
		text: "Decision surfaced: pricing locked at $20 Pro",
		source: "slack",
	},
	{
		when: "3h",
		text: "14 Notion pages updated by Sarah Kim",
		source: "notion",
	},
	{ when: "5h", text: "New entity formed: pricing-v3", source: "system" },
	{
		when: "Yesterday",
		text: "MSA contract uploaded · auto-tagged contracts/MSA",
		source: "drive",
	},
]

export type TimelineKind =
	| "answer"
	| "decision"
	| "ingest"
	| "mention"
	| "system"

export type TimelineEvent = {
	kind: TimelineKind
	when: string
	title: string
	detail?: string
	source?: string
	who?: string
}

export const TIMELINE_EVENTS: TimelineEvent[] = [
	{
		kind: "answer",
		when: "2m ago",
		title: "What did we decide about pricing?",
		detail: "Pro stays at $20/mo. No overages, top-up only.",
		source: "You asked",
	},
	{
		kind: "ingest",
		when: "14m ago",
		title: "23 new docs ingested from Drive",
		detail: "Q2 roadmap, Acme MSA draft v3, customer feedback Q1, +20 more.",
		source: "Drive",
	},
	{
		kind: "decision",
		when: "1h ago",
		title: "Decision: pricing locked at $20 Pro",
		detail:
			"Decided in #leadership thread to keep Pro at $20/mo. No overages — top-up only.",
		source: "Slack · #leadership",
	},
	{
		kind: "answer",
		when: "4h ago",
		title: "What's blocking the Acme deal?",
		detail: "MSA review — Jane drafting a net-30 counter.",
		source: "You asked",
	},
	{
		kind: "mention",
		when: "Today",
		title: "onboarding-rewrite mentioned in 3 docs",
		detail: "Owner: design team · Ship target: Friday.",
		source: "Drive",
		who: "Mahesh",
	},
	{
		kind: "system",
		when: "5h ago",
		title: "New entity formed: pricing-v3",
		detail: "Linked across 4 sources · auto-tagged by the brain.",
	},
	{
		kind: "ingest",
		when: "Yesterday",
		title: "MSA contract uploaded · auto-tagged contracts/MSA",
		source: "Drive",
	},
	{
		kind: "answer",
		when: "Yesterday",
		title: "Who owns the onboarding rewrite?",
		detail: "Design team. Ship target Friday.",
		source: "Sarah Kim asked",
	},
	{
		kind: "ingest",
		when: "Yesterday",
		title: "14 Notion pages updated by Sarah Kim",
		source: "Notion",
		who: "Sarah Kim",
	},
]

export type SourceStatus = "healthy" | "syncing" | "warning" | "error"

export type ConnectedSource = {
	id: string
	name: string
	iconKey: "drive" | "notion" | "gmail" | "onedrive" | "github"
	status: SourceStatus
	delta: string
	when: string
	statusMessage?: string
}

export const CONNECTED_SOURCES: ConnectedSource[] = [
	{
		id: "drive",
		name: "Google Drive",
		iconKey: "drive",
		status: "healthy",
		delta: "+24 items",
		when: "12m ago",
	},
	{
		id: "notion",
		name: "Company Notion",
		iconKey: "notion",
		status: "warning",
		delta: "Sync stalled",
		when: "4h ago",
		statusMessage: "Re-auth · token expired",
	},
	{
		id: "gmail",
		name: "Gmail",
		iconKey: "gmail",
		status: "syncing",
		delta: "Ingesting…",
		when: "Just now",
	},
]

export type RecommendedSource = {
	id: string
	name: string
	iconKey: "slack" | "linear" | "granola" | "github" | "calendar"
	reason: string
}

export const RECOMMENDED_SOURCES: RecommendedSource[] = [
	{
		id: "slack",
		name: "Slack",
		iconKey: "slack",
		reason: "Decisions and threads — most teams connect this.",
	},
	{
		id: "github",
		name: "GitHub",
		iconKey: "github",
		reason: "PRs, issues, READMEs from your repos.",
	},
	{
		id: "linear",
		name: "Linear",
		iconKey: "linear",
		reason: "Track project decisions and blockers.",
	},
]

export type LiveSession = {
	name: string
	avatarColor: string
	status: "live" | "idle" | "away"
	tool: string
	toolColor: string
	doing?: string
	elapsed?: string
}

export const LIVE_SESSIONS: LiveSession[] = [
	{
		name: "Sarah Kim",
		avatarColor: "#FF8A47",
		status: "live",
		tool: "Cursor",
		toolColor: "#4BA0FA",
		doing: "Refactoring auth flow with brain context",
		elapsed: "3m elapsed",
	},
	{
		name: "Jane Doe",
		avatarColor: "#4BA0FA",
		status: "live",
		tool: "Claude Code",
		toolColor: "#FF8A47",
		doing: "MSA review · pulling Acme history",
		elapsed: "18m elapsed",
	},
	{
		name: "You",
		avatarColor: "#A1A1AA",
		status: "idle",
		tool: "Cursor",
		toolColor: "#4BA0FA",
		elapsed: "Idle · 12m",
	},
]

export const TODAY_SESSIONS_SUMMARY: {
	name: string
	avatarColor: string
	tool: string
	count: number
	lastAt: string
}[] = [
	{
		name: "Alex Chen",
		avatarColor: "#10A37F",
		tool: "ChatGPT",
		count: 4,
		lastAt: "2h ago",
	},
	{
		name: "Mahesh S.",
		avatarColor: "#A1A1AA",
		tool: "Claude Desktop",
		count: 7,
		lastAt: "3h ago",
	},
	{
		name: "Sarah Kim",
		avatarColor: "#FF8A47",
		tool: "Cursor",
		count: 11,
		lastAt: "Now",
	},
]

export type ChatMessage = { role: "user" | "brain"; text: string }

export const SAMPLE_CHAT: ChatMessage[] = [
	{
		role: "user",
		text: "What did we decide about pricing this quarter?",
	},
	{
		role: "brain",
		text: "Pro is locked at $20/mo. No overages — top-up only. Decided in the #leadership Slack thread on May 28.",
	},
	{
		role: "user",
		text: "Who's working on the Acme MSA?",
	},
	{
		role: "brain",
		text: "Jane Doe is drafting a net-30 counter to Acme's net-60 ask. Latest draft is in Drive (Acme · MSA draft v3.pdf).",
	},
]
