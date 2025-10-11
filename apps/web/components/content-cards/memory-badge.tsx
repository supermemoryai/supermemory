"use client"

import { Badge } from "@repo/ui/components/badge"
import React from "react"

export const MemoryBadge = ({ count }: { count: number }) => {
  if (count === 0) return null
  const formatted = new Intl.NumberFormat().format(count)
  const text = `${formatted} ${count === 1 ? "memory" : "memories"}`
  return (
    <Badge
      variant="secondary"
      className="bg-blue-100 text-blue-800 dark:bg-blue-600 dark:text-white"
      title={text}
      aria-label={text}
    >
      {text}
    </Badge>
  )
}

MemoryBadge.displayName = "MemoryBadge"


