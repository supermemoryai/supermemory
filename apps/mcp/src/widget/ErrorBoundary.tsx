import { Component, type ErrorInfo, type ReactNode } from "react"
import { Button, Stack } from "./design/ui"
import { app } from "./lib/app"

interface Props {
	children: ReactNode
}

interface State {
	error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
	state: State = { error: null }

	static getDerivedStateFromError(error: Error): State {
		return { error }
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		try {
			app.sendLog({
				level: "error",
				logger: "ErrorBoundary",
				data: `${error.name}: ${error.message}\n${info.componentStack ?? ""}`,
			})
		} catch {
			console.error("[ErrorBoundary]", error, info)
		}
	}

	private handleReload = () => this.setState({ error: null })

	render() {
		if (!this.state.error) return this.props.children

		return (
			<Stack
				align="center"
				className="px-6 py-10 max-w-md mx-auto text-center"
				gap="md"
			>
				<div className="text-3xl text-error">⚠️</div>
				<Stack gap="xs">
					<div className="text-sm font-medium text-text-primary">
						Something went wrong
					</div>
					<div className="text-xs text-text-muted break-words font-mono">
						{this.state.error.message}
					</div>
				</Stack>
				<Button onClick={this.handleReload} size="sm" variant="secondary">
					Try again
				</Button>
			</Stack>
		)
	}
}
