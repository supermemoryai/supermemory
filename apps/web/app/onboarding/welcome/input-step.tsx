import { motion } from "motion/react"
import { LabeledInput } from "@ui/input/labeled-input"
import { Button } from "@ui/components/button"

interface InputStepProps {
	name: string
	setName: (name: string) => void
	handleSubmit: () => void
	isSubmitting: boolean
}

export function InputStep({
	name,
	setName,
	handleSubmit,
	isSubmitting,
}: InputStepProps) {
	return (
		<motion.div
			key="input"
			className="text-center min-w-[250px]"
			initial={{
				opacity: 0,
				y: 10,
			}}
			animate={{
				opacity: 1,
				y: 0,
			}}
			exit={{
				opacity: 0,
			}}
			transition={{
				duration: 0.8,
				ease: "easeOut",
				delay: 1,
			}}
			layout
		>
			<h2 className="text-white text-3xl font-medium mb-2">
				What should I call you?
			</h2>
			<div className="flex items-center space-x-3 w-full relative">
				<LabeledInput
					inputType="text"
					inputPlaceholder="your name"
					className="w-full flex-1"
					inputProps={{
						value: name,
						onKeyDown: (e) => {
							if (e.key === "Enter") {
								handleSubmit()
							}
						},
					}}
					onChange={(e) => setName((e.target as HTMLInputElement).value)}
					style={{
						background:
							"linear-gradient(0deg, rgba(91, 126, 245, 0.04) 0%, rgba(91, 126, 245, 0.04) 100%)",
					}}
				/>
				<Button
					className={`rounded-xl p-2 !bg-black absolute right-4 border-[0.5px] border-gray-800 hover:cursor-pointer hover:scale-[0.95] active:scale-[0.95] transition-transform ${
						isSubmitting ? "scale-[0.90]" : ""
					}`}
					size="icon"
					onClick={handleSubmit}
				>
					<svg
						width="12"
						height="10"
						viewBox="0 0 12 10"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<title>Next</title>
						<path
							d="M8.05099 9.60156L6.93234 8.49987L9.00014 6.44902L9.62726 6.04224L9.54251 5.788L8.79675 5.90665H0.0170898V4.31343H8.79675L9.54251 4.43207L9.62726 4.17783L9.00014 3.77105L6.93234 1.72021L8.05099 0.601562L11.9832 4.53377V5.68631L8.05099 9.60156Z"
							fill="#FAFAFA"
						/>
					</svg>
				</Button>
			</div>
		</motion.div>
	)
}
