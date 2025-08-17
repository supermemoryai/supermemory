"use client" // Error boundaries must be Client Components

import { Button } from "@ui/components/button"
import { Title1Bold } from "@ui/text/title/title-1-bold"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function NotFound({
	error,
}: {
	error: Error & { digest?: string }
}) {
	const router = useRouter()
	useEffect(() => {
		// Log the error to an error reporting service
		console.error(error)
	}, [error])

	return (
		<html lang="en">
			<body className="flex flex-col items-center justify-center h-screen">
				<Title1Bold>Page not found</Title1Bold>
				<Button onClick={() => router.back()}>Go back</Button>
			</body>
		</html>
	)
}
