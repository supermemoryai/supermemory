export type CompanyBrainConfirmResult =
	| { ok: true; serverSchedulesResearch: boolean }
	| { ok: false }

export type BrainMode = "personal" | "team"

export type BrainStep = "about" | "sources" | "ingest" | "team"

export const BRAIN_STEPS: BrainStep[] = ["about", "sources", "ingest", "team"]

export const BRAIN_STEP_LABELS: Record<BrainStep, string> = {
	about: "About",
	sources: "Tools",
	ingest: "Flows",
	team: "Team",
}

const FREE_EMAIL_DOMAINS = new Set([
	"gmail.com",
	"googlemail.com",
	"yahoo.com",
	"yahoo.co.uk",
	"yahoo.co.in",
	"outlook.com",
	"hotmail.com",
	"live.com",
	"icloud.com",
	"me.com",
	"mac.com",
	"aol.com",
	"protonmail.com",
	"proton.me",
	"pm.me",
	"fastmail.com",
	"zoho.com",
	"yandex.com",
	"yandex.ru",
	"mail.com",
	"qq.com",
	"163.com",
	"126.com",
	"naver.com",
	"duck.com",
])

export function detectModeFromEmail(
	email: string | undefined | null,
): BrainMode {
	if (!email) return "personal"
	const at = email.lastIndexOf("@")
	if (at < 0) return "personal"
	const domain = email
		.slice(at + 1)
		.toLowerCase()
		.trim()
	if (!domain) return "personal"
	if (FREE_EMAIL_DOMAINS.has(domain)) return "personal"
	return "team"
}

export function workspaceNameFromEmail(
	email: string | undefined | null,
): string {
	if (!email) return ""
	const at = email.lastIndexOf("@")
	if (at < 0) return ""
	const domain = email.slice(at + 1).toLowerCase()
	const root = domain.split(".")[0] ?? ""
	if (!root) return ""
	return root.charAt(0).toUpperCase() + root.slice(1)
}

/** e.g. duolingo.com → Duolingo (first hostname label, title-cased). */
export function workspaceNameFromDomain(
	domain: string | undefined | null,
): string {
	if (!domain) return ""
	const clean = domain
		.trim()
		.toLowerCase()
		.replace(/^https?:\/\//, "")
		.replace(/^www\./, "")
		.replace(/\/.*$/, "")
	const host = clean.split(".")[0] ?? ""
	if (!host) return ""
	return host.charAt(0).toUpperCase() + host.slice(1)
}

export function workspaceDomainFromEmail(
	email: string | undefined | null,
): string | null {
	if (!email) return null
	const at = email.lastIndexOf("@")
	if (at < 0) return null
	const domain = email
		.slice(at + 1)
		.toLowerCase()
		.trim()
	return domain || null
}

export type BrainMetadata = {
	brainOnboardingVersion?: "v1"
	brainOnboardingComplete?: boolean
	brainMode?: BrainMode
	brainWorkspaceName?: string
	brainWorkspaceDomain?: string | null
	brainAbout?: string
	brainContainerTag?: string
	brainSources?: {
		drive?: { status: "connected" | "pending" | "skipped" }
		gmail?: { status: "requested" | "connected" | "skipped"; range?: string }
		notion?: { status: "connected" | "pending" | "skipped" }
		granola?: { status: "waitlist" | "skipped" }
	}
	brainInvites?: { email: string; role: "admin" | "member" }[]
	brainPermissions?: {
		visibility: "team-private" | "org-shared"
		suggestChanges: boolean
	}
}

export function generateOrgSlug(name: string): string {
	const base =
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/(^-|-$)/g, "") || "org"
	return `${base}-${Math.floor(100000 + Math.random() * 900000)}`
}

export function generateUsername(name: string): string {
	const base =
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "_")
			.replace(/(^_|_$)/g, "") || "user"
	return `${base}${Math.floor(100000 + Math.random() * 900000)}`
}

export function containerTagFromWorkspace(
	name: string,
	mode: BrainMode,
): string {
	const slug = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "")
	if (!slug) return mode === "team" ? "team-brain" : "personal-brain"
	return mode === "team" ? `${slug}-brain` : `${slug}-personal`
}
