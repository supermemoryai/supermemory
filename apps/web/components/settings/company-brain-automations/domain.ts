export type AutomationOrigin = "web" | "slack"

export type Automation = {
	id: string
	enabled: boolean
	title: string
	channelId: string
	deliverTo: "channel" | "dm"
	prompt: string
	cron: string
	timezone: string | null
	createdBy: string | null
	origin: AutomationOrigin
	sourceThreadUrl: string | null
	catalogId: string | null
}

export type AutomationChannel = {
	id: string
	name: string
	isPrivate: boolean
}

export type AutomationCatalogTemplate = {
	id: string
	label: string
	description: string
	category: "team" | "engineering" | "support" | "product"
	requiresApps: string[]
	prompt: string
	cadence: {
		frequency: "daily" | "weekly"
		weekday?: number
		time: string
	}
}

export type AutomationSettings = {
	defaultAutomationChannel: string | null
	canEdit: boolean
}

export type Frequency = "advanced" | "daily" | "weekdays" | "weekly"

export type AutomationDraft = {
	title: string
	channelId: string
	deliverTo: "channel" | "dm"
	prompt: string
	frequency: Frequency
	weekday: number
	time: string
	timezone: string
	enabled: boolean
	catalogId: string | null
	/** Preserved when a Slack-created cron is outside the simple web editor. */
	rawCron: string | null
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export const DEFAULT_AUTOMATION_PROMPT =
	"Summarize what's happened recently across the connected tools and channels: open items, unanswered questions, decisions, and anything the team should know. Keep it a short, scannable recap."

export type TimezoneOption = {
	value: string
	label: string
	offsetLabel: string
	offsetMinutes: number
}

const FALLBACK_TIMEZONES = [
	"UTC",
	"America/Los_Angeles",
	"America/Denver",
	"America/Chicago",
	"America/New_York",
	"Europe/London",
	"Europe/Paris",
	"Asia/Kolkata",
	"Asia/Singapore",
	"Asia/Tokyo",
	"Australia/Sydney",
]

function supportedTimezones(): string[] {
	const intl = Intl as typeof Intl & {
		supportedValuesOf?: (key: "timeZone") => string[]
	}
	return intl.supportedValuesOf?.("timeZone") ?? FALLBACK_TIMEZONES
}

function offsetParts(
	timezone: string,
	at: Date,
): { label: string; minutes: number } | null {
	try {
		const raw = new Intl.DateTimeFormat("en-US", {
			timeZone: timezone,
			timeZoneName: "longOffset",
		}).formatToParts(at)
		const name = raw.find((part) => part.type === "timeZoneName")?.value
		if (!name || name === "GMT" || name === "UTC") {
			return { label: "GMT+00:00", minutes: 0 }
		}
		const match = name.match(/(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?/i)
		if (!match) return null
		const sign = match[1] === "-" ? -1 : 1
		const hours = Number(match[2])
		const minutes = Number(match[3] ?? "0")
		return {
			label: `GMT${sign < 0 ? "-" : "+"}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
			minutes: sign * (hours * 60 + minutes),
		}
	} catch {
		return null
	}
}

function friendlyTimezone(timezone: string): string {
	return timezone
		.split("/")
		.map((part) => part.replaceAll("_", " "))
		.join(" / ")
}

/** GMT-labelled IANA zones. Persisting `value` keeps local schedules DST-aware. */
export function timezoneOptions(
	at = new Date(),
	timezones: readonly string[] = supportedTimezones(),
): TimezoneOption[] {
	const values = [...new Set(["UTC", ...timezones])]
	return values
		.map((value): TimezoneOption | null => {
			const offset = offsetParts(value, at)
			if (!offset) return null
			return {
				value,
				label: `${offset.label} · ${friendlyTimezone(value)}`,
				offsetLabel: offset.label,
				offsetMinutes: offset.minutes,
			}
		})
		.filter((option): option is TimezoneOption => option !== null)
		.sort(
			(a, b) =>
				a.offsetMinutes - b.offsetMinutes || a.value.localeCompare(b.value),
		)
}

export function timezoneDisplayLabel(
	timezone: string,
	at = new Date(),
): string {
	const offset = offsetParts(timezone, at)
	return offset
		? `${offset.label} · ${friendlyTimezone(timezone)}`
		: friendlyTimezone(timezone)
}

export function browserTimezone(): string {
	return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
}

/** Local wall-clock fields are stored directly; the backend evaluates them in `timezone`. */
export function toLocalCron(
	time: string,
	frequency: Frequency,
	weekday: number,
): string | null {
	const [hourRaw, minuteRaw] = time.split(":")
	const hour = Number(hourRaw)
	const minute = Number(minuteRaw)
	if (
		!Number.isInteger(hour) ||
		!Number.isInteger(minute) ||
		hour < 0 ||
		hour > 23 ||
		minute < 0 ||
		minute > 59
	) {
		return null
	}
	if (frequency === "advanced") return null
	if (frequency === "weekdays") return `${minute} ${hour} * * 1-5`
	if (frequency === "weekly") {
		if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return null
		return `${minute} ${hour} * * ${weekday}`
	}
	return `${minute} ${hour} * * *`
}

/** Parse the server's local-time cron without applying the browser's UTC offset. */
export function fromLocalCron(
	cron: string,
): { frequency: Frequency; weekday: number; time: string } | null {
	const parts = cron.trim().split(/\s+/)
	if (parts.length !== 5) return null
	const [minuteRaw, hourRaw, dayOfMonth, month, dayOfWeek] = parts
	const minute = Number(minuteRaw)
	const hour = Number(hourRaw)
	if (
		!Number.isInteger(minute) ||
		!Number.isInteger(hour) ||
		minute < 0 ||
		minute > 59 ||
		hour < 0 ||
		hour > 23 ||
		dayOfMonth !== "*" ||
		month !== "*"
	) {
		return null
	}
	const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
	if (dayOfWeek === "*") return { frequency: "daily", weekday: 1, time }
	if (dayOfWeek === "1-5" || dayOfWeek === "1,2,3,4,5") {
		return { frequency: "weekdays", weekday: 1, time }
	}
	const weekday = Number(dayOfWeek === "7" ? "0" : dayOfWeek)
	if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return null
	return { frequency: "weekly", weekday, time }
}

export function automationToDraft(automation: Automation): AutomationDraft {
	const parsed = fromLocalCron(automation.cron)
	return {
		title: automation.title,
		channelId: automation.channelId,
		deliverTo: automation.deliverTo === "dm" ? "dm" : "channel",
		prompt: automation.prompt,
		frequency: parsed?.frequency ?? "advanced",
		weekday: parsed?.weekday ?? 1,
		time: parsed?.time ?? "09:00",
		timezone: automation.timezone || browserTimezone(),
		enabled: automation.enabled,
		catalogId: automation.catalogId,
		rawCron: parsed ? null : automation.cron,
	}
}

export function emptyAutomationDraft(defaultChannelId = ""): AutomationDraft {
	return {
		title: "",
		channelId: defaultChannelId,
		deliverTo: "channel",
		prompt: DEFAULT_AUTOMATION_PROMPT,
		frequency: "daily",
		weekday: 1,
		time: "09:00",
		timezone: browserTimezone(),
		enabled: true,
		catalogId: null,
		rawCron: null,
	}
}

export function catalogTemplateToDraft(
	template: AutomationCatalogTemplate,
	defaultChannelId = "",
): AutomationDraft {
	return {
		...emptyAutomationDraft(defaultChannelId),
		title: template.label,
		prompt: template.prompt,
		frequency: template.cadence.frequency,
		weekday: template.cadence.weekday ?? 1,
		time: template.cadence.time,
		catalogId: template.id,
	}
}

/** Connected-app templates first, universal templates next, unavailable-app templates last. */
export function sortCatalogTemplates(
	templates: readonly AutomationCatalogTemplate[],
	connected: ReadonlySet<string>,
): AutomationCatalogTemplate[] {
	const rank = (template: AutomationCatalogTemplate) => {
		if (!template.requiresApps.length) return 1
		return template.requiresApps.some((app) => connected.has(app)) ? 0 : 2
	}
	return [...templates].sort((a, b) => rank(a) - rank(b))
}
