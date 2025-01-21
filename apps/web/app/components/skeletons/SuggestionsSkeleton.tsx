import React from "react";
import { cn } from "~/lib/utils";

const SuggestionsSkeleton: React.FC = () => {
  return (
    <div className={cn("flex flex-wrap gap-2 mt-4")}>
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="w-1/3 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
        ></div>
      ))}
    </div>
  );
};

export default SuggestionsSkeleton; 