"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@lib/auth-context"
import { Logo } from "@ui/assets/Logo"
import { motion, AnimatePresence } from "motion/react"
import { cn } from "@lib/utils"
import { dmSansClassName } from "@/lib/fonts"
import { Check } from "lucide-react"
import { $fetch } from "@lib/api"
import { authClient } from "@lib/auth"
import NovaOrb from "@/components/nova/nova-orb"

type DetectedSource = "x" | "linkedin" | "resume" | null
type Status = "idle" | "processing" | "done" | "error"

function XIcon({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
		</svg>
	)
}

function LinkedInIcon({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
		</svg>
	)
}

function SubmitArrow() {
	return (
		<svg width="12" height="9" viewBox="0 0 12 9" fill="none">
			<title>Submit</title>
			<path d="M8.05099 9.60156L6.93234 8.49987L9.00014 6.44902L9.62726 6.04224L9.54251 5.788L8.79675 5.90665H0.0170898V4.31343H8.79675L9.54251 4.43207L9.62726 4.17783L9.00014 3.77105L6.93234 1.72021L8.05099 0.601562L11.9832 4.53377V5.68631L8.05099 9.60156Z" fill="#FAFAFA" />
		</svg>
	)
}

function detectSource(value: string): DetectedSource {
	const v = value.trim().toLowerCase()
	if (!v) return null
	if (v.includes("linkedin.com/in/") || v.includes("linkedin.com/pub/")) return "linkedin"
	if (v.includes("x.com/") || v.includes("twitter.com/") || v.startsWith("@")) return "x"
	if (/^[a-z0-9_]{1,50}$/i.test(v)) return "x"
	return null
}

function getProcessingSteps(source: "x" | "linkedin" | "resume") {
	if (source === "x") return ["Fetching your X profile", "Reading your posts & interests", "Extracting key insights", "Saving to your memory"]
	if (source === "linkedin") return ["Fetching your LinkedIn profile", "Extracting your background", "Identifying expertise areas", "Saving to your memory"]
	return ["Reading your resume", "Extracting your experience", "Identifying your expertise", "Saving to your memory"]
}

function generateUsername(name: string) {
	const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "") || "user"
	return `${base}${Math.floor(100000 + Math.random() * 900000)}`
}

function generateOrgSlug(name: string) {
	const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "org"
	return `${base}-${Math.floor(100000 + Math.random() * 900000)}`
}

const SOURCE_LABEL: Record<"x" | "linkedin", string> = {
	x: "X profile detected",
	linkedin: "LinkedIn profile detected",
}

const SOURCE_ICON: Record<"x" | "linkedin", React.FC<{ className?: string }>> = {
	x: XIcon,
	linkedin: LinkedInIcon,
}

