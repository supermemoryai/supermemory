import { useMemo } from "react"
import { Field, SpaceSelect } from "../design/ui"
import { formatNamespaceLabel } from "../lib/formatNamespace"

export interface SpaceTarget {
	namespace: string
	isNew: boolean
	input?: string
}

export function initialSpaceTarget(
	activeNamespace: string | null | undefined,
	writableNamespaces: string[],
): SpaceTarget | null {
	if (writableNamespaces.length === 0) return null
	return {
		namespace:
			activeNamespace && writableNamespaces.includes(activeNamespace)
				? activeNamespace
				: writableNamespaces[0],
		isNew: false,
	}
}

interface Props {
	writableNamespaces: string[]
	canCreateNamespace: boolean
	writeBlockedReason?: string
	value: SpaceTarget | null
	onChange: (target: SpaceTarget | null) => void
}

// Shows the space hint: a first-space prompt, or the cleaned tag when sanitizing changed the input.
function spaceHint(value: SpaceTarget | null, hasSpaces: boolean) {
	if (!value) {
		return hasSpaces ? undefined : "Type a name to create your first space"
	}
	if (!value.isNew || value.input === undefined) return undefined
	if (value.input.trim() === value.namespace) return undefined
	return (
		<>
			Saved as <span className="font-mono">{value.namespace}</span>
		</>
	)
}

export function SpaceField({
	writableNamespaces,
	canCreateNamespace,
	writeBlockedReason,
	value,
	onChange,
}: Props) {
	const options = useMemo(
		() =>
			[...writableNamespaces, ...(value?.isNew ? [value.namespace] : [])].map(
				(namespace) => ({
					value: namespace,
					label: formatNamespaceLabel(namespace),
					description: namespace,
				}),
			),
		[writableNamespaces, value],
	)

	if (writableNamespaces.length === 0 && !canCreateNamespace) {
		return (
			<p className="text-(length:--text-xs) leading-relaxed text-text-muted">
				{writeBlockedReason}
			</p>
		)
	}

	return (
		<Field hint={spaceHint(value, writableNamespaces.length > 0)} label="Space">
			<SpaceSelect
				onCreate={
					canCreateNamespace
						? (namespace, input) => onChange({ namespace, isNew: true, input })
						: undefined
				}
				onValueChange={(namespace) =>
					onChange(
						namespace === value?.namespace
							? value
							: { namespace, isNew: !writableNamespaces.includes(namespace) },
					)
				}
				options={options}
				placeholder={canCreateNamespace ? "Search or create tags…" : undefined}
				value={value?.namespace ?? null}
			/>
		</Field>
	)
}
