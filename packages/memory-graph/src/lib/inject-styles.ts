/**
 * Runtime CSS injection for universal bundler support
 * The CSS content is injected by the build plugin
 */

// This will be replaced by the build plugin with the actual CSS content
declare const __MEMORY_GRAPH_CSS__: string;

// Track injection state
let injected = false;

/**
 * Inject memory-graph styles into the document head.
 * Safe to call multiple times - will only inject once.
 */
export function injectStyles(): void {
  // Only run in browser
  if (typeof document === "undefined") return;

  // Only inject once
  if (injected) return;

  // Check if already injected (e.g., by another instance)
  if (document.querySelector('style[data-memory-graph]')) {
    injected = true;
    return;
  }

  injected = true;

  // Create and inject style element
  const style = document.createElement("style");
  style.setAttribute("data-memory-graph", "");
  style.textContent = __MEMORY_GRAPH_CSS__;
  document.head.appendChild(style);
}
