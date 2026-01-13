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
			className="text-center min-w-[250px] flex flex-col"
			style={{ gap: "24px" }}
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
				y: -10,
				transition: {
					duration: 0.5,
					ease: "easeOut",
					bounce: 0,
				},
			}}
			transition={{
				duration: 0.8,
				ease: "easeOut",
				delay: 1,
			}}
			layout
		>
			<h2 className="text-white text-[32px] font-medium leading-[110%]">
				What should I call you?
			</h2>
			<div className="flex items-center w-full relative">
				<LabeledInput
					inputType="text"
					inputPlaceholder="your name"
					className="w-full flex-1"
					inputProps={{
						defaultValue: name,
						onKeyDown: (e) => {
							if (e.key === "Enter") {
								handleSubmit()
							}
						},
						className: "!text-white placeholder:!text-[#525966] !h-[40px] pl-4",
					}}
					onChange={(e) => setName((e.target as HTMLInputElement).value)}
					style={{
						background:
							"linear-gradient(0deg, rgba(91, 126, 245, 0.04) 0%, rgba(91, 126, 245, 0.04) 100%)",
					}}
				/>
				<Button
					className={`rounded-[8px] w-8 h-8 p-2 absolute right-1 border-[0.5px] border-[#161F2C] hover:cursor-pointer hover:scale-[0.95] active:scale-[0.95] transition-transform ${
						isSubmitting ? "scale-[0.90]" : ""
					}`}
					size="icon"
					onClick={handleSubmit}
					style={{
						background: "linear-gradient(180deg, #0D121A -26.14%, #000 100%)",
					}}
				>
					<svg
						width="12"
						height="9"
						viewBox="0 0 12 9"
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
