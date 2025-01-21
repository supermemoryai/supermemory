import React, { StrictMode } from "react";
import { createRoot, Root } from "react-dom/client";
import SupermemoryContent from "../src/content";
import { css } from "./css";

let globalRoot: Root | null = null;

// Function to cleanup React app
function cleanup() {
  const container = document.getElementById("supermemory-root");
  if (container) {
    globalRoot?.unmount();
    container.remove();
  }
}

async function injectReactApp() {
  // Create a shadow DOM root
  const containerId = "supermemory-root";
  let container = document.getElementById(containerId);

  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.style.position = "absolute";
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.zIndex = "2147483647"; // Maximum z-index value

    // Add the container to document first
    document.body.appendChild(container);

    // Attach shadow DOM
    const shadowRoot = container.attachShadow({ mode: "open" });

    // Create an inner container for React
    const reactContainer = document.createElement("div");
    shadowRoot.appendChild(reactContainer);

    // Inject global CSS into shadow DOM by fetching the CSS file content
    // const cssURL = chrome.runtime.getURL("globals.css");
    // const cssURL = `chrome-extension://${chrome.runtime.id}/globals.css`;

    // i'm, fucking tired lol.
    // const response = await fetch(cssURL);
    // const cssText = await response.text();
    const globalStyle = document.createElement("style");
    globalStyle.textContent = css;
    shadowRoot.appendChild(globalStyle);

    const root = createRoot(reactContainer);
    globalRoot = root;
    root.render(<SupermemoryContent onClose={cleanup} />);
  }
}

// check if there's already our react container
if (document.getElementById("supermemory-root")) {
  cleanup();
} else {
  injectReactApp();
}
