"use client"

import { ConfirmDelete } from "./confirm-delete"
import { ExternalLink, Trash2, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@repo/ui/components/dropdown-menu"
import { DocumentCardFrame } from "./document-card-frame"
import { MemoryBadge } from "./memory-badge"
import { useState } from "react"

interface GoogleDocsCardProps {
	title: string
	url: string | null | undefined
	description?: string | null
	className?: string
	onClick?: () => void
	onDelete?: () => void
	showExternalLink?: boolean
	activeMemories?: Array<{ id: string; isForgotten?: boolean }>
	lastModified?: string | Date
}

export const GoogleDocsCard = ({
	title,
	url,
	description,
	className,
	onClick,
	onDelete,
	showExternalLink = true,
	activeMemories,
	lastModified,
}: GoogleDocsCardProps) => {
	const [confirmOpen, setConfirmOpen] = useState(false)
	const handleCardClick = () => {
		if (onClick) {
			onClick()
		} else if (url) {
			window.open(url, "_blank", "noopener,noreferrer")
		}
	}

	const handleExternalLinkClick = (e: React.MouseEvent) => {
		e.stopPropagation()
		if (url) {
			window.open(url, "_blank", "noopener,noreferrer")
		}
	}

    return (
        <>
        <DocumentCardFrame
            onClick={handleCardClick}
            media={null}
            title={
                <div className="flex items-center gap-2">
                    <svg
                        className="w-4 h-4"
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 87.3 78"
                        aria-label="Google Docs"
                    >
                        <title>Google Docs</title>
                        <path
                            fill="#0066da"
                            d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z"
                        />
                        <path
                            fill="#00ac47"
                            d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44A9.06 9.06 0 0 0 0 53h27.5z"
                        />
                        <path
                            fill="#ea4335"
                            d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.1 57.5c.8-1.4 1.2-2.95 1.2-4.5H59.798l5.852 11.5z"
                        />
                        <path
                            fill="#00832d"
                            d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z"
                        />
                        <path
                            fill="#2684fc"
                            d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
                        />
                        <path
                            fill="#ffba00"
                            d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.45c0-1.55-.4-3.1-1.2-4.5z"
                        />
                    </svg>
                    <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Google Docs</span>
                    </div>
                </div>
            }
            metaRight={
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button onClick={(e) => e.stopPropagation()} className="rounded p-1 text-muted-foreground/80 hover:bg-muted" type="button" aria-label="More actions">
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {showExternalLink && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleExternalLinkClick(e as unknown as React.MouseEvent) }} className="cursor-pointer text-xs">
                                <ExternalLink className="w-3 h-3 mr-2" /> Open in Google Docs
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
            footerLeft={<MemoryBadge count={activeMemories?.length ?? 0} />}
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

GoogleDocsCard.displayName = "GoogleDocsCard"
