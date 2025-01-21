import React from "react";
import { cn } from "~/lib/utils";

const HistoriesSkeleton: React.FC = () => {
  return (
    <div className="mt-12 max-w-lg hidden md:block">
      <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
        <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-2 p-2 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse"
          >
            <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="flex-1 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoriesSkeleton; 