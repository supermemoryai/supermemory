"use client";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// removes http(s?):// and / from the url
export function cleanUrl(url: string) {
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  return url.startsWith("https://")
    ? url.slice(8)
    : url.startsWith("http://")
      ? url.slice(7)
      : url;
}
