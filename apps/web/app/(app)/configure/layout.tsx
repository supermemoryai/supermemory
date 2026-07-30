import { AppExperience } from "@/components/app-experience"

// Shell lives here so section nav doesn't remount the app.
export default function ConfigureLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<>
			<AppExperience />
			{children}
		</>
	)
}
