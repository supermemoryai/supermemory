"use client"

import { DocumentCardFrame } from "./document-card-frame"
import { MemoryBadge } from "./memory-badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@repo/ui/components/dropdown-menu"
import { ConfirmDelete } from "./confirm-delete"
import { ExternalLink, FileText, MoreHorizontal, Trash2 } from "lucide-react"
import { useState } from "react"

export function FileCard({
  title,
  url,
  memoryCount,
  onOpenDetails,
  onDelete,
}: {
  title: string
  url?: string | null
  memoryCount: number
  onOpenDetails: () => void
  onDelete?: () => void
}) {
  const openUrl = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (url) window.open(url, "_blank", "noopener,noreferrer")
  }
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
        <>
        <DocumentCardFrame
      onClick={onOpenDetails}
      media={null}
      title={title}
      subtitle={
        <>
          <FileText className="w-3 h-3" aria-hidden="true" />
          <span>File</span>
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
            {url && (
              <DropdownMenuItem onClick={openUrl} className="cursor-pointer text-xs">
                <ExternalLink className="w-3 h-3 mr-2" /> Open file
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
      body={undefined}
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

FileCard.displayName = "FileCard"


