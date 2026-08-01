"use client"

import { useState } from "react"
import {
	ArrowLeftIcon,
	ArrowRightIcon,
	CheckIcon,
	Loader2Icon,
} from "lucide-react"
import { cn } from "@lib/utils"
import type {
	NovaResearchClarificationAnswer,
	NovaResearchClarificationRequest,
} from "@/lib/nova-research"

export function ResearchClarification({
	request,
	onSubmit,
}: {
	request: NovaResearchClarificationRequest
	onSubmit: (answers: NovaResearchClarificationAnswer[]) => Promise<void>
}) {
	const [questionIndex, setQuestionIndex] = useState(0)
	const [answers, setAnswers] = useState<Record<string, string>>({})
	const [otherByQuestion, setOtherByQuestion] = useState<
		Record<string, boolean>
	>({})
	const [submitting, setSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const question = request.questions[questionIndex]
	if (!question) return null

	const answer = answers[question.id] ?? ""
	const usingOther = otherByQuestion[question.id] === true
	const isLast = questionIndex === request.questions.length - 1
	const canContinue = answer.trim().length > 0

	const submit = async () => {
		if (!canContinue || submitting) return
		setSubmitting(true)
		setError(null)
		try {
			await onSubmit(
				request.questions.map((item) => ({
					questionId: item.id,
					value: answers[item.id]?.trim() ?? "",
				})),
			)
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: "Could not submit your answers.",
			)
			setSubmitting(false)
		}
	}

	return (
		<div className="mt-3 overflow-hidden rounded-2xl border border-blue-400/15 bg-blue-400/[0.035]">
			<div className="border-white/[0.07] border-b px-4 py-3">
				<div className="flex items-center justify-between gap-3">
					<div>
						<p className="text-sm font-medium text-white/85">
							A few details first
						</p>
						{request.intro ? (
							<p className="mt-0.5 text-xs text-white/45">{request.intro}</p>
						) : null}
					</div>
					<span className="shrink-0 text-xs tabular-nums text-white/35">
						{questionIndex + 1} / {request.questions.length}
					</span>
				</div>
				<div className="mt-3 flex gap-1">
					{request.questions.map((item, index) => (
						<span
							key={item.id}
							className={cn(
								"h-1 flex-1 rounded-full transition-colors",
								index <= questionIndex ? "bg-blue-400/75" : "bg-white/10",
							)}
						/>
					))}
				</div>
			</div>

			<div className="px-4 py-4">
				<h3 className="text-sm leading-relaxed text-white/85">
					{question.question}
				</h3>
				<div className="mt-3 grid gap-2 sm:grid-cols-2">
					{question.options.map((option) => {
						const selected = !usingOther && answer === option.label
						return (
							<button
								type="button"
								key={option.label}
								onClick={() => {
									setAnswers((current) => ({
										...current,
										[question.id]: option.label,
									}))
									setOtherByQuestion((current) => ({
										...current,
										[question.id]: false,
									}))
								}}
								className={cn(
									"flex min-h-12 items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors",
									selected
										? "border-blue-400/45 bg-blue-400/10"
										: "border-white/[0.08] bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.045]",
								)}
							>
								<span
									className={cn(
										"mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
										selected
											? "border-blue-400 bg-blue-400 text-[#07111F]"
											: "border-white/20",
									)}
								>
									{selected ? <CheckIcon className="size-2.5" /> : null}
								</span>
								<span>
									<span className="block text-xs font-medium text-white/78">
										{option.label}
									</span>
									{option.description ? (
										<span className="mt-0.5 block text-[11px] leading-snug text-white/38">
											{option.description}
										</span>
									) : null}
								</span>
							</button>
						)
					})}
					{question.allowOther !== false ? (
						<button
							type="button"
							onClick={() => {
								setOtherByQuestion((current) => ({
									...current,
									[question.id]: true,
								}))
								setAnswers((current) => ({ ...current, [question.id]: "" }))
							}}
							className={cn(
								"min-h-12 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors",
								usingOther
									? "border-blue-400/45 bg-blue-400/10 text-white/80"
									: "border-white/[0.08] bg-white/[0.025] text-white/55 hover:border-white/15 hover:bg-white/[0.045]",
							)}
						>
							Something else
						</button>
					) : null}
				</div>
				{usingOther ? (
					<textarea
						value={answer}
						onChange={(event) =>
							setAnswers((current) => ({
								...current,
								[question.id]: event.target.value,
							}))
						}
						placeholder="Write your answer…"
						maxLength={500}
						className="mt-3 min-h-20 w-full resize-none rounded-xl border border-white/10 bg-black/15 px-3 py-2.5 text-xs text-white/80 outline-none placeholder:text-white/25 focus:border-blue-400/40"
					/>
				) : null}

				{error ? <p className="mt-3 text-xs text-red-300">{error}</p> : null}
				<div className="mt-4 flex items-center justify-between gap-3">
					<button
						type="button"
						onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))}
						disabled={questionIndex === 0 || submitting}
						className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-white/45 transition-colors hover:bg-white/5 hover:text-white/70 disabled:pointer-events-none disabled:opacity-25"
					>
						<ArrowLeftIcon className="size-3.5" /> Back
					</button>
					<button
						type="button"
						onClick={() => {
							if (isLast) void submit()
							else setQuestionIndex((index) => index + 1)
						}}
						disabled={!canContinue || submitting}
						className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/90 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-400 disabled:pointer-events-none disabled:opacity-35"
					>
						{submitting ? (
							<Loader2Icon className="size-3.5 animate-spin" />
						) : isLast ? (
							<CheckIcon className="size-3.5" />
						) : (
							<ArrowRightIcon className="size-3.5" />
						)}
						{isLast ? "Start research" : "Next"}
					</button>
				</div>
			</div>
		</div>
	)
}