export default function OnboardingPage() {
	const router = useRouter()
	const { user, organizations, refetchOrganizations, setActiveOrg } = useAuth()

	const [value, setValue] = useState("")
	const [detected, setDetected] = useState<DetectedSource>(null)
	const [resumeFile, setResumeFile] = useState<File | null>(null)
	const [isDragging, setIsDragging] = useState(false)
	const [status, setStatus] = useState<Status>("idle")
	const [processedSource, setProcessedSource] = useState<"x" | "linkedin" | "resume" | null>(null)
	const [completedSteps, setCompletedSteps] = useState<number[]>([])
	const [errorMsg, setErrorMsg] = useState("")
	const inputRef = useRef<HTMLInputElement>(null)
	const fileRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		const t = setTimeout(() => inputRef.current?.focus(), 500)
		return () => clearTimeout(t)
	}, [])

	const handleChange = (v: string) => {
		setValue(v)
		setDetected(detectSource(v))
	}

	const ensureOrg = useCallback(async () => {
		if (organizations && organizations.length > 0) return
		const name = user?.name ?? user?.email ?? "My Workspace"
		const newOrg = await authClient.organization.create({
			name,
			slug: generateOrgSlug(name),
			metadata: { signupSource: "consumer" },
		})
		await setActiveOrg(newOrg.slug)
		if (user?.name) {
			await authClient.updateUser({
				displayUsername: user.name,
				username: generateUsername(user.name),
			})
		}
		await refetchOrganizations()
	}, [user, organizations, refetchOrganizations, setActiveOrg])

	const tick = useCallback((i: number) => setCompletedSteps((p) => [...p, i]), [])

	const handleSubmit = useCallback(async (source: "x" | "linkedin" | "resume") => {
		setStatus("processing")
		setProcessedSource(source)
		setCompletedSteps([])

		try {
			await ensureOrg()

			if (source === "x") {
				tick(0)
				const res = await fetch("/api/onboarding/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ xUrl: value.trim(), name: user?.name, email: user?.email }) })
				const data = await res.json()
				tick(1); tick(2)
				await $fetch("@post/documents", { body: { content: `X/Twitter profile summary for ${value.trim()}:\n\n${data.text}`, containerTags: [], metadata: { sm_source: "onboarding" } } })
				tick(3)
			} else if (source === "linkedin") {
				tick(0)
				const res = await fetch("/api/onboarding/extract-content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ urls: [value.trim()] }) })
				const data = await res.json()
				tick(1); tick(2)
				await $fetch("@post/documents", { body: { content: `LinkedIn profile for ${value.trim()}:\n\n${data.results?.[0]?.text ?? ""}`, containerTags: [], metadata: { sm_source: "onboarding" } } })
				tick(3)
			} else if (source === "resume" && resumeFile) {
				tick(0)
				const formData = new FormData()
				formData.append("file", resumeFile)
				const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/v3/documents/file`, { method: "POST", body: formData, credentials: "include" })
				tick(1); tick(2)
				if (!uploadRes.ok) throw new Error("Resume upload failed")
				tick(3)
			}

			await new Promise((r) => setTimeout(r, 400))
			setStatus("done")
		} catch (err) {
			console.error(err)
			setErrorMsg("Something went wrong. You can skip and try later.")
			setStatus("error")
		}
	}, [value, resumeFile, user, ensureOrg, tick])

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(false)
		const f = e.dataTransfer.files[0]
		if (f?.type === "application/pdf") {
			setResumeFile(f)
			handleSubmit("resume")
		}
	}

	const canSubmit = detected && detected !== "resume"

	return (
		<div
			className={cn("relative h-screen overflow-hidden bg-black flex flex-col", dmSansClassName())}
			onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
			onDragLeave={() => setIsDragging(false)}
			onDrop={handleDrop}
		>
			{/* Drag overlay */}
			<AnimatePresence>
				{isDragging && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-50 flex items-center justify-center border-2 border-dashed border-white/20 bg-black/80 backdrop-blur-sm"
					>
						<p className="text-white text-lg font-medium">Drop your PDF resume</p>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Header */}
			<div className="flex items-center justify-between px-6 py-5 shrink-0 z-10">
				<Logo className="h-7" />
				<button type="button" onClick={() => router.push("/")} className="text-[#525966] text-sm hover:text-white transition-colors cursor-pointer">
					Skip for now →
				</button>
			</div>

			{/* Center content */}
			<div className="flex flex-1 flex-col items-center justify-center pb-20">
				<AnimatePresence mode="wait">
					{status === "idle" && (
						<motion.div
							key="idle"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0, transition: { duration: 0.2 } }}
							transition={{ duration: 0.5 }}
							className="flex flex-col items-center gap-8 w-full max-w-[480px] px-6"
						>
							<NovaOrb size={180} />

							<div className="text-center">
								<h1 className="text-white text-[32px] font-medium leading-[110%]">
									Tell Nova where to find you
								</h1>
							</div>

							{/* Smart input */}
							<div className="w-full space-y-3">
								<div className="relative flex items-center">
									{/* Detected source icon */}
									<AnimatePresence>
										{detected && detected !== "resume" && (
											<motion.span
												initial={{ opacity: 0, scale: 0.8 }}
												animate={{ opacity: 1, scale: 1 }}
												exit={{ opacity: 0, scale: 0.8 }}
												transition={{ duration: 0.15 }}
												className="absolute left-3 flex items-center pointer-events-none"
											>
												{(() => {
													const Icon = SOURCE_ICON[detected as "x" | "linkedin"]
													return <Icon className="size-3.5 text-[#6BB0FF]" />
												})()}
											</motion.span>
										)}
									</AnimatePresence>

									<input
										ref={inputRef}
										type="text"
										value={value}
										onChange={(e) => handleChange(e.target.value)}
										onKeyDown={(e) => { if (e.key === "Enter" && canSubmit) handleSubmit(detected as "x" | "linkedin") }}
										placeholder="Paste an X handle, LinkedIn URL, or drop a PDF"
										className={cn(
											"w-full py-3 bg-[#070E1B] border rounded-xl text-white text-sm placeholder:text-[#525966] focus:outline-none transition-all",
											detected && detected !== "resume" ? "pl-8 pr-11" : "px-4 pr-11",
											detected ? "border-[#2261CA]/50 focus:border-[#2261CA]" : "border-[#52596633] focus:border-white/20",
										)}
									/>

									{canSubmit && (
										<motion.button
											type="button"
											initial={{ opacity: 0, scale: 0.8 }}
											animate={{ opacity: 1, scale: 1 }}
											onClick={() => handleSubmit(detected as "x" | "linkedin")}
											className="absolute right-1 rounded-xl size-8 flex items-center justify-center border-[0.5px] border-[#161F2C] hover:scale-[0.95] active:scale-[0.95] transition-transform cursor-pointer"
											style={{ background: "linear-gradient(180deg, #0D121A -26.14%, #000 100%)" }}
										>
											<SubmitArrow />
										</motion.button>
									)}
								</div>

								{/* Detected label */}
								<AnimatePresence>
									{detected && detected !== "resume" && (
										<motion.p
											initial={{ opacity: 0, y: -4 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -4 }}
											transition={{ duration: 0.2 }}
											className="text-xs text-[#6BB0FF] pl-1"
										>
											{SOURCE_LABEL[detected as "x" | "linkedin"]} — press Enter to continue
										</motion.p>
									)}
								</AnimatePresence>

								{/* Hint chips */}
								{!detected && (
									<motion.div
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{ delay: 0.6 }}
										className="flex items-center justify-center gap-2 flex-wrap"
									>
										{[
											{ label: "@yourhandle", action: () => { setValue("@"); setDetected("x"); inputRef.current?.focus() } },
											{ label: "linkedin.com/in/you", action: () => { setValue("linkedin.com/in/"); setDetected("linkedin"); inputRef.current?.focus() } },
											{
												label: "Drop a PDF resume",
												action: () => fileRef.current?.click(),
											},
										].map((chip) => (
											<button
												key={chip.label}
												type="button"
												onClick={chip.action}
												className="text-xs text-[#525966] hover:text-[#8B9DB5] transition-colors cursor-pointer"
											>
												{chip.label}
											</button>
										))}
									</motion.div>
								)}
							</div>

							<input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setResumeFile(f); handleSubmit("resume") } }} />
						</motion.div>
					)}

					{status === "processing" && processedSource && (
						<motion.div
							key="processing"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.4 }}
							className="flex flex-col items-center gap-8 w-full max-w-[320px] px-6"
						>
							<NovaOrb size={120} />
							<div className="text-center space-y-1.5">
								<h2 className="text-white text-2xl font-medium">Building your memory</h2>
								<p className="text-[#525966] text-sm">This will only take a moment.</p>
							</div>
							<div className="flex flex-col gap-3.5 w-full">
								{getProcessingSteps(processedSource).map((step, i) => {
									const done = completedSteps.includes(i)
									const active = !done && (i === 0 || completedSteps.includes(i - 1))
									return (
										<motion.div key={step} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08, duration: 0.3 }} className="flex items-center gap-3">
											<div className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border transition-all duration-500", done ? "border-[#2261CA] bg-[#2261CA]" : active ? "border-[#2261CA]/40" : "border-[#1E2530]")}>
												{done ? (
													<Check className="size-3 text-white" />
												) : active ? (
													<motion.div className="size-1.5 rounded-full bg-[#2261CA]/70" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }} />
												) : null}
											</div>
											<span className={cn("text-sm transition-colors duration-300", done ? "text-white" : active ? "text-[#8B9DB5]" : "text-[#353D4A]")}>{step}</span>
										</motion.div>
									)
								})}
							</div>
						</motion.div>
					)}

					{status === "done" && (
						<motion.div key="done" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="flex flex-col items-center gap-8 text-center max-w-[320px] px-6">
							<NovaOrb size={120} />
							<div className="space-y-2">
								<h2 className="text-white text-2xl font-medium">Your memory is ready</h2>
								<p className="text-[#525966] text-sm">Nova already knows who you are.</p>
							</div>
							<button
								type="button"
								onClick={() => router.push("/")}
								className="rounded-[8px] px-5 py-2.5 text-sm font-medium text-white cursor-pointer hover:scale-[0.97] active:scale-[0.95] transition-transform border-[0.5px] border-[#161F2C]"
								style={{ background: "linear-gradient(180deg, #0D121A -26.14%, #000 100%)" }}
							>
								Enter supermemory →
							</button>
						</motion.div>
					)}

					{status === "error" && (
						<motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-6 text-center max-w-sm px-6">
							<p className="text-[#8B9DB5] text-sm">{errorMsg}</p>
							<div className="flex gap-3">
								<button type="button" onClick={() => { setStatus("idle"); setCompletedSteps([]); setErrorMsg("") }} className="rounded-xl border border-[#1E2530] px-4 py-2.5 text-sm text-white hover:border-[#4A4A4A] transition-colors cursor-pointer">
									Try again
								</button>
								<button type="button" onClick={() => router.push("/")} className="rounded-xl px-4 py-2.5 text-sm font-medium text-white cursor-pointer border-[0.5px] border-[#161F2C]" style={{ background: "linear-gradient(180deg, #0D121A -26.14%, #000 100%)" }}>
									Skip for now
								</button>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	)
}
