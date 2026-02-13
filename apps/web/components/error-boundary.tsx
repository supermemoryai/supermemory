"use client"

import { Component, type ReactNode } from "react"

interface Props {
	children: ReactNode
	fallback?: ReactNode
	onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
	error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
	override state: State = { error: null }

	static getDerivedStateFromError(error: Error): State {
		return { error }
	}

	override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		this.props.onError?.(error, errorInfo)
		console.error("[ErrorBoundary]", error, errorInfo)
	}

	override render() {
		if (this.state.error) {
			return this.props.fallback ?? null
		}
		return this.props.children
	}
}
