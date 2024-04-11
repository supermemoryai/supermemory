import { cn } from "@/lib/utils";
import React from "react";

function WordMark({ className }: { className?: string }) {
  return (
    <span className={cn(`text-xl font-bold tracking-tight ${className}`)}>
      smort.
    </span>
  );
}

export default WordMark;
