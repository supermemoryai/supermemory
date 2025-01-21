import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// getBaseURL function that checks if we are in dev or prod and returns the correct baseURL
export async function getBaseURL() {
  if (typeof chrome === "undefined") {
    console.error("chrome is undefined: only run in background script");
    throw new Error("chrome is undefined: only run in background script");
  }
  const extensionInfo = await chrome.management.getSelf();
  console.info(`Running in ${extensionInfo.installType} mode`);
  // If we're in development mode, the id will contain 'development'
  return extensionInfo.installType.includes("development")
    ? "http://localhost:3000"
    : "https://supermemory.ai";
}
