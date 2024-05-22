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

export function getIdsFromSource(sourceIds: string[]) {
  console.log(sourceIds);
  return sourceIds.map((id) => {
    const parts = id.split("-");
    if (parts.length > 1) {
      return parts.slice(0, -1).join("-");
    } else {
      return id;
    }
  });
}

export function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export function svgId(prefix: string, id: string) {
  return `${prefix}-${id}`;
}

export function countLines(textarea: HTMLTextAreaElement): number {
  let _buffer: HTMLTextAreaElement | null = null;

  if (_buffer == null) {
    _buffer = document.createElement("textarea");
    _buffer.style.border = "none";
    _buffer.style.height = "0";
    _buffer.style.overflow = "hidden";
    _buffer.style.padding = "0";
    _buffer.style.position = "absolute";
    _buffer.style.left = "0";
    _buffer.style.top = "0";
    _buffer.style.zIndex = "-1";
    document.body.appendChild(_buffer);
  }

  const cs = window.getComputedStyle(textarea);
  const pl = parseInt(cs.paddingLeft as string);
  const pr = parseInt(cs.paddingRight as string);
  let lh = parseInt(cs.lineHeight as string);

  // [cs.lineHeight] may return 'normal', which means line height = font size.
  if (isNaN(lh)) lh = parseInt(cs.fontSize as string);

  // Copy content width.
  if (_buffer) {
    _buffer.style.width = textarea.clientWidth - pl - pr + "px";

    // Copy text properties.
    _buffer.style.font = cs.font as string;
    _buffer.style.letterSpacing = cs.letterSpacing as string;
    _buffer.style.whiteSpace = cs.whiteSpace as string;
    _buffer.style.wordBreak = cs.wordBreak as string;
    _buffer.style.wordSpacing = cs.wordSpacing as string;
    _buffer.style.wordWrap = cs.wordWrap as string;

    // Copy value.
    _buffer.value = textarea.value;

    const result = Math.floor(_buffer.scrollHeight / lh);
    return result > 0 ? result : 1;
  }

  return 0;
}

export function convertRemToPixels(rem: number) {
  return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

export function isArraysEqual(a: any[], b: any[]) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;

  let isEqual = true;

  a.forEach((i) => {
    if (!isEqual) return;
    isEqual = b.includes(i);
  });

  if (!isEqual) return isEqual;

  b.forEach((i) => {
    if (!isEqual) return;
    isEqual = a.includes(i);
  });

  return isEqual;
}
