"use client"

import { DocumentCardFrame } from "./document-card-frame"
import { MemoryBadge } from "./memory-badge"
import { ConfirmDelete } from "./confirm-delete"
import { ExternalLink, Trash2, Globe, MoreHorizontal } from "lucide-react"
import { useState } from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@repo/ui/components/dropdown-menu"

interface WebsiteCardProps {
	title: string
	url: string
	image?: string
	description?: string
	className?: string
	onClick?: () => void
	onOpenDetails?: () => void
	onDelete?: () => void
	showExternalLink?: boolean
    memoryCount?: number
}

export const WebsiteCard = ({
	title,
	url,
    image: _image,
	description,
	className,
	onClick,
	onOpenDetails,
	onDelete,
	showExternalLink = true,
    memoryCount = 0,
}: WebsiteCardProps) => {
    const [confirmOpen, setConfirmOpen] = useState(false)

	const handleCardClick = () => {
		if (onClick) {
			onClick()
		} else if (onOpenDetails) {
			onOpenDetails()
		} else {
			window.open(url, "_blank", "noopener,noreferrer")
		}
	}

	const handleExternalLinkClick = (e: React.MouseEvent) => {
		e.stopPropagation()
		window.open(url, "_blank", "noopener,noreferrer")
	}

	const hostname = (() => {
		try {
			return new URL(url).hostname
		} catch {
			return url
		}
	})()

    return (
        <>
        <DocumentCardFrame
            onClick={handleCardClick}
            media={null}
            title={title}
            subtitle={
                <>
                    <Globe className="w-3 h-3" aria-hidden="true" />
                    <span>Website</span>
                    <span className="truncate">{hostname}</span>
                </>
            }
            metaRight={
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            onClick={(e) => e.stopPropagation()}
                            className="rounded p-1 text-muted-foreground/80 hover:bg-muted"
                            type="button"
                            aria-label="More actions"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {showExternalLink && (
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleExternalLinkClick(e as unknown as React.MouseEvent)
                                }}
                                className="cursor-pointer text-xs"
                            >
                                <ExternalLink className="w-3 h-3 mr-2" /> Open link
                            </DropdownMenuItem>
                        )}
                        {onDelete && (
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setConfirmOpen(true)
                                }}
                                className="cursor-pointer text-xs text-red-600 focus:text-red-600"
                            >
                                <Trash2 className="w-3 h-3 mr-2" /> Delete
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            }
            body={description}
            footerLeft={<MemoryBadge count={memoryCount} />}
            footerRight={null}
        />
        {onDelete && (
            <ConfirmDelete
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                onConfirm={() => {
                    onDelete?.()
                    setConfirmOpen(false)
                }}
            />
        )}
        </>
    )
}

WebsiteCard.displayName = "WebsiteCard"
