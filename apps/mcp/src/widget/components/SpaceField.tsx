import { useMemo, useState } from "react"
import { Field, Input, SpaceSelect } from "../design/ui"
import { formatNamespaceLabel } from "../lib/formatNamespace"
import { isValidNamespace, sanitizeNamespace } from "../lib/namespaceTag"

export interface SpaceTarget {
	namespace: string
	isNew: boolean
}

const FIRST_SPACE_NAME = "Personal"

export function initialSpaceTarget(
	activeNamespace: string | null | undefined,
	writableNamespaces: string[],
	canCreateNamespace: boolean,
): SpaceTarget | null {
	if (writableNamespaces.length === 0) {
		return canCreateNamespace
			? { namespace: sanitizeNamespace(FIRST_SPACE_NAME), isNew: true }
			: null
	}
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

const savedAs = (namespace: string, prefix = "Saved as") => (
	<>
		{prefix} <span className="font-mono">{namespace}</span>
	</>
)

export function SpaceField({
	writableNamespaces,
	canCreateNamespace,
	writeBlockedReason,
	value,
	onChange,
}: Props) {
	const [firstSpaceName, setFirstSpaceName] = useState(FIRST_SPACE_NAME)

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

	if (writableNamespaces.length === 0) {
		const namespace = sanitizeNamespace(firstSpaceName)
		return (
			<div className="flex flex-col gap-(--space-3) rounded-(--radius-lg) border border-dashed border-border p-(--space-3)">
				<div className="flex flex-col gap-(--space-1)">
					<p className="text-(length:--text-sm) font-medium text-text-primary">
						Create your first space
					</p>
					<p className="text-(length:--text-xs) leading-relaxed text-text-muted">
						Spaces keep related memories together. You can add more later.
					</p>
				</div>
				<Field
					error={
						isValidNamespace(namespace)
							? null
							: "Use letters, numbers, dashes, or underscores."
					}
					hint={savedAs(namespace)}
					label="Space name"
				>
					<Input
						aria-label="Space name"
						onChange={(e) => {
							const next = sanitizeNamespace(e.target.value)
							setFirstSpaceName(e.target.value)
							onChange(
								isValidNamespace(next)
									? { namespace: next, isNew: true }
									: null,
							)
						}}
						placeholder={FIRST_SPACE_NAME}
						value={firstSpaceName}
					/>
				</Field>
			</div>
		)
	}

	return (
		<Field
			hint={
				value?.isNew
					? savedAs(value.namespace, "New space, saved as")
					: undefined
			}
			label="Space"
		>
			<SpaceSelect
				onCreate={
					canCreateNamespace
						? (namespace) => onChange({ namespace, isNew: true })
						: undefined
				}
				onValueChange={(namespace) =>
					onChange({
						namespace,
						isNew: !writableNamespaces.includes(namespace),
					})
				}
				options={options}
				value={value?.namespace ?? null}
			/>
		</Field>
	)
}
