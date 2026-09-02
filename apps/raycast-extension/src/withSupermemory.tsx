import {
	Action,
	ActionPanel,
	getPreferenceValues,
	Icon,
	List,
	openExtensionPreferences,
} from "@raycast/api"
import type { ComponentType } from "react"

export function withSupermemory<P extends object>(Component: ComponentType<P>) {
	return function SupermemoryWrappedComponent(props: P) {
		// Let each command enforce its own endpoint-specific permissions and rate limit.
		const { apiKey } = getPreferenceValues<Preferences>()

		if (!apiKey.trim()) {
			return (
				<List>
					<List.EmptyView
						icon={Icon.ExclamationMark}
						title="API Key Required"
						description="Please configure your Supermemory API key to search memories"
						actions={
							<ActionPanel>
								<Action
									title="Open Extension Preferences"
									onAction={openExtensionPreferences}
									icon={Icon.Gear}
								/>
							</ActionPanel>
						}
					/>
				</List>
			)
		}

		return <Component {...props} />
	}
}
