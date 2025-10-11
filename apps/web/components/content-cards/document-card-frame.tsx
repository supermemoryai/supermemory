"use client"

import { Card } from "@repo/ui/components/card"
import { cn } from "@lib/utils"
import React from "react"

type DocumentCardFrameProps = {
  media?: React.ReactNode
  title: React.ReactNode
  subtitle?: React.ReactNode
  metaRight?: React.ReactNode
  body?: React.ReactNode
  footerLeft?: React.ReactNode
  footerRight?: React.ReactNode
  onClick?: () => void
  className?: string
}

export const DocumentCardFrame = ({
  media,
  title,
  subtitle,
  metaRight,
  body,
  footerLeft,
  footerRight,
  onClick,
  className,
}: DocumentCardFrameProps) => {
  return (
    <Card
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : -1}
      onKeyDown={(e) => {
        if (!onClick) return
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
      className={cn(
        "group relative w-full overflow-hidden rounded-xl border bg-card shadow-xs transition-all hover:shadow-md focus-visible:outline-none",
        onClick ? "cursor-pointer" : "",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "dark:!bg-neutral-800 dark:!border-0",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-border/40 group-hover:ring-border dark:hidden" />

      {media ? (
        <div className="relative w-full overflow-hidden bg-muted/40">
          <div className="aspect-[16/9] w-full overflow-hidden bg-muted/10">
            {media}
          </div>
        </div>
      ) : null}

      <div className="px-2 gap-1 grid h-24 grid-rows-[auto,auto,1fr,auto]">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[16px] font-medium leading-tight line-clamp-1">{title}</h3>
          {metaRight}
        </div>

        {subtitle ? (
          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            {subtitle}
          </div>
        ) : (
          <div />
        )}

        {body ? (
          <div className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2">
            {body}
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">{footerLeft}</div>
          <div className="flex items-center gap-1">{footerRight}</div>
        </div>
      </div>
    </Card>
  )
}

DocumentCardFrame.displayName = "DocumentCardFrame"


