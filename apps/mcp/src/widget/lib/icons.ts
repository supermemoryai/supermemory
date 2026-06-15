import type { Icon } from "@phosphor-icons/react"
import {
	ArrowsIn as PArrowsIn,
	ArrowsOut as PArrowsOut,
	Brain as PBrain,
	CaretDown as PCaretDown,
	CaretUpDown as PCaretUpDown,
	Check as PCheck,
	CheckCircle as PCheckCircle,
	FileText as PFileText,
	MagnifyingGlass as PMagnifyingGlass,
	Package as PPackage,
	Plus as PPlus,
	SpinnerGap as PSpinnerGap,
	UploadSimple as PUploadSimple,
	WarningCircle as PWarningCircle,
	X as PX,
} from "@phosphor-icons/react"
import { type ComponentType, createElement } from "react"

// Mirror console-v2's icon convention: Phosphor icons rendered at `light`
// weight, exported under familiar names. Keeps the widget visually identical
// to the console.
function light(
	Base: Icon,
): ComponentType<{ className?: string; size?: number | string }> {
	function LightIcon(props: { className?: string; size?: number | string }) {
		return createElement(Base, { ...props, weight: "light" })
	}
	LightIcon.displayName = Base.displayName
	return LightIcon
}

export const ArrowsIn = light(PArrowsIn)
export const ArrowsOut = light(PArrowsOut)
export const Brain = light(PBrain)
export const Check = light(PCheck)
export const CheckCircle = light(PCheckCircle)
export const ChevronDown = light(PCaretDown)
export const ChevronsUpDown = light(PCaretUpDown)
export const FileText = light(PFileText)
export const Loader2 = light(PSpinnerGap)
export const Package = light(PPackage)
export const Plus = light(PPlus)
export const Search = light(PMagnifyingGlass)
export const Upload = light(PUploadSimple)
export const WarningCircle = light(PWarningCircle)
export const X = light(PX)
