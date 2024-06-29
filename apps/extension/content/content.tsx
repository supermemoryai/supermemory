import ReactDOM from "react-dom/client";
import ContentApp from "./ContentApp";

setTimeout(initial, 1000);

const appendTailwindStyleData = (shadowRoot: ShadowRoot) => {
  const styleSheet = document.createElement("style");

  const resourceUrl = chrome.runtime.getURL("../public/output.css");
  const tobeRendered = fetch(resourceUrl)
    .then((res) => res.text())
    .then((data) => {
      console.log(data);
      styleSheet.textContent = data;
      shadowRoot.appendChild(styleSheet);
    });
};

function initial() {
  const hostDiv = document.createElement("div");
  hostDiv.id = "supermemory-extension-host";
  document.body.appendChild(hostDiv);

  const shadowRoot = hostDiv.attachShadow({ mode: "open" });

  const rootDiv = document.createElement("div");
  rootDiv.id = "supermemor-extension-root";
  shadowRoot.appendChild(rootDiv);

  appendTailwindStyleData(shadowRoot);

  const root = ReactDOM.createRoot(rootDiv);
  root.render(<ContentApp />);
}
