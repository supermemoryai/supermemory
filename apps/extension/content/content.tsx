import ReactDOM from "react-dom/client";
import ContentApp from "./ContentApp";
import("./base.css");

setTimeout(initial, 1000);

const TAILWIND_URL =
  "https://cdn.jsdelivr.net/npm/tailwindcss@^2.0/dist/tailwind.min.css";

const appendTailwindStyleData = (shadowRoot: ShadowRoot) => {
  // Load and inject the local Tailwind CSS file into the shadow DOM
  const styleSheet = document.createElement("style");
  // Change this path to your actual Tailwind CSS file's location
  fetch(TAILWIND_URL)
    .then((response) => response.text())
    .then((css) => {
      styleSheet.textContent = css;
      shadowRoot.appendChild(styleSheet);
    });
};

const appendTailwindStyleLink = (shadowRoot: ShadowRoot) => {
  // Import Tailwind CSS and inject it into the shadow DOM
  const styleSheet = document.createElement("link");
  styleSheet.rel = "stylesheet";
  styleSheet.href = TAILWIND_URL;
  shadowRoot.appendChild(styleSheet);
};

function initial() {
  // Create a new div element to host the shadow root.
  // Styles for this div is in `content/content.css`
  const hostDiv = document.createElement("div");
  hostDiv.id = "supermemory-extension-host";
  document.body.appendChild(hostDiv);

  // Attach the shadow DOM to the hostDiv and set the mode to
  // 'open' for accessibility from JavaScript.
  // Ref https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow
  const shadowRoot = hostDiv.attachShadow({ mode: "open" });

  // Create a new div element that will be the root container for the React app
  const rootDiv = document.createElement("div");
  rootDiv.id = "supermemory-extension-root";
  shadowRoot.appendChild(rootDiv);

  appendTailwindStyleLink(shadowRoot);

  const root = ReactDOM.createRoot(rootDiv);

  const jwt = chrome.storage.local.get("jwt").then((data) => {
    return data.jwt;
  }) as Promise<string | undefined>;

  jwt.then((token) => root.render(<ContentApp token={token} />));
}

window.addEventListener("message", (event) => {
  if (event.source !== window) {
    return;
  }
  const jwt = event.data.token;

  if (jwt) {
    if (
      !(
        window.location.hostname === "localhost" ||
        window.location.hostname === "supermemory.ai" ||
        window.location.hostname === "beta.supermemory.ai"
      )
    ) {
      console.log(
        "JWT is only allowed to be used on localhost or anycontext.dhr.wtf",
      );
      return;
    }

    chrome.storage.local.set({ jwt }, () => {});
  }
});
