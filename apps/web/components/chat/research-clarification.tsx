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
		<div className="mt-3 overflow-hidden rounded-[14px] bg-[#191D24] shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)]">
			<div className="border-white/[0.06] border-b px-4 py-4 sm:px-5">
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
				<div className="mt-3 flex gap-1.5">
					{request.questions.map((item, index) => (
						<span
							key={item.id}
							className={cn(
								"h-1 flex-1 rounded-full transition-colors",
								index === questionIndex
									? "bg-[#A1A1AA]"
									: index < questionIndex
										? "bg-[#525D6E]"
										: "bg-[#0D121A]",
							)}
						/>
					))}
				</div>
			</div>

			<div className="px-4 py-4 sm:px-5 sm:py-5">
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
								aria-pressed={selected}
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
									"flex min-h-[72px] items-start gap-3 rounded-[12px] bg-[#14161A] px-4 py-3 text-left shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/25",
									selected
										? "bg-[#1B1F24] ring-1 ring-inset ring-white/15"
										: "hover:bg-[#16181D]",
								)}
							>
								<span
									className={cn(
										"mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
										selected
											? "border-[#FAFAFA] bg-[#FAFAFA] text-[#0D121A]"
											: "border-[#525D6E] bg-[#0D121A]",
									)}
								>
									{selected ? <CheckIcon className="size-2.5" /> : null}
								</span>
								<span>
									<span className="block text-xs font-medium text-[#FAFAFA]">
										{option.label}
									</span>
									{option.description ? (
										<span className="mt-0.5 block text-[11px] leading-snug text-[#A1A1AA]">
											{option.description}
										</span>
									) : null}
								</span>
							</button>
						)
					})}
					{question.allowOther !== false ? (
						<div
							className={cn(
								"overflow-hidden rounded-[12px] bg-[#14161A] shadow-[inset_2.42px_2.42px_4.263px_rgba(11,15,21,0.7)] transition-colors",
								usingOther
									? "bg-[#1B1F24] ring-1 ring-inset ring-white/15 sm:col-span-2 sm:flex sm:items-center"
									: "hover:bg-[#16181D]",
							)}
						>
							<button
								type="button"
								aria-expanded={usingOther}
								aria-pressed={usingOther}
								onClick={() => {
									setOtherByQuestion((current) => ({
										...current,
										[question.id]: true,
									}))
									setAnswers((current) => ({ ...current, [question.id]: "" }))
								}}
								className={cn(
									"flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/25",
									usingOther && "sm:w-[220px] sm:shrink-0",
								)}
							>
								<span
									className={cn(
										"flex size-4 shrink-0 items-center justify-center rounded-full border",
										usingOther
											? "border-[#FAFAFA] bg-[#FAFAFA] text-[#0D121A]"
											: "border-[#525D6E] bg-[#0D121A]",
									)}
								>
									{usingOther ? <CheckIcon className="size-2.5" /> : null}
								</span>
								<span>
									<span className="block text-xs font-medium text-[#FAFAFA]">
										Something else
									</span>
									<span className="mt-0.5 block text-[11px] leading-snug text-[#A1A1AA]">
										Write a custom answer
									</span>
								</span>
							</button>
							{usingOther ? (
								<div className="flex-1 px-3 pb-3 sm:py-2.5 sm:pl-0">
									<input
										type="text"
										aria-label="Custom answer"
										value={answer}
										onChange={(event) =>
											setAnswers((current) => ({
												...current,
												[question.id]: event.target.value,
											}))
										}
										placeholder="Write your answer…"
										maxLength={500}
										className="h-10 w-full rounded-[10px] bg-[#0D121A] px-3.5 text-xs text-[#FAFAFA] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.55)] outline-none ring-1 ring-inset ring-white/[0.06] placeholder:text-[#737373] focus:ring-white/15"
									/>
								</div>
							) : null}
						</div>
					) : null}
				</div>

				{error ? <p className="mt-3 text-xs text-red-300">{error}</p> : null}
				<div className="mt-4 flex items-center justify-between gap-3">
					<button
						type="button"
						onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))}
						disabled={questionIndex === 0 || submitting}
						className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#0D121A] px-4 text-xs text-[#A1A1AA] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)] transition-opacity hover:opacity-80 disabled:pointer-events-none disabled:opacity-25"
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
						className="inline-flex h-9 min-w-[116px] items-center justify-center gap-1.5 rounded-full bg-[#0D121A] px-5 text-xs font-medium text-[#FAFAFA] shadow-[inset_1.5px_1.5px_4.5px_rgba(0,0,0,0.7)] transition-opacity hover:opacity-80 disabled:pointer-events-none disabled:opacity-35"
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
